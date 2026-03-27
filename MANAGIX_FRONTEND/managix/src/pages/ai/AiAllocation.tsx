import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Users,
  UserCheck,
  ListTodo,
  Brain,
  Loader2,
  Check,
  X,
  ChevronDown,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { projectService } from '../../api/projectService';
import { teamService } from '../../api/teamService';
import { taskService } from '../../api/taskService';
import {
  aiService,
  type TeamSuggestion,
  type EmployeeRecommendation,
  type TaskAssignment,
} from '../../api/aiService';

type TabKey = 'team' | 'employees' | 'tasks';

interface Toast {
  message: string;
  type: 'success' | 'error';
}

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'team', label: 'Suggest Team', icon: <Users size={18} /> },
  { key: 'employees', label: 'Recommend Employees', icon: <UserCheck size={18} /> },
  { key: 'tasks', label: 'Task Allocation', icon: <ListTodo size={18} /> },
];

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

// ---------- Score Bar ----------
function ScoreBar({ score }: { score: number }) {
  const color =
    score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-500' : 'bg-red-500';
  const textColor =
    score >= 80 ? 'text-green-700' : score >= 60 ? 'text-yellow-700' : 'text-red-700';

  return (
    <div className="flex items-center gap-3 w-full">
      <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      <span className={`text-xs font-bold ${textColor} min-w-[36px] text-right`}>
        {score}%
      </span>
    </div>
  );
}

// ---------- Confidence Badge ----------
function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
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

// ======================================================================
// Main Component
// ======================================================================
const AiAllocation = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('team');
  const [loading, setLoading] = useState(false);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [teamSuggestions, setTeamSuggestions] = useState<TeamSuggestion[]>([]);
  const [employeeRecommendations, setEmployeeRecommendations] = useState<EmployeeRecommendation[]>([]);
  const [taskAssignments, setTaskAssignments] = useState<TaskAssignment[]>([]);
  const [applying, setApplying] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  // Load projects on mount
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const managerId = localStorage.getItem('userId');
        let data: any[];
        if (managerId) {
          data = await projectService.getByManager(managerId);
        } else {
          data = await projectService.getAll();
        }
        setProjects(Array.isArray(data) ? data : []);
      } catch {
        setProjects([]);
        showToast('Failed to load projects', 'error');
      } finally {
        setProjectsLoading(false);
      }
    };
    fetchProjects();
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  }, []);

  // Clear results when switching projects or tabs
  useEffect(() => {
    setTeamSuggestions([]);
    setEmployeeRecommendations([]);
    setTaskAssignments([]);
  }, [selectedProject, activeTab]);

  // ---------- Handlers ----------
  const handleSuggestTeam = async () => {
    if (!selectedProject) return;
    setLoading(true);
    try {
      const res = await aiService.suggestTeam(selectedProject.ProjectId);
      setTeamSuggestions(res.team || []);
    } catch {
      showToast('AI service unavailable. Please ensure the AI service is running.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestEmployees = async () => {
    if (!selectedProject) return;
    setLoading(true);
    try {
      const description = selectedProject.Description || selectedProject.Title || '';
      const res = await aiService.suggestEmployees(description);
      const sorted = (res.recommendedEmployees || []).sort(
        (a, b) => b.matchScore - a.matchScore
      );
      setEmployeeRecommendations(sorted);
    } catch {
      showToast('AI service unavailable. Please ensure the AI service is running.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestTasks = async () => {
    if (!selectedProject) return;
    setLoading(true);
    try {
      const res = await aiService.suggestTaskAllocation(selectedProject.ProjectId);
      setTaskAssignments(res.taskAssignments || []);
    } catch {
      showToast('AI service unavailable. Please ensure the AI service is running.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyTeam = async () => {
    if (!selectedProject || teamSuggestions.length === 0) return;
    setApplying(true);
    try {
      const userId = localStorage.getItem('userId') || '';
      const teamName = `${selectedProject.Title} Team`;

      // 1. Create a new team
      const teamRes = await teamService.createTeam(teamName);
      const teamId = teamRes.TeamId || teamRes.teamId || teamRes.id;

      // 2. Add each suggested employee
      for (const member of teamSuggestions) {
        await teamService.addEmployeeToTeam(teamId, member.userId);
      }

      // 3. Assign team to project
      await teamService.assignTeamToProject(teamId, selectedProject.ProjectId);

      showToast('Team created and assigned to project successfully!', 'success');
    } catch {
      showToast('Failed to apply team suggestion. Please try again.', 'error');
    } finally {
      setApplying(false);
    }
  };

  const handleApplyTaskAssignments = async () => {
    if (taskAssignments.length === 0) return;
    setApplying(true);
    try {
      for (const assignment of taskAssignments) {
        await taskService.update(assignment.taskId, {
          AssignedEmployeeId: assignment.userId,
        });
      }
      showToast('All task assignments applied successfully!', 'success');
    } catch {
      showToast('Failed to apply some task assignments. Please try again.', 'error');
    } finally {
      setApplying(false);
    }
  };

  // ---------- Render Helpers ----------
  const renderProjectSelector = () => (
    <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
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
              {selectedProject ? selectedProject.Title : 'Choose a project...'}
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
                {projects.length === 0 ? (
                  <div className="p-4 text-sm text-gray-400 text-center">
                    No projects found
                  </div>
                ) : (
                  projects.map((p: any) => (
                    <button
                      key={p.ProjectId}
                      onClick={() => {
                        setSelectedProject(p);
                        setDropdownOpen(false);
                      }}
                      className={`w-full text-left px-5 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 ${
                        selectedProject?.ProjectId === p.ProjectId
                          ? 'bg-gray-50 font-bold'
                          : ''
                      }`}
                    >
                      <p className="font-semibold text-gray-900 text-sm">{p.Title}</p>
                      {p.Description && (
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                          {p.Description}
                        </p>
                      )}
                    </button>
                  ))
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
          <p className="text-sm font-bold text-gray-800">{selectedProject.Title}</p>
          {selectedProject.Description && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
              {selectedProject.Description}
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
            Let AI analyze your project requirements and suggest the ideal team
          </p>
        </div>
        <button
          onClick={handleSuggestTeam}
          disabled={!selectedProject || loading}
          className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.97]"
        >
          <Sparkles size={16} />
          Generate Team Suggestion
        </button>
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <LoadingOverlay key="loading" />
        ) : teamSuggestions.length > 0 ? (
          <motion.div key="results" variants={stagger} initial="initial" animate="animate">
            <div className="grid gap-4">
              {teamSuggestions.map((member, i) => (
                <motion.div
                  key={member.userId + i}
                  variants={fadeUp}
                  className="bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                        {member.name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{member.name}</p>
                        <span className="inline-block mt-1 px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">
                          {member.role}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mt-3 leading-relaxed pl-15">
                    {member.reason}
                  </p>
                </motion.div>
              ))}
            </div>

            <motion.div variants={fadeUp} className="mt-6 flex justify-end">
              <button
                onClick={handleApplyTeam}
                disabled={applying}
                className="flex items-center gap-2 bg-green-600 text-white px-8 py-3 rounded-xl font-semibold text-sm hover:bg-green-700 disabled:opacity-50 transition-all active:scale-[0.97]"
              >
                {applying ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Check size={16} />
                )}
                {applying ? 'Applying...' : 'Apply Team'}
              </button>
            </motion.div>
          </motion.div>
        ) : (
          <EmptyState key="empty" message="Click the button above to generate an AI-powered team suggestion" />
        )}
      </AnimatePresence>
    </div>
  );

  const renderEmployeeTab = () => (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Employee Recommendations</h3>
          <p className="text-sm text-gray-400 mt-0.5">
            Find the best-matching employees based on project requirements
          </p>
        </div>
        <button
          onClick={handleSuggestEmployees}
          disabled={!selectedProject || loading}
          className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.97]"
        >
          <UserCheck size={16} />
          Find Best Employees
        </button>
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <LoadingOverlay key="loading" />
        ) : employeeRecommendations.length > 0 ? (
          <motion.div key="results" variants={stagger} initial="initial" animate="animate">
            <div className="grid gap-4">
              {employeeRecommendations.map((emp, i) => (
                <motion.div
                  key={emp.userId + i}
                  variants={fadeUp}
                  className="bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm">
                      {emp.name?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-900">{emp.name}</p>
                      <div className="mt-2">
                        <ScoreBar score={emp.matchScore} />
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    {emp.reason}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : (
          <EmptyState key="empty" message="Click the button above to find the best-matching employees" />
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
            AI will analyze tasks and assign them to the most suitable team members
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

  // ---------- Main Render ----------
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <ToastNotification toast={toast} onClose={() => setToast(null)} />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="bg-white border-b border-gray-100 mb-8 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Brain size={22} className="text-white" />
            </div>
            <h1 className="text-3xl font-black text-gray-900">
              AI Resource Allocation
            </h1>
            <Sparkles size={20} className="text-yellow-500" />
          </div>
          <p className="text-gray-500 font-medium ml-[52px]">
            Intelligent team formation and task assignment powered by AI
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6">
        {/* Project Selector */}
        {renderProjectSelector()}

        {/* Tabs + Content */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {/* Tab Bar */}
          <div className="flex border-b border-gray-100">
            {TABS.map((tab) => (
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
          <div className="p-6">
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
                  {activeTab === 'employees' && renderEmployeeTab()}
                  {activeTab === 'tasks' && renderTaskTab()}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </div>
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
