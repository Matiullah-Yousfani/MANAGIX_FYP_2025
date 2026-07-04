// src/pages/Dashboard.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiBriefcase, FiCheckCircle, FiPlus, FiSearch, FiTrash2, FiEdit3, FiChevronRight, FiActivity } from 'react-icons/fi';
import api from '../../api/axiosInstance';
import { projectService } from '../../api/projectService';
import { adminService } from '../../api/adminService';
// PHASE 2: methodology-aware dashboard dispatcher.
import MethodologyDashboard, { type ProjectAggregates } from '../../components/dashboard/MethodologyDashboard';
import DashboardTimesheetCard from '../../components/DashboardTimesheetCard';
import ConfirmDeleteModal from '../../components/ConfirmDeleteModal';

const Dashboard = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('User');
  const [userRole, setUserRole] = useState('Member');
  const [userId, setUserId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const navigate = useNavigate();

  // Modal & Action States
  const [showModal, setShowModal] = useState(false);
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [newProject, setNewProject] = useState({ title: '', description: '' });
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // ✅ Admin: selected project details
  const [selectedProject, setSelectedProject] = useState<any | null>(null);

  // PHASE 2: per-project task/milestone aggregates. Lazy-fetched after the project list arrives.
  // Keyed by projectId. Fed into the methodology dispatcher so each variant view has its KPIs.
  const [aggregates, setAggregates] = useState<Record<string, ProjectAggregates>>({});

  // PHASE 2: archive toggle — by default the dashboard hides closed/completed projects so it
  // matches the Monitoring panel's "operational health" definition. Flip this to surface them.
  const [showClosed, setShowClosed] = useState(false);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const storedName = localStorage.getItem('userName');
    const storedRole = localStorage.getItem('userRole');
    const storedId = localStorage.getItem('userId');
    if (storedName) setUserName(storedName);
    if (storedRole) setUserRole(storedRole);
    if (storedId) setUserId(storedId);
    fetchDashboardData(storedRole, storedId);
  }, []);

  const fetchDashboardData = async (role: string | null, id: string | null) => {
    if (!id || !role) { setLoading(false); return; }
    try {
      setLoading(true);
      let projectData = [];
      if (role === 'Admin') {
        projectData = await projectService.getAll();
      } else if (role === 'Manager') {
        projectData = await projectService.getByManager(id);
      } else {
        projectData = await projectService.getByEmployee(id);
      }
      setProjects(Array.isArray(projectData) ? projectData : []);

      // PHASE 2: kick off aggregate fetches in parallel — non-blocking.
      // Uses the existing `/projects/{id}/dashboard` endpoint (ProjectDashboardDto) so we
      // don't add a new backend route. Failures are silently ignored per project.
      const list = Array.isArray(projectData) ? projectData : [];
      Promise.all(list.map(async (p: any) => {
        const id = p.projectId || p.ProjectId;
        if (!id) return null;
        try {
          const [dash, mileRes] = await Promise.all([
            projectService.getProjectDashboard(id),
            api.get(`/milestones/project/${id}`).catch(() => ({ data: [] })),
          ]);
          const inProgress = Math.max(0, (dash?.totalTasks ?? 0) - (dash?.completedTasks ?? 0) - (dash?.pendingTasks ?? 0));
          const rawMiles = mileRes.data;
          const milestones = (Array.isArray(rawMiles) ? rawMiles : []).map((m: any) => ({
            milestoneId: String(m.milestoneId ?? m.MilestoneId ?? ''),
            title: m.title ?? m.Title ?? '',
            status: m.status ?? m.Status ?? 'Pending',
            deadline: m.deadline ?? m.Deadline ?? '',
          }));
          return {
            id: String(id),
            agg: {
              totalTasks: dash?.totalTasks ?? dash?.TotalTasks ?? 0,
              completedTasks: dash?.completedTasks ?? dash?.CompletedTasks ?? 0,
              pendingTasks: dash?.pendingTasks ?? dash?.PendingTasks ?? 0,
              inProgressTasks: inProgress,
              milestones,
            } as ProjectAggregates,
          };
        } catch {
          return null;
        }
      })).then((results) => {
        const map: Record<string, ProjectAggregates> = {};
        for (const r of results) {
          if (r) map[r.id] = r.agg;
        }
        setAggregates(map);
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  // PHASE 2: filter by both search AND archive toggle. Default view hides closed projects.
  // A closed project has either IsClosed = true OR Status = "Completed" / "Closed" — handle both
  // for tolerance against historical rows that only set one.
  const filteredProjects = projects.filter(p => {
    const matchesSearch = (p.title || p.Title || "").toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (showClosed) return true;
    const isClosed = (p.isClosed === true) || (p.IsClosed === true);
    const status = String(p.status ?? p.Status ?? "").toLowerCase();
    const closedByStatus = status === "closed" || status === "completed";
    return !(isClosed || closedByStatus);
  });

  // Tally for the toggle label.
  const closedCount = projects.filter(p => {
    const isClosed = (p.isClosed === true) || (p.IsClosed === true);
    const status = String(p.status ?? p.Status ?? "").toLowerCase();
    return isClosed || status === "closed" || status === "completed";
  }).length;

  // Open modal to edit project
  const openEditModal = (e: React.MouseEvent, project: any) => {
    e.stopPropagation();
    const pId = project.projectId || project.ProjectId;
    setIsEditing(true);
    setCurrentProjectId(pId);
    setNewProject({
      title: project.title || project.Title || '',
      description: project.description || project.Description || ''
    });
    setShowModal(true);
  };

  // Open delete confirmation
  const confirmDelete = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    setDeleteProjectId(projectId);
  };

  const deleteProjectMeta =
    projects.find((p) => String(p.projectId || p.ProjectId) === String(deleteProjectId)) ||
    (selectedProject &&
    String(selectedProject.ProjectId || selectedProject.projectId) === String(deleteProjectId)
      ? selectedProject
      : null);

  const handleDeleteProject = async () => {
    if (!deleteProjectId) return;
    setDeleteBusy(true);
    try {
      await projectService.delete(deleteProjectId);
      setDeleteProjectId(null);
      setShowModal(false);
      showToast("Project deleted successfully");
      fetchDashboardData(userRole, userId);
    } catch (err) {
      showToast("Error deleting project", "error");
    } finally {
      setDeleteBusy(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing && currentProjectId) {
        await projectService.update(currentProjectId, newProject);
        showToast("Project updated");
      }
      setShowModal(false);
      fetchDashboardData(userRole, userId);
    } catch (err) {
      showToast("Operation failed", "error");
    }
  };

  // ✅ Fetch full admin project details
  const fetchProjectDetails = async (projectId: string) => {
    if (userRole !== 'Admin') return;
    try {
      const data = await adminService.getAdminProjectDetailPage(projectId);
      setSelectedProject(data);
      setShowModal(true); // Show modal with full details
      setIsEditing(false); // Disable edit by default in detail view
    } catch (err) {
      showToast("Failed to load project details", "error");
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32">
      <div className="w-10 h-10 border-[3px] border-line border-t-primary rounded-full animate-spin mb-4" />
      <p className="text-fg-muted text-sm">Refreshing workspace…</p>
    </div>
  );

  return (
    <div className="pb-16">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="shrink-0 size-10 grid place-items-center rounded-lg bg-primary-soft text-primary border border-primary-border">
            <FiActivity className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-fg">Welcome, {userName.split(' ')[0]}</h1>
            <p className="text-fg-muted text-sm mt-0.5">Strategic project overview</p>
          </div>
        </div>

        <div className="relative group w-full md:w-80">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-subtle group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder="Search active projects…"
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-surface-2 text-fg border border-line rounded-lg outline-none placeholder:text-fg-subtle focus:border-primary focus:ring-2 focus:ring-primary/25 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div>
        {userRole?.toLowerCase() !== 'admin' && userRole?.toLowerCase() !== 'qa' && <DashboardTimesheetCard />}

        {/* METRICS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
          <div className="bg-surface rounded-xl p-5 border border-line flex items-center gap-5">
            <div className="size-14 bg-primary-soft text-primary border border-primary-border rounded-lg flex items-center justify-center">
              <FiBriefcase size={24} />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-fg-subtle uppercase tracking-wide">Active Projects</p>
              <h3 className="text-3xl font-bold text-fg">{projects.length}</h3>
            </div>
          </div>
        </div>

        {/* PROJECTS GRID */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <h2 className="text-lg font-bold text-fg">
            {showClosed ? 'Portfolio (incl. archived)' : 'Operational Portfolio'}
          </h2>
          <div className="flex items-center gap-3">
            {/*
              PHASE 2: Archive toggle. Hidden when there are no closed projects to avoid clutter.
              When ON, all projects show; when OFF, completed/closed projects are filtered out
              so the dashboard mirrors the Monitoring panel's "active" view.
            */}
            {closedCount > 0 && (
              <button
                onClick={() => setShowClosed(s => !s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wide transition-all border ${
                  showClosed
                    ? 'bg-primary text-primary-fg border-primary'
                    : 'bg-surface-2 text-fg-muted border-line hover:border-primary-border hover:text-primary'
                }`}
                title={showClosed ? 'Hide archived projects' : 'Show archived projects'}
              >
                {showClosed ? `Hiding ${closedCount} archived` : `Show ${closedCount} archived`}
              </button>
            )}
            <span className="bg-primary-soft text-primary border border-primary-border px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide">
              {filteredProjects.length} Instances
            </span>
          </div>
        </div>

        {filteredProjects.length === 0 ? (
          <div className="text-center py-16 bg-surface/50 rounded-xl border border-dashed border-line">
            <FiBriefcase className="mx-auto text-fg-subtle mb-4" size={40} />
            <p className="text-fg-muted">No projects matching your search.</p>
          </div>
        ) : (
          /*
           * PHASE 2: replaced the previous flat 3-column grid with a methodology-aware
           * dispatcher. Each project is rendered with the layout that matches its
           * project model — Agile/Scrum gets sprint cards + velocity, Kanban gets
           * the 3-column flow board, Waterfall gets a phase strip. Click handler is
           * preserved so Admin opens details modal, QA opens review, others navigate
           * to the project page.
           */
          <MethodologyDashboard
            projects={filteredProjects}
            aggregatesById={aggregates}
            onOpen={(pId) => {
              if (userRole === 'Admin') fetchProjectDetails(pId);
              else if (userRole === 'QA') navigate(`/qa/review?projectId=${pId}`);
              else navigate(`/projects/${pId}`);
            }}
          />
        )}
      </div>

      {/* TOAST */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
            className={`fixed bottom-8 right-8 z-50 px-5 py-3.5 rounded-lg shadow-e3 border flex items-center gap-3 ${
              toast.type === 'success' ? 'bg-surface border-line text-fg' : 'bg-danger-soft border-danger/25 text-danger'
            }`}>
            {toast.type === 'success' ? <FiCheckCircle className="text-success" /> : <FiTrash2 />}
            <span className="font-medium text-sm">{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL: Edit / Details */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowModal(false)} />
            <motion.div initial={{ scale: 0.96, opacity: 0, y: 8 }} animate={{ scale: 1, opacity: 1, y: 0 }}
              className="relative w-full max-w-2xl bg-surface border border-line rounded-xl shadow-e3 p-8 overflow-y-auto max-h-[90vh]">

              {isEditing ? (
                // Edit Form
                <>
                  <h2 className="text-xl font-bold text-fg mb-6">Edit Project</h2>
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                      <label className="text-xs font-semibold text-fg-muted block mb-1.5">Title</label>
                      <input className="w-full bg-surface-2 text-fg border border-line p-3 rounded-lg text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
                        required value={newProject.title} onChange={e => setNewProject({ ...newProject, title: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-fg-muted block mb-1.5">Description</label>
                      <textarea className="w-full bg-surface-2 text-fg border border-line p-3 rounded-lg text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/25 h-32 resize-none"
                        value={newProject.description} onChange={e => setNewProject({ ...newProject, description: e.target.value })} />
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button type="submit" className="flex-1 bg-primary text-primary-fg py-3 rounded-lg font-semibold hover:bg-primary-hover transition-all active:scale-[0.98]">Save Changes</button>
                      <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-surface-2 text-fg-muted border border-line py-3 rounded-lg font-semibold hover:bg-surface-3">Cancel</button>
                    </div>
                  </form>
                </>
              ) : selectedProject ? (
                // Details View
                <>
                  <h2 className="text-xl font-bold text-fg mb-2">{selectedProject.Title}</h2>
                  <p className="text-fg-muted text-sm mb-5 whitespace-pre-line">{selectedProject.Description}</p>

                  <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="bg-surface-2 border border-line rounded-lg p-3">
                      <div className="text-[10px] font-semibold text-fg-subtle uppercase tracking-wide">Deadline</div>
                      <div className="text-sm font-semibold text-fg mt-1">{new Date(selectedProject.Deadline).toLocaleDateString()}</div>
                    </div>
                    <div className="bg-surface-2 border border-line rounded-lg p-3">
                      <div className="text-[10px] font-semibold text-fg-subtle uppercase tracking-wide">Budget</div>
                      <div className="text-sm font-semibold text-fg mt-1">${selectedProject.Budget}</div>
                    </div>
                    <div className="bg-surface-2 border border-line rounded-lg p-3">
                      <div className="text-[10px] font-semibold text-fg-subtle uppercase tracking-wide">Status</div>
                      <div className="text-sm font-semibold text-fg mt-1">{selectedProject.Status}</div>
                    </div>
                  </div>

                  <div className="mb-5">
                    <h3 className="font-semibold text-sm text-fg mb-2">Milestones</h3>
                    <ul className="space-y-1.5">
                      {selectedProject.Milestones.map((m: any) => (
                        <li key={m.MilestoneId} className="flex items-center justify-between bg-surface-2 border border-line rounded-lg px-3 py-2 text-sm">
                          <span className="font-medium text-fg">{m.Title}</span>
                          <span className="text-fg-subtle text-xs">{m.Status} · {new Date(m.Deadline).toLocaleDateString()}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mb-5">
                    <h3 className="font-semibold text-sm text-fg mb-2">Tasks</h3>
                    <ul className="space-y-1.5">
                      {(selectedProject.Tasks ?? selectedProject.tasks ?? []).map((t: any) => (
                        <li key={t.TaskId ?? t.taskId} className="text-sm flex justify-between bg-surface-2 border border-line rounded-lg px-3 py-2">
                          <span className="font-medium text-fg">{t.Title ?? t.title}</span>
                          <span className="text-fg-subtle text-xs">
                            {t.AssignedEmployeeName ?? t.assignedEmployeeName ?? 'Unassigned'} · {t.Status ?? t.status}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mb-5">
                    <h3 className="font-semibold text-sm text-fg mb-2">Teams</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedProject.Teams.map((team: any) => (
                        <span key={team.TeamId} className="bg-surface-3 text-fg-muted border border-line-strong px-2.5 py-0.5 rounded-full text-xs font-medium">{team.Name}</span>
                      ))}
                    </div>
                  </div>

                  <div className="mb-5">
                    <h3 className="font-semibold text-sm text-fg mb-2">Members</h3>
                    <ul className="space-y-1.5">
                      {selectedProject.Members.map((member: any) => (
                        <li key={member.UserId} className="flex items-center justify-between bg-surface-2 border border-line rounded-lg px-3 py-2 text-sm">
                          <span className="font-medium text-fg">{member.FullName}</span>
                          <span className="text-fg-subtle text-xs">{member.Email}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/*
                    PHASE 2: Admin edit/delete buttons relocated from the (now removed) inline
                    project cards to this details modal. Same handlers, same UX guarantees.
                  */}
                  <div className="flex flex-wrap gap-3 mt-6">
                    {userRole === 'Admin' && (
                      <>
                        <button
                          onClick={() => {
                            const proxyEvent = { stopPropagation: () => {} } as React.MouseEvent;
                            openEditModal(proxyEvent, {
                              projectId: selectedProject.ProjectId || selectedProject.projectId,
                              title: selectedProject.Title,
                              description: selectedProject.Description,
                            });
                          }}
                          className="bg-primary text-primary-fg py-2.5 px-5 rounded-lg font-semibold hover:bg-primary-hover transition-all active:scale-[0.98] flex items-center gap-2"
                        >
                          <FiEdit3 /> Edit Project
                        </button>
                        <button
                          onClick={() => {
                            const proxyEvent = { stopPropagation: () => {} } as React.MouseEvent;
                            confirmDelete(proxyEvent, selectedProject.ProjectId || selectedProject.projectId);
                          }}
                          className="bg-danger-soft text-danger border border-danger/25 py-2.5 px-5 rounded-lg font-semibold hover:bg-danger hover:text-white transition-all flex items-center gap-2"
                        >
                          <FiTrash2 /> Delete
                        </button>
                      </>
                    )}
                    <button onClick={() => setShowModal(false)} className="bg-surface-2 text-fg-muted border border-line py-2.5 px-5 rounded-lg font-semibold hover:bg-surface-3">Close</button>
                  </div>
                </>
              ) : null}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmDeleteModal
        open={Boolean(deleteProjectId)}
        message={
          deleteProjectMeta
            ? `Delete project "${deleteProjectMeta.title || deleteProjectMeta.Title}"? You won't be able to revert this!`
            : 'Delete this project? You won\'t be able to revert this!'
        }
        details={
          deleteProjectMeta
            ? [
                { label: 'Status', value: deleteProjectMeta.status || deleteProjectMeta.Status || '—' },
                {
                  label: 'Tasks',
                  value: String(
                    (deleteProjectMeta.Tasks ?? deleteProjectMeta.tasks ?? []).length || '—'
                  ),
                },
              ]
            : []
        }
        warning="All milestones, tasks, and team data for this project will be permanently removed."
        busy={deleteBusy}
        onConfirm={handleDeleteProject}
        onCancel={() => !deleteBusy && setDeleteProjectId(null)}
      />
    </div>
  );
};

export default Dashboard;
