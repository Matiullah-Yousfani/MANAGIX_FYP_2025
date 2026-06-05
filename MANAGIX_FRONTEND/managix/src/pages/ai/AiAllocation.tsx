import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Users,
  ListTodo,
  Brain,
  Loader2,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import api from '../../api/axiosInstance';
import { projectService } from '../../api/projectService';
import { teamService } from '../../api/teamService';
import { taskService } from '../../api/taskService';
import {
  aiService,
  type TeamSuggestion,
  type TaskAssignment,
  type TeamOption,
} from '../../api/aiService';

type TabKey = 'team' | 'tasks';

interface Toast {
  message: string;
  type: 'success' | 'error';
}

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'team', label: 'Suggest Team', icon: <Users size={18} /> },
  { key: 'tasks', label: 'Task Allocation', icon: <ListTodo size={18} /> },
];

const isQaRole = (role?: string) => /qa|quality/i.test(role || '');

const splitTeamMembers = (team: TeamSuggestion[]) => ({
  qa: team.find((m) => isQaRole(m.role)),
  devs: team.filter((m) => !isQaRole(m.role)),
});

function TeamMemberLine({ roleLabel, name }: { roleLabel: string; name: string }) {
  return (
    <div className="flex items-center gap-2 py-2.5 px-3 rounded-xl bg-gray-50/80 border border-gray-100">
      <span className="text-[10px] font-bold text-gray-400 uppercase shrink-0 w-20">
        {roleLabel}
      </span>
      <span className="text-sm font-semibold text-gray-900 truncate flex-1">
        {name || '—'}
      </span>
    </div>
  );
}

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.07 } },
};

// ---------- Toast Component ----------
function ToastNotification({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 60 }}
      className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-sm font-semibold ${
        toast.type === 'success'
          ? 'bg-green-600 text-white'
          : 'bg-red-600 text-white'
      }`}
    >
      {toast.type === 'success' ? <Check size={18} /> : <X size={18} />}
      {toast.message}
    </motion.div>
  );
}

// ---------- Confidence Badge ----------
function ConfidenceBadge({ confidence }: { confidence: number }) {
  if (!confidence || confidence <= 0) {
    return (
      <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500">
        N/A
      </span>
    );
  }
  const pct = confidence <= 1 ? Math.round(confidence * 100) : Math.round(confidence);
  const color =
    pct >= 80
      ? 'bg-green-100 text-green-700'
      : pct >= 60
        ? 'bg-yellow-100 text-yellow-700'
        : 'bg-red-100 text-red-700';

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold ${color}`}>
      {pct}% confidence
    </span>
  );
}

// ---------- Loading Overlay ----------
function LoadingOverlay() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center py-20 gap-4"
    >
      <div className="relative">
        <Loader2 size={40} className="animate-spin text-gray-400" />
        <Sparkles
          size={16}
          className="absolute -top-1 -right-1 text-yellow-500 animate-pulse"
        />
      </div>
      <p className="text-gray-500 font-semibold text-sm">AI is analyzing...</p>
      <p className="text-gray-400 text-xs">This may take a moment</p>
    </motion.div>
  );
}

export type AiAllocationProps = {
  embedded?: boolean;
  onTeamApplied?: () => void | Promise<void>;
  /** team-only = Team Setup; tasks-only = Milestones page */
  variant?: 'full' | 'team-only' | 'tasks-only';
};

type TeamOptionCard = TeamOption & {
  id: string;
  teamName: string;
  expanded: boolean;
  isRecommended?: boolean;
};

// ======================================================================
// Main Component (full page or embedded in Team Setup)
// ======================================================================
const AiAllocation = ({ embedded = false, onTeamApplied, variant = 'full' }: AiAllocationProps) => {
  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [assignedProjectIds, setAssignedProjectIds] = useState<Set<string>>(new Set());
  const [taskAllocationProjects, setTaskAllocationProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabKey>(variant === 'tasks-only' ? 'tasks' : 'team');
  const [availabilityMessage, setAvailabilityMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [teamCards, setTeamCards] = useState<TeamOptionCard[]>([]);
  const [suggestedDevCount, setSuggestedDevCount] = useState<number | null>(null);
  const [applyingCardId, setApplyingCardId] = useState<string | null>(null);
  const [taskAssignments, setTaskAssignments] = useState<TaskAssignment[]>([]);
  const [applying, setApplying] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  }, []);

  const loadUnassignedProjects = useCallback(async (clearSelectionIfAssigned?: boolean) => {
    try {
      const managerId = localStorage.getItem('userId');
      let data: any[];
      if (managerId) {
        data = await projectService.getByManager(managerId);
      } else {
        data = await projectService.getAll();
      }
      const all = Array.isArray(data) ? data : [];
      const teams = await teamService.getAllTeams(managerId || undefined);
      const assignedIds = new Set(
        (Array.isArray(teams) ? teams : [])
          .map((t: { projectId?: string; ProjectId?: string }) =>
            String(t.projectId ?? t.ProjectId ?? '')
          )
          .filter((id) => id && id !== 'undefined')
      );
      setAllProjects(all);
      setAssignedProjectIds(assignedIds);

      const managerIdForTasks = localStorage.getItem('userId') || undefined;
      const taskEligible = await aiService.getTaskAllocationProjects(managerIdForTasks);
      setTaskAllocationProjects(
        taskEligible.map((p) => ({
          ProjectId: p.projectId,
          projectId: p.projectId,
          Title: p.title,
          title: p.title,
          unassignedTaskCount: p.unassignedTaskCount,
        }))
      );

      if (clearSelectionIfAssigned) {
        setSelectedProject((prev) => {
          if (!prev) return null;
          const pid = String(prev.ProjectId ?? prev.projectId ?? '');
          return assignedIds.has(pid) ? null : prev;
        });
        setTeamCards([]);
        setSuggestedDevCount(null);
      }
    } catch {
      setAllProjects([]);
      setAssignedProjectIds(new Set());
      setTaskAllocationProjects([]);
      showToast('Failed to load projects', 'error');
    } finally {
      setProjectsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadUnassignedProjects();
  }, [loadUnassignedProjects]);

  const teamFormationProjects = useMemo(
    () =>
      allProjects.filter((p: { ProjectId?: string; projectId?: string }) => {
        const pid = String(p.ProjectId ?? p.projectId ?? '');
        return pid && !assignedProjectIds.has(pid);
      }),
    [allProjects, assignedProjectIds]
  );

  const taskAllocationProjectsNormalized = useMemo(
    () => taskAllocationProjects,
    [taskAllocationProjects]
  );

  const projectListForSelector =
    activeTab === 'team'
      ? teamFormationProjects
      : activeTab === 'tasks'
        ? taskAllocationProjectsNormalized
        : allProjects;

  useEffect(() => {
    if (activeTab !== 'tasks' || !selectedProject) return;
    const pid = String(selectedProject.ProjectId ?? selectedProject.projectId ?? '');
    const stillEligible = taskAllocationProjectsNormalized.some(
      (p: { ProjectId?: string; projectId?: string }) =>
        String(p.ProjectId ?? p.projectId) === pid
    );
    if (!stillEligible) {
      setSelectedProject(null);
      setTaskAssignments([]);
    }
  }, [activeTab, taskAllocationProjectsNormalized, selectedProject]);

  const apiErrDetail = (err: unknown, fallback: string) => {
    const ax = err as {
      response?: { data?: { detail?: string; message?: string } };
      message?: string;
    };
    const d = ax?.response?.data?.detail || ax?.response?.data?.message || ax?.message;
    return d && String(d).trim() ? String(d) : fallback;
  };

  // Clear results when switching projects or tabs
  useEffect(() => {
    setTeamCards([]);
    setTaskAssignments([]);
  }, [selectedProject, activeTab]);

  // ---------- Handlers ----------
  const handleSuggestTeam = async () => {
    if (!selectedProject) return;
    setLoading(true);
    try {
      const pid = selectedProject.ProjectId || selectedProject.projectId;
      const res = await aiService.suggestTeamOptions(pid);
      const opts = res.options || [];
      if (opts.length === 0) {
        showToast('No team options returned. Check available employees and QA in the system.', 'error');
        return;
      }
      setSuggestedDevCount(res.suggestedDeveloperCount ?? null);
      setAvailabilityMessage(res.availabilityMessage ?? res.AvailabilityMessage ?? null);
      setTeamCards(
        opts.map((opt, i) => ({
          ...opt,
          id: `team-opt-${i}`,
          teamName: opt.suggestedTeamName || opt.label || `Team ${i + 1}`,
          expanded: Boolean(opt.isRecommended),
          isRecommended: opt.isRecommended,
        }))
      );
    } catch (err) {
      showToast(apiErrDetail(err, 'Could not generate team options.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestTasks = async () => {
    if (!selectedProject) return;
    setLoading(true);
    try {
      const pid = selectedProject.ProjectId || selectedProject.projectId;
      const res = await aiService.suggestTaskAllocation(pid);
      const rows = res.taskAssignments || [];
      if (rows.length === 0) {
        showToast(
          'No unassigned tasks to suggest. All open tasks may already have owners, or add tasks with no assignee.',
          'error'
        );
        setTaskAssignments([]);
        return;
      }
      setTaskAssignments(rows);
    } catch (err) {
      showToast(
        apiErrDetail(
          err,
          'AI service unavailable. Start allocation on port 8002 (scripts/start-ai-services.ps1) and restart the API.'
        ),
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const validateTeamComposition = async (teamId: string) => {
    const members = await teamService.getTeamMembers(teamId);
    const usersRes = await api.get('/users');
    const users = Array.isArray(usersRes.data) ? usersRes.data : [];
    const QA_ROLE_ID = '8DA96376-659A-40B2-A3D4-34165984E90F'.toUpperCase(); // Quality Assurance
    const EMP_ROLE_ID = '90E6C731-B51A-44D7-ADA1-815102900862'.toUpperCase();
    const isQaRole = (roleId: string, roleName?: string) =>
      roleId === QA_ROLE_ID || /quality|qa/i.test(roleName || '');
    let hasQa = false;
    let hasEmp = false;
    for (const member of members) {
      const mid = String(member.userId ?? member.UserId ?? member.id ?? '');
      const u = users.find(
        (x: any) => String(x.userId ?? x.UserId ?? x.id) === mid
      );
      const roleId = String(u?.roleId ?? u?.RoleId ?? '').toUpperCase();
      const roleName = String(u?.roleName ?? u?.RoleName ?? u?.role ?? '');
      if (isQaRole(roleId, roleName)) hasQa = true;
      if (roleId === EMP_ROLE_ID) hasEmp = true;
    }
    return hasQa && hasEmp;
  };

  const teamHasQaAndEmployee = (members: TeamSuggestion[]) => {
    const hasQa = members.some((m) => isQaRole(m.role));
    const hasDev = members.some((m) => !isQaRole(m.role) && !/manager|admin/i.test(m.role || ''));
    return hasQa && hasDev && members.length >= 2;
  };

  const handleCreateTeamFromCard = async (card: TeamOptionCard) => {
    if (!selectedProject || card.team.length === 0) return;
    const userId = localStorage.getItem('userId') || '';
    if (!userId) {
      showToast('You must be logged in as a manager.', 'error');
      return;
    }
    const teamName = card.teamName.trim();
    if (!teamName) {
      showToast('Team name is required.', 'error');
      return;
    }
    if (!teamHasQaAndEmployee(card.team)) {
      showToast('Each team needs at least one QA and one Employee.', 'error');
      return;
    }
    setApplyingCardId(card.id);
    try {
      const teamRes = await teamService.createTeam({ name: teamName, createdBy: userId });
      const teamId = teamRes.TeamId || teamRes.teamId || teamRes.id;

      for (const member of card.team) {
        await teamService.addEmployeeToTeam(teamId, member.userId);
      }
      try {
        await teamService.addEmployeeToTeam(teamId, userId);
      } catch {
        /* manager may already be on team */
      }

      const ok = await validateTeamComposition(teamId);
      if (!ok) {
        showToast('Team must include at least one Employee and one QA.', 'error');
        await teamService.deleteTeam(teamId);
        return;
      }

      const pid = selectedProject.ProjectId || selectedProject.projectId;
      await teamService.assignTeamToProject(teamId, pid);

      setTeamCards([]);
      setSuggestedDevCount(null);
      setDropdownOpen(false);
      showToast(`Team "${teamName}" created and assigned!`, 'success');
      await loadUnassignedProjects(true);
      if (onTeamApplied) await onTeamApplied();
    } catch (err) {
      showToast(apiErrDetail(err, 'Failed to create team.'), 'error');
    } finally {
      setApplyingCardId(null);
    }
  };

  const updateCardTeamName = (id: string, name: string) => {
    setTeamCards((prev) => prev.map((c) => (c.id === id ? { ...c, teamName: name } : c)));
  };

  const toggleCardExpanded = (id: string) => {
    setTeamCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, expanded: !c.expanded } : c))
    );
  };

  const handleApplyTaskAssignments = async () => {
    if (taskAssignments.length === 0 || !selectedProject) return;
    setApplying(true);
    try {
      const pid = selectedProject.ProjectId || selectedProject.projectId;
      const result = await aiService.applyTaskAssignments(pid, taskAssignments);
      const applied = result.applied ?? result.Applied ?? 0;
      const failed = result.failed ?? result.Failed ?? 0;
      if (failed > 0) {
        const errs = result.errors ?? result.Errors ?? [];
        showToast(`Applied ${applied}; ${failed} failed. ${errs[0] ?? ''}`, 'error');
      } else {
        setTaskAssignments([]);
        showToast(`Applied ${applied} task assignment(s).`, 'success');
        await loadUnassignedProjects(true);
      }
    } catch (err: unknown) {
      showToast(apiErrDetail(err, 'Failed to apply task assignments.'), 'error');
    } finally {
      setApplying(false);
    }
  };

  // ---------- Render Helpers ----------
  const renderProjectSelector = () => (
    <div
      className={`bg-white rounded-2xl shadow-sm p-6 ${embedded ? 'mb-0 border border-gray-100' : 'mb-6'}`}
    >
      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
        Select Project
      </label>

      {projectsLoading ? (
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <Loader2 size={16} className="animate-spin" /> Loading projects...
        </div>
      ) : (
        <div className="relative">
          <button
            onClick={() => setDropdownOpen((v) => !v)}
            className="w-full flex items-center justify-between bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl px-5 py-4 text-left transition-colors"
          >
            <span className={`font-semibold ${selectedProject ? 'text-gray-900' : 'text-gray-400'}`}>
              {selectedProject
                ? selectedProject.Title || selectedProject.title
                : 'Choose a project...'}
            </span>
            <ChevronDown
              size={18}
              className={`text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
            />
          </button>

          <AnimatePresence>
            {dropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="absolute z-20 mt-2 w-full bg-white rounded-xl shadow-xl border border-gray-100 max-h-64 overflow-y-auto"
              >
                {projectListForSelector.length === 0 ? (
                  <div className="p-4 text-sm text-gray-500 text-center">
                    {activeTab === 'team'
                      ? 'All your projects already have a team assigned.'
                      : activeTab === 'tasks'
                        ? 'No projects with unassigned tasks. Assign a team and create tasks first.'
                        : 'No projects found'}
                  </div>
                ) : (
                  projectListForSelector.map((p: any) => {
                    const pid = p.ProjectId || p.projectId;
                    const selId =
                      selectedProject?.ProjectId || selectedProject?.projectId;
                    return (
                      <button
                        key={pid}
                        onClick={() => {
                          setSelectedProject(p);
                          setDropdownOpen(false);
                        }}
                        className={`w-full text-left px-5 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 ${
                          selId === pid ? 'bg-gray-50 font-bold' : ''
                        }`}
                      >
                        <p className="font-semibold text-gray-900 text-sm">
                          {p.Title || p.title}
                        </p>
                        {activeTab === 'tasks' && (p.unassignedTaskCount ?? 0) > 0 && (
                          <p className="text-xs text-amber-700 mt-0.5 font-medium">
                            {p.unassignedTaskCount} unassigned task
                            {p.unassignedTaskCount === 1 ? '' : 's'}
                          </p>
                        )}
                        {activeTab !== 'tasks' && (p.Description || p.description) && (
                          <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                            {p.Description || p.description}
                          </p>
                        )}
                      </button>
                    );
                  })
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {selectedProject && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-4 bg-gray-50 rounded-xl p-4"
        >
          <p className="text-sm font-bold text-gray-800">
            {selectedProject.Title || selectedProject.title}
          </p>
          {(selectedProject.Description || selectedProject.description) && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
              {selectedProject.Description || selectedProject.description}
            </p>
          )}
        </motion.div>
      )}
    </div>
  );

  const renderTeamTab = () => (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900">AI Team Formation</h3>
          <p className="text-sm text-gray-400 mt-0.5">
            Suggests up to 3 teams from <strong>unassigned</strong> employees only (not on other project teams).
            Each team: 1 QA +{' '}
            {suggestedDevCount != null
              ? `${suggestedDevCount} developer${suggestedDevCount === 1 ? '' : 's'}`
              : '2–4 developers based on scope'}.
          </p>
          {availabilityMessage && (
            <p className="text-sm text-amber-700 mt-2 font-medium">{availabilityMessage}</p>
          )}
        </div>
        <button
          onClick={handleSuggestTeam}
          disabled={!selectedProject || loading}
          className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.97]"
        >
          <Sparkles size={16} />
          Generate Team Options
        </button>
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <LoadingOverlay key="loading" />
        ) : teamCards.length > 0 ? (
          <motion.div
            key="results"
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 overflow-visible"
            variants={stagger}
            initial="initial"
            animate="animate"
          >
            {teamCards.map((card) => {
              const { qa, devs } = splitTeamMembers(card.team);
              return (
              <motion.div
                key={card.id}
                variants={fadeUp}
                className={`rounded-2xl p-5 shadow-sm flex flex-col relative overflow-visible ${
                  card.isRecommended
                    ? 'bg-gradient-to-b from-amber-50 to-white border-2 border-amber-300 ring-2 ring-amber-200/60'
                    : 'bg-white border border-gray-100'
                }`}
              >
                {card.isRecommended && (
                  <div className="absolute top-0 right-0 bg-amber-500 text-white text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-bl-xl flex items-center gap-1">
                    <Sparkles size={10} />
                    Best for this project
                  </div>
                )}
                <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${
                  card.isRecommended ? 'text-amber-800' : 'text-indigo-600'
                }`}>
                  {card.label}
                </p>
                <label className="text-[10px] font-bold text-gray-400 uppercase">Team name</label>
                <input
                  type="text"
                  value={card.teamName}
                  onChange={(e) => updateCardTeamName(card.id, e.target.value)}
                  className="mt-1 mb-3 w-full px-3 py-2 rounded-xl border border-gray-200 font-bold text-gray-900 text-sm"
                />

                <div className="space-y-1.5 mb-3 flex-1">
                  <TeamMemberLine roleLabel="QA" name={qa?.name ?? ''} />
                  {devs.map((dev, slotIndex) => (
                    <TeamMemberLine
                      key={`${card.id}-dev-${slotIndex}`}
                      roleLabel={`Dev ${slotIndex + 1}`}
                      name={dev.name}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => toggleCardExpanded(card.id)}
                  className="text-xs font-bold text-indigo-600 mb-3 flex items-center gap-1"
                >
                  {card.expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  {card.expanded ? 'Hide AI notes' : 'Why this lineup?'}
                </button>
                {card.expanded && (
                  <ul className="space-y-2 mb-4 max-h-36 overflow-y-auto">
                    {card.team.map((member, i) => (
                      <li
                        key={member.userId + i}
                        className="p-2 rounded-lg bg-gray-50 border border-gray-100 text-xs text-gray-500"
                      >
                        <span className="font-bold text-gray-700">{member.name}</span>
                        {' — '}
                        {member.reason}
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  type="button"
                  onClick={() => handleCreateTeamFromCard(card)}
                  disabled={applyingCardId === card.id}
                  className="mt-auto w-full flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-green-700 disabled:opacity-50"
                >
                  {applyingCardId === card.id ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Check size={16} />
                  )}
                  {applyingCardId === card.id ? 'Creating...' : 'Create team'}
                </button>
              </motion.div>
            );
            })}
          </motion.div>
        ) : (
          <EmptyState
            key="empty"
            message="Select a project and generate up to 3 AI team options (available employees + QA only)"
          />
        )}
      </AnimatePresence>
    </div>
  );

  const renderTaskTab = () => (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Smart Task Allocation</h3>
          <p className="text-sm text-gray-400 mt-0.5">
            Only projects with unassigned open tasks appear below. AI suggests owners for those tasks
            only — already-assigned tasks are skipped.
          </p>
        </div>
        <button
          onClick={handleSuggestTasks}
          disabled={!selectedProject || loading}
          className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.97]"
        >
          <ListTodo size={16} />
          Suggest Task Assignments
        </button>
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <LoadingOverlay key="loading" />
        ) : taskAssignments.length > 0 ? (
          <motion.div key="results" variants={stagger} initial="initial" animate="animate">
            <div className="grid gap-4">
              {taskAssignments.map((task, i) => (
                <motion.div
                  key={task.taskId + i}
                  variants={fadeUp}
                  className="bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <ListTodo size={16} className="text-blue-600" />
                      </div>
                      <p className="font-bold text-gray-900 truncate">
                        {task.taskTitle}
                      </p>
                      <ArrowRight size={16} className="text-gray-300 flex-shrink-0" />
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-rose-600 flex items-center justify-center text-white font-bold text-xs">
                          {task.employeeName?.charAt(0) || '?'}
                        </div>
                        <p className="font-semibold text-gray-700 text-sm">
                          {task.employeeName}
                        </p>
                      </div>
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      <ConfidenceBadge confidence={task.confidence} />
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    {task.reason}
                  </p>
                </motion.div>
              ))}
            </div>

            <motion.div variants={fadeUp} className="mt-6 flex justify-end">
              <button
                onClick={handleApplyTaskAssignments}
                disabled={applying}
                className="flex items-center gap-2 bg-green-600 text-white px-8 py-3 rounded-xl font-semibold text-sm hover:bg-green-700 disabled:opacity-50 transition-all active:scale-[0.97]"
              >
                {applying ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Check size={16} />
                )}
                {applying ? 'Applying...' : 'Apply All Assignments'}
              </button>
            </motion.div>
          </motion.div>
        ) : (
          <EmptyState key="empty" message="Click the button above to get AI-powered task assignment suggestions" />
        )}
      </AnimatePresence>
    </div>
  );

  const visibleTabs =
    variant === 'tasks-only'
      ? TABS.filter((t) => t.key === 'tasks')
      : variant === 'team-only'
        ? TABS.filter((t) => t.key === 'team')
        : TABS;

  const tabsCard = (
        <div className={`bg-white rounded-2xl shadow-sm ${embedded ? 'border border-gray-100' : ''}`}>
          {/* Tab Bar */}
          <div className="flex border-b border-gray-100 overflow-hidden rounded-t-2xl">
            {visibleTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold transition-colors relative ${
                  activeTab === tab.key
                    ? 'text-gray-900'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {tab.icon}
                {tab.label}
                {activeTab === tab.key && (
                  <motion.div
                    layoutId="tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-black"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-6 overflow-visible">
            {!selectedProject ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                  <AlertCircle size={28} className="text-gray-400" />
                </div>
                <p className="text-gray-500 font-semibold">Select a project first</p>
                <p className="text-gray-400 text-sm mt-1">
                  Choose a project from the dropdown above to get started
                </p>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  {activeTab === 'team' && renderTeamTab()}
                  {activeTab === 'tasks' && renderTaskTab()}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </div>
  );

  // ---------- Main Render ----------
  const toastWrap = (
    <AnimatePresence>
      {toast && <ToastNotification toast={toast} onClose={() => setToast(null)} />}
    </AnimatePresence>
  );

  if (embedded) {
    return (
      <div className="relative">
        {toastWrap}
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm">
          <div className="p-8 border-b border-gray-100 bg-gradient-to-r from-violet-50/80 to-indigo-50/80">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shrink-0">
                <Brain size={22} className="text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2 flex-wrap">
                  AI assistant
                  <Sparkles size={18} className="text-yellow-500" />
                </h2>
                <p className="text-sm text-gray-600 mt-1 max-w-3xl leading-relaxed">
                  Build project teams (1 QA + developers), then allocate tasks. Change members anytime using Assign
                  Member above. Task allocation needs a team on the project first.
                </p>
              </div>
            </div>
          </div>
          <div className="p-6 md:p-8 space-y-6 bg-[#F8FAFC]/50">
            {renderProjectSelector()}
            {tabsCard}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {toastWrap}

      <div className="bg-white border-b border-gray-100 mb-8 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Brain size={22} className="text-white" />
            </div>
            <h1 className="text-3xl font-black text-gray-900">AI Resource Allocation</h1>
            <Sparkles size={20} className="text-yellow-500" />
          </div>
          <p className="text-gray-500 font-medium ml-[52px]">
            Intelligent team formation and task assignment powered by AI
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6">
        {renderProjectSelector()}
        {tabsCard}
      </div>
    </div>
  );
};

// ---------- Empty State Component ----------
function EmptyState({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
        <Sparkles size={24} className="text-gray-300" />
      </div>
      <p className="text-gray-400 text-sm font-medium max-w-xs">{message}</p>
    </motion.div>
  );
}

export default AiAllocation;
