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
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-black tracking-tight text-gray-900">Welcome</h1>
        <div className="relative w-96">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text"
            placeholder="Search projects..."
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-600/20 transition-all leading-relaxed"
          />
        </div>
      </header>

      <main className="p-8 max-w-7xl mx-auto">
        {/* Page Action Bar */}
        <div className="flex justify-between items-end mb-10">
          <div>
            <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2 block">Enterprise Portal</label>
            <h2 className="text-4xl font-black text-gray-900 tracking-tight">Manage Projects</h2>
          </div>
          {/* <button 
            onClick={openCreateModal}
            className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 hover:-translate-y-1 active:scale-95"
          >
            <FiPlus strokeWidth={3} /> Create Project
          </button> */}
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.length === 0 ? (
            <div className="col-span-full py-24 bg-white rounded-[2.5rem] border border-dashed border-gray-200 text-center">
               <FiBriefcase size={48} className="mx-auto mb-4 opacity-10" />
               <p className="font-black uppercase tracking-widest text-[10px] text-gray-400">No active projects found</p>
            </div>
          ) : (
            projects.map(p => {
              const pId = p.projectId || p.ProjectId;
              const isClosed = p.status === "Completed" || p.Status === "Completed" || p.isClosed;
              
              return (
                <div 
                  key={pId}
                  className="group relative overflow-hidden bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm transition-all hover:-translate-y-2 hover:shadow-2xl"
                >
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                      <div className={`p-3 rounded-2xl ${isClosed ? 'bg-emerald-50' : 'bg-indigo-50'}`}>
                        <FiBriefcase className={isClosed ? 'text-emerald-600' : 'text-indigo-600'} size={20} />
                      </div>
                      <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border ${
                        isClosed ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-indigo-100 text-indigo-700 border-indigo-200'
                      }`}>
                        {p.status || p.Status || 'Active'}
                      </span>
                    </div>

                    <h3 className="text-xl font-black text-gray-900 tracking-tight mb-2">
                      {p.title || p.Title || "Untitled Project"}
                    </h3>
                    <p className="text-sm font-medium italic text-gray-500 line-clamp-2 mb-6 leading-relaxed">
                      {p.description || p.Description || "No description provided."}
                    </p>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                      <div className="flex gap-1">
                        <button 
                          onClick={() => openEditModal(p)}
                          className="p-3 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                        >
                          <FiEdit3 size={18} />
                        </button>
                        <button 
                          onClick={() => confirmDelete(p)}
                          className="p-3 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                        >
                          <FiTrash2 size={18} />
                        </button>
                        {!isClosed && (
                          <button 
                            onClick={() => handleCloseProject(pId)}
                            className="p-3 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
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
                          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:gap-3 transition-all"
                        >
                          Open project <FiArrowRight strokeWidth={3} />
                        </button>
                        <button
                          type="button"
                          onClick={() => openPerformance(pId)}
                          className="text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-indigo-600"
                        >
                          Performance
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Ghost Icon */}
                  <FiBriefcase className="absolute -bottom-6 -right-6 size-32 opacity-5 text-gray-900 rotate-12" />
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
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" 
              onClick={closeModal} 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white p-10 rounded-[2.5rem] w-full max-w-lg shadow-2xl"
            >
              <h2 className="text-3xl font-black tracking-tight mb-2 text-gray-900">
                {isEditing ? 'Edit Project' : 'New Project'}
              </h2>
              <p className="font-medium italic text-gray-500 mb-8">Set the direction for your team's next objective.</p>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Project Name</label>
                  <input
                    className="w-full p-4 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-600 font-bold transition-all"
                    placeholder="e.g. Apollo Launch" required
                    value={newProject.title}
                    onChange={e => setNewProject({ ...newProject, title: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Objective & Scope</label>
                  <textarea
                    className="w-full p-4 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-600 font-medium leading-relaxed resize-none"
                    placeholder="Describe the goals..." rows={4}
                    value={newProject.description}
                    onChange={e => setNewProject({ ...newProject, description: e.target.value })}
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="submit" className="flex-[2] bg-indigo-600 text-white p-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-100 hover:-translate-y-1 transition-all">
                    {isEditing ? 'Save Changes' : 'Launch Project'}
                  </button>
                  <button type="button" onClick={closeModal} className="flex-1 bg-gray-100 text-gray-500 p-5 rounded-2xl font-black text-sm uppercase tracking-widest">
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
              className={`pointer-events-auto flex items-center gap-3 px-6 py-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] bg-white border-l-4 min-w-[320px] ${
                toast.type === 'error' ? 'border-red-600' : 'border-emerald-600'
              }`}
            >
              {toast.type === 'error' ? (
                <FiXCircle className="text-red-600 text-xl shrink-0" />
              ) : (
                <FiCheckCircle className="text-emerald-600 text-xl shrink-0" />
              )}
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 leading-none mb-1">
                  {toast.type === 'error' ? 'Error Alert' : 'Success'}
                </span>
                <span className="text-sm font-bold text-gray-700">{toast.message}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Projects;