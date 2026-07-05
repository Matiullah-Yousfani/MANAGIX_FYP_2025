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
import EmployeeDashboardWidgets from '../../components/EmployeeDashboardWidgets';
import ManagerDashboardWidgets from '../../components/ManagerDashboardWidgets';
import ConfirmDeleteModal from '../../components/ConfirmDeleteModal';
import { normalizeAppRole } from '../../utils/roles';

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
          const inProgress = dash?.inProgressTasks ?? dash?.InProgressTasks
            ?? Math.max(0, (dash?.totalTasks ?? 0) - (dash?.completedTasks ?? 0) - (dash?.pendingTasks ?? 0));
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
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center">
      <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4" />
      <p className="text-gray-400 font-bold italic">Refreshing workspace...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20 font-sans">
      {/* HEADER */}
      <div className="bg-white border-b border-gray-100 mb-8 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black text-gray-900 flex items-center gap-3">
              <FiActivity className="text-indigo-600" /> Welcome, {userName.split(' ')[0]}
            </h1>
            <p className="text-gray-500 mt-1 font-medium italic">Strategic Project Overview</p>
          </div>

          <div className="relative group w-full md:w-96">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
            <input
              type="text"
              placeholder="Search active projects..."
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-transparent rounded-2xl outline-none focus:bg-white focus:border-indigo-200 transition-all font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6">
        {userRole?.toLowerCase() !== 'admin' && userRole?.toLowerCase() !== 'qa' && <DashboardTimesheetCard />}

        {normalizeAppRole(userRole) === 'Employee' && userId && (
          <EmployeeDashboardWidgets userId={userId} />
        )}

        {normalizeAppRole(userRole) === 'Manager' && userId && (
          <ManagerDashboardWidgets userId={userId} />
        )}

        {/* METRICS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex items-center gap-6">
            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
              <FiBriefcase size={28} />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Projects</p>
              <h3 className="text-3xl font-black text-gray-900">{projects.length}</h3>
            </div>
          </div>
        </div>

        {/* PROJECTS GRID */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <h2 className="text-2xl font-black text-gray-800">
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
                className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest transition-all border ${
                  showClosed
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
                }`}
                title={showClosed ? 'Hide archived projects' : 'Show archived projects'}
              >
                {showClosed ? `Hiding ${closedCount} archived` : `Show ${closedCount} archived`}
              </button>
            )}
            <span className="bg-indigo-100 text-indigo-700 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest">
              {filteredProjects.length} Instances
            </span>
          </div>
        </div>

        {filteredProjects.length === 0 ? (
          <div className="text-center py-20 bg-gray-50 rounded-[2.5rem] border-2 border-dashed border-gray-200">
            <FiBriefcase className="mx-auto text-gray-300 mb-4" size={48} />
            <p className="text-gray-600 font-bold">
              {normalizeAppRole(userRole) === 'Employee'
                ? "You don't have any assigned projects yet."
                : 'No projects matching your search.'}
            </p>
            <p className="text-sm text-gray-400 mt-2">
              {normalizeAppRole(userRole) === 'Employee'
                ? 'Your manager will add you to a project team.'
                : 'Try adjusting your search or show archived projects.'}
            </p>
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
            className={`fixed bottom-8 right-8 z-50 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 ${
              toast.type === 'success' ? 'bg-gray-900 text-white' : 'bg-red-600 text-white'
            }`}>
            {toast.type === 'success' ? <FiCheckCircle /> : <FiTrash2 />}
            <span className="font-bold text-sm">{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL: Edit / Details */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={() => setShowModal(false)} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl p-10 overflow-y-auto max-h-[90vh]">
              
              {isEditing ? (
                // Edit Form
                <>
                  <h2 className="text-3xl font-black text-gray-900 mb-8">Edit Project</h2>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-2">Title</label>
                      <input className="w-full bg-gray-50 border-none p-4 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                        required value={newProject.title} onChange={e => setNewProject({ ...newProject, title: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-2">Description</label>
                      <textarea className="w-full bg-gray-50 border-none p-4 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium h-32 resize-none"
                        value={newProject.description} onChange={e => setNewProject({ ...newProject, description: e.target.value })} />
                    </div>
                    <div className="flex gap-4 pt-4">
                      <button type="submit" className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all">Save Changes</button>
                      <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-gray-100 text-gray-600 py-4 rounded-2xl font-bold">Cancel</button>
                    </div>
                  </form>
                </>
              ) : selectedProject ? (
                // Details View
                <>
                  <h2 className="text-3xl font-black text-gray-900 mb-4">{selectedProject.Title}</h2>
                  <p className="text-gray-500 mb-4 whitespace-pre-line">{selectedProject.Description}</p>

                  <div className="mb-4"><span className="font-bold">Deadline:</span> {new Date(selectedProject.Deadline).toLocaleDateString()}</div>
                  <div className="mb-4"><span className="font-bold">Budget:</span> ${selectedProject.Budget}</div>
                  <div className="mb-4"><span className="font-bold">Status:</span> {selectedProject.Status}</div>

                  <div className="mb-4">
                    <h3 className="font-bold text-lg mb-2">Milestones</h3>
                    <ul className="list-disc pl-6">
                      {selectedProject.Milestones.map((m: any) => (
                        <li key={m.MilestoneId}>
                          {m.Title} - {m.Status} - Deadline: {new Date(m.Deadline).toLocaleDateString()}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mb-4">
                    <h3 className="font-bold text-lg mb-2">Tasks</h3>
                    <ul className="space-y-2">
                      {(selectedProject.Tasks ?? selectedProject.tasks ?? []).map((t: any) => (
                        <li key={t.TaskId ?? t.taskId} className="text-sm flex justify-between bg-gray-50 rounded-lg px-3 py-2">
                          <span className="font-medium">{t.Title ?? t.title}</span>
                          <span className="text-gray-500 text-xs">
                            {t.AssignedEmployeeName ?? t.assignedEmployeeName ?? 'Unassigned'} · {t.Status ?? t.status}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mb-4">
                    <h3 className="font-bold text-lg mb-2">Teams</h3>
                    <ul className="list-disc pl-6">
                      {selectedProject.Teams.map((team: any) => (
                        <li key={team.TeamId}>{team.Name}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="mb-4">
                    <h3 className="font-bold text-lg mb-2">Members</h3>
                    <ul className="list-disc pl-6">
                      {selectedProject.Members.map((member: any) => (
                        <li key={member.UserId}>{member.FullName} ({member.Email})</li>
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
                          className="bg-indigo-600 text-white py-3 px-6 rounded-2xl font-bold hover:bg-indigo-700 transition-all flex items-center gap-2"
                        >
                          <FiEdit3 /> Edit Project
                        </button>
                        <button
                          onClick={() => {
                            const proxyEvent = { stopPropagation: () => {} } as React.MouseEvent;
                            confirmDelete(proxyEvent, selectedProject.ProjectId || selectedProject.projectId);
                          }}
                          className="bg-red-50 text-red-600 border border-red-100 py-3 px-6 rounded-2xl font-bold hover:bg-red-600 hover:text-white transition-all flex items-center gap-2"
                        >
                          <FiTrash2 /> Delete
                        </button>
                      </>
                    )}
                    <button onClick={() => setShowModal(false)} className="bg-gray-100 text-gray-600 py-3 px-6 rounded-2xl font-bold">Close</button>
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
