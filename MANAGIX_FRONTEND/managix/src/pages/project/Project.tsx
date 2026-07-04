import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectService } from '../../api/projectService';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiPlus, FiEdit3, FiTrash2, FiCheckCircle, 
  FiArrowRight, FiBriefcase, FiXCircle, FiSearch 
} from 'react-icons/fi';
import ConfirmDeleteModal from '../../components/ConfirmDeleteModal';

const Projects = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const navigate = useNavigate();
  
  // UI States
  const [showModal, setShowModal] = useState(false);
  const [deleteProjectTarget, setDeleteProjectTarget] = useState<any>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'error' | 'success' }[]>([]);
  
  // Logic States
  const [isEditing, setIsEditing] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [newProject, setNewProject] = useState({ title: '', description: '' });

  const userId = localStorage.getItem('userId');
  const role = localStorage.getItem('roleName') || localStorage.getItem('userRole');

  const addToast = (message: string, type: 'error' | 'success' = 'error') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      if (!userId) return;
      if (role === 'Manager') {
        const data = await projectService.getByManager(userId);
        setProjects(Array.isArray(data) ? data : []);
      } else if (role === 'Employee') {
        const data = await projectService.getByEmployee(userId);
        setProjects(Array.isArray(data) ? data : []);
      } else if (role === 'Admin') {
        const data = await projectService.getAll();
        setProjects(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      addToast("Failed to fetch projects", "error");
    }
  };

  const openProject = (projectId: string) => {
    localStorage.setItem('lastViewedProjectId', projectId);
    navigate(`/projects/${projectId}`);
  };

  const openPerformance = (projectId: string) => {
    navigate(`/performance/${projectId}`);
  };

  const handleCloseProject = async (projectId: string) => {
    try {
      await projectService.close(projectId, { comment: "Closed by Manager" });
      fetchProjects();
      addToast("Project marked as completed", "success");
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string; detail?: string } } };
      addToast(
        ax.response?.data?.message ??
          ax.response?.data?.detail ??
          'Failed to close project',
        'error',
      );
    }
  };

  const confirmDelete = (project: any) => {
    setDeleteProjectTarget(project);
  };

  const handleDeleteProject = async () => {
    const pId = deleteProjectTarget?.projectId || deleteProjectTarget?.ProjectId;
    if (!pId) return;
    setDeleteBusy(true);
    try {
      await projectService.delete(pId);
      setDeleteProjectTarget(null);
      fetchProjects();
      addToast("Project permanently deleted", "success");
    } catch (err) {
      addToast("Failed to delete project", "error");
    } finally {
      setDeleteBusy(false);
    }
  };

  const openEditModal = (project: any) => {
    const pId = project.projectId || project.ProjectId;
    setIsEditing(true);
    setCurrentProjectId(pId);
    setNewProject({
      title: project.title || project.Title || '',
      description: project.description || project.Description || ''
    });
    setShowModal(true);
  };

  const openCreateModal = () => {
    setIsEditing(false);
    setCurrentProjectId(null);
    setNewProject({ title: '', description: '' });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing && currentProjectId) {
        await projectService.update(currentProjectId, {
          title: newProject.title,
          description: newProject.description,
        });
        addToast("Project updated successfully", "success");
        closeModal();
        fetchProjects();
      } else {
        addToast("Use Create Project to add budget, model, deadlines, and milestones.", "error");
        navigate("/create-project");
        closeModal();
      }
    } catch (err) {
      addToast(`Error ${isEditing ? "updating" : "creating"} project`, "error");
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setIsEditing(false);
    setCurrentProjectId(null);
    setNewProject({ title: '', description: '' });
  };

  return (
    <div className="min-h-screen bg-bg">
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 bg-surface border-b border-line px-8 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-fg">Welcome</h1>
        <div className="relative w-96">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-fg-subtle" />
          <input
            type="text"
            placeholder="Search projects..."
            className="w-full pl-12 pr-4 py-3 bg-surface-2 text-fg border border-line rounded-lg text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/25 transition-all leading-relaxed"
          />
        </div>
      </header>

      <main className="p-8 max-w-7xl mx-auto">
        {/* Page Action Bar */}
        <div className="flex justify-between items-end mb-10">
          <div>
            <label className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2 block">Enterprise Portal</label>
            <h2 className="text-2xl font-bold text-fg tracking-tight">Manage Projects</h2>
          </div>
          {/* <button
            onClick={openCreateModal}
            className="bg-primary text-primary-fg px-8 py-4 rounded-lg font-bold text-sm uppercase tracking-widest flex items-center gap-2 hover:bg-primary-hover transition-all shadow-e2 hover:-translate-y-1 active:scale-95"
          >
            <FiPlus strokeWidth={3} /> Create Project
          </button> */}
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.length === 0 ? (
            <div className="col-span-full py-24 bg-surface rounded-xl border border-dashed border-line text-center">
               <FiBriefcase size={48} className="mx-auto mb-4 opacity-10" />
               <p className="font-bold uppercase tracking-widest text-[10px] text-fg-subtle">No active projects found</p>
            </div>
          ) : (
            projects.map(p => {
              const pId = p.projectId || p.ProjectId;
              const isClosed = p.status === "Completed" || p.Status === "Completed" || p.isClosed;
              
              return (
                <div
                  key={pId}
                  className="group relative overflow-hidden bg-surface p-8 rounded-xl border border-line shadow-e1 transition-all hover:-translate-y-2 hover:shadow-e3"
                >
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                      <div className={`p-3 rounded-lg ${isClosed ? 'bg-success-soft' : 'bg-primary-soft'}`}>
                        <FiBriefcase className={isClosed ? 'text-success' : 'text-primary'} size={20} />
                      </div>
                      <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest border ${
                        isClosed ? 'bg-success-soft text-success border-success/25' : 'bg-primary-soft text-primary border-primary-border'
                      }`}>
                        {p.status || p.Status || 'Active'}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-fg tracking-tight mb-2">
                      {p.title || p.Title || "Untitled Project"}
                    </h3>
                    <p className="text-sm font-medium text-fg-muted line-clamp-2 mb-6 leading-relaxed">
                      {p.description || p.Description || "No description provided."}
                    </p>

                    <div className="flex items-center justify-between pt-4 border-t border-line">
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEditModal(p)}
                          className="p-3 text-fg-subtle hover:text-primary hover:bg-primary-soft rounded-lg transition-all"
                        >
                          <FiEdit3 size={18} />
                        </button>
                        <button
                          onClick={() => confirmDelete(p)}
                          className="p-3 text-fg-subtle hover:text-danger hover:bg-danger-soft rounded-lg transition-all"
                        >
                          <FiTrash2 size={18} />
                        </button>
                        {!isClosed && (
                          <button
                            onClick={() => handleCloseProject(pId)}
                            className="p-3 text-fg-subtle hover:text-success hover:bg-success-soft rounded-lg transition-all"
                            title="Complete Project"
                          >
                            <FiCheckCircle size={18} />
                          </button>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <button
                          type="button"
                          onClick={() => openProject(pId)}
                          className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary hover:gap-3 transition-all"
                        >
                          Open project <FiArrowRight strokeWidth={3} />
                        </button>
                        <button
                          type="button"
                          onClick={() => openPerformance(pId)}
                          className="text-[10px] font-bold uppercase tracking-widest text-fg-muted hover:text-primary"
                        >
                          Performance
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Ghost Icon */}
                  <FiBriefcase className="absolute -bottom-6 -right-6 size-32 opacity-5 text-fg rotate-12" />
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* CREATE / UPDATE MODAL */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
              onClick={closeModal}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-surface p-10 rounded-xl w-full max-w-lg shadow-e3"
            >
              <h2 className="text-2xl font-bold tracking-tight mb-2 text-fg">
                {isEditing ? 'Edit Project' : 'New Project'}
              </h2>
              <p className="font-medium text-fg-muted mb-8">Set the direction for your team's next objective.</p>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-fg-subtle uppercase tracking-widest ml-1">Project Name</label>
                  <input
                    className="w-full p-4 bg-surface-2 text-fg border border-line rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/25 font-bold transition-all"
                    placeholder="e.g. Apollo Launch" required
                    value={newProject.title}
                    onChange={e => setNewProject({ ...newProject, title: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-fg-subtle uppercase tracking-widest ml-1">Objective & Scope</label>
                  <textarea
                    className="w-full p-4 bg-surface-2 text-fg border border-line rounded-lg outline-none focus:border-primary focus:ring-2 focus:ring-primary/25 font-medium leading-relaxed resize-none"
                    placeholder="Describe the goals..." rows={4}
                    value={newProject.description}
                    onChange={e => setNewProject({ ...newProject, description: e.target.value })}
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="submit" className="flex-[2] bg-primary text-primary-fg p-5 rounded-lg font-bold text-sm uppercase tracking-widest shadow-e2 hover:bg-primary-hover hover:-translate-y-1 transition-all">
                    {isEditing ? 'Save Changes' : 'Launch Project'}
                  </button>
                  <button type="button" onClick={closeModal} className="flex-1 bg-surface-2 text-fg-muted p-5 rounded-lg font-bold text-sm uppercase tracking-widest hover:bg-surface-3">
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmDeleteModal
        open={Boolean(deleteProjectTarget)}
        message={
          deleteProjectTarget
            ? `Delete project "${deleteProjectTarget.title || deleteProjectTarget.Title}"? All milestones, tasks, and team links will be removed. You won't be able to revert this!`
            : undefined
        }
        details={
          deleteProjectTarget
            ? [
                { label: 'Status', value: deleteProjectTarget.status || deleteProjectTarget.Status || 'Active' },
              ]
            : []
        }
        warning="This permanently deletes the project and cannot be undone."
        busy={deleteBusy}
        onConfirm={handleDeleteProject}
        onCancel={() => !deleteBusy && setDeleteProjectTarget(null)}
      />

      {/* Toast Notification Container */}
      <div className="fixed bottom-8 right-8 z-[100] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className={`pointer-events-auto flex items-center gap-3 px-6 py-4 rounded-lg shadow-e3 bg-surface border-l-4 min-w-[320px] ${
                toast.type === 'error' ? 'border-danger' : 'border-success'
              }`}
            >
              {toast.type === 'error' ? (
                <FiXCircle className="text-danger text-xl shrink-0" />
              ) : (
                <FiCheckCircle className="text-success text-xl shrink-0" />
              )}
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-widest text-fg-subtle leading-none mb-1">
                  {toast.type === 'error' ? 'Error Alert' : 'Success'}
                </span>
                <span className="text-sm font-bold text-fg-muted">{toast.message}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Projects;