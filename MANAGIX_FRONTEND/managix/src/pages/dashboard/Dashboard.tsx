// src/pages/Dashboard.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiBriefcase, FiCheckCircle, FiPlus, FiSearch, FiTrash2, FiEdit3, FiChevronRight, FiActivity } from 'react-icons/fi';
import api from '../../api/axiosInstance';
import { projectService } from '../../api/projectService';
import { adminService } from '../../api/adminService';

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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [newProject, setNewProject] = useState({ title: '', description: '' });
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // ✅ Admin: selected project details
  const [selectedProject, setSelectedProject] = useState<any | null>(null);

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
        const response = await api.get('/projects');
        projectData = response.data;
      } else if (role === 'Manager') {
        const response = await api.get(`/projects/manager/${id}`);
        projectData = response.data;
      } else {
        projectData = await projectService.getByEmployee(id);
      }
      setProjects(Array.isArray(projectData) ? projectData : []);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter projects by search term
  const filteredProjects = projects.filter(p =>
    (p.title || p.Title || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    setCurrentProjectId(projectId);
    setShowDeleteModal(true);
  };

  const handleDeleteProject = async () => {
    if (!currentProjectId) return;
    try {
      await projectService.delete(currentProjectId);
      setShowDeleteModal(false);
      showToast("Project deleted successfully");
      fetchDashboardData(userRole, userId);
    } catch (err) {
      showToast("Error deleting project", "error");
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
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-black text-gray-800">Operational Portfolio</h2>
          <span className="bg-indigo-100 text-indigo-700 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest">
            {filteredProjects.length} Instances
          </span>
        </div>

        {filteredProjects.length === 0 ? (
          <div className="text-center py-20 bg-gray-50 rounded-[2.5rem] border-2 border-dashed border-gray-200">
            <FiBriefcase className="mx-auto text-gray-300 mb-4" size={48} />
            <p className="text-gray-400 font-bold italic">No projects matching your search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProjects.map((project) => {
              const pId = project.projectId || project.ProjectId;
              return (
                <motion.div
                  layout
                  key={pId}
                  onClick={() => {
                    if (userRole === 'Admin') fetchProjectDetails(pId);
                    else if (userRole === 'QA') navigate(`/qa/review?projectId=${pId}`);
                    else navigate(`/projects/${pId}`);
                  }}
                  className="group bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 cursor-pointer relative overflow-hidden flex flex-col"
                >
                  <FiBriefcase className="absolute -bottom-4 -right-4 text-gray-50 size-32 group-hover:text-indigo-50 transition-colors pointer-events-none" />
                  <div className="relative flex-1">
                    <div className="flex justify-between items-start mb-6">
                      <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                        (project.status || project.Status) === 'Closed' ? 'bg-gray-100 text-gray-500' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {project.status || project.Status || 'Active'}
                      </div>

                      {userRole === 'Admin' && (
                        <div className="flex gap-2">
                          <button onClick={(e) => openEditModal(e, project)} className="p-2 text-gray-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                            <FiEdit3 size={18} />
                          </button>
                          <button onClick={(e) => confirmDelete(e, pId)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                            <FiTrash2 size={18} />
                          </button>
                        </div>
                      )}
                    </div>

                    <h3 className="text-2xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors mb-4 line-clamp-1">
                      {project.title || project.Title}
                    </h3>
                    <p className="text-gray-500 text-sm font-medium leading-relaxed mb-8 line-clamp-3">
                      {project.description || project.Description || 'No description available.'}
                    </p>
                  </div>

                  <div className="relative pt-6 border-t border-gray-50 flex items-center justify-between">
                    <div className="flex -space-x-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-indigo-600 flex items-center justify-center text-[10px] text-white font-bold">
                          {i === 1 ? 'JD' : i === 2 ? 'AS' : 'RK'}
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center text-indigo-600 font-bold text-sm group-hover:translate-x-1 transition-transform">
                      View Details <FiChevronRight />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
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
                    <ul className="list-disc pl-6">
                      {selectedProject.Tasks.map((t: any) => (
                        <li key={t.TaskId}>{t.Title} - {t.Status}</li>
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

                  <button onClick={() => setShowModal(false)} className="mt-6 bg-indigo-600 text-white py-3 px-6 rounded-2xl font-bold">Close</button>
                </>
              ) : null}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={() => setShowDeleteModal(false)} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">
              <h2 className="text-xl font-bold mb-4">Confirm Delete</h2>
              <p className="mb-6">Are you sure you want to delete this project? This action cannot be undone.</p>
              <div className="flex gap-4">
                <button onClick={handleDeleteProject} className="flex-1 bg-red-600 text-white py-2 rounded-xl font-bold">Delete</button>
                <button onClick={() => setShowDeleteModal(false)} className="flex-1 bg-gray-100 text-gray-600 py-2 rounded-xl font-bold">Cancel</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
