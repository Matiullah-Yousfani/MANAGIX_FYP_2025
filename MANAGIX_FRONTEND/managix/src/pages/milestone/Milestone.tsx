import React, { useEffect, useState } from 'react';
import api from '../../api/axiosInstance';
import { milestoneService } from '../../api/milestoneService';
import { motion, AnimatePresence } from 'framer-motion'; // Added Framer Motion
import { 
  FiCalendar, FiDollarSign, FiTrash2, FiEdit3, 
  FiCheckCircle, FiClock, FiPlus, FiSearch, FiFlag, FiXCircle, FiInfo 
} from 'react-icons/fi';

const Milestones = () => {
  // --- Existing State ---
  const [projects, setProjects] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [milestones, setMilestones] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<any>(null);
  
  // --- Toast State ---
  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'error' | 'success' }[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    deadline: '',
    budgetAllocated: 0
  });

  const userId = localStorage.getItem('userId');
  const selectedProject = projects.find(p => (p.projectId || p.ProjectId) === selectedProjectId);

  // --- Toast Helper ---
  const addToast = (message: string, type: 'error' | 'success' = 'error') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  useEffect(() => {
    fetchManagerProjects();
  }, []);

  const filteredProjects = projects.filter(p => {
    const title = (p.title || p.Title || "").toLowerCase();
    return title.includes(searchTerm.toLowerCase());
  });

  const fetchManagerProjects = async () => {
    try {
      const res = await api.get(`/projects/manager/${userId}`);
      setProjects(res.data);
    } catch (err) {
      console.error("Error fetching projects", err);
    }
  };

  const fetchMilestones = async (projId: string) => {
    setSelectedProjectId(projId);
    setLoading(true);
    try {
      const data = await milestoneService.getByProject(projId);
      setMilestones(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching milestones", err);
      setMilestones([]);
    } finally {
      setLoading(false);
    }
  };

  const validateMilestone = (data: any, isEditing = false) => {
    if (!selectedProject) return false;
    const projectDeadlineStr = selectedProject.deadline || selectedProject.Deadline;
    const projectTotalBudget = selectedProject.budget || selectedProject.Budget || 0;
    const projectDeadline = new Date(projectDeadlineStr);
    const milestoneDate = new Date(data.deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (milestoneDate < today) {
      addToast("Milestone deadline cannot be in the past.");
      return false;
    }
    if (milestoneDate > projectDeadline) {
      addToast(`Deadline cannot exceed project end (${projectDeadline.toLocaleDateString()}).`);
      return false;
    }

    const otherMilestonesTotal = milestones
      .filter(m => {
        if (!isEditing) return true;
        const mId = m.milestoneId || m.MilestoneId;
        const eId = editingMilestone?.milestoneId || editingMilestone?.MilestoneId;
        return mId !== eId;
      })
      .reduce((sum, m) => sum + (m.budgetAllocated ?? m.BudgetAllocated ?? 0), 0);

    const remainingBudget = projectTotalBudget - otherMilestonesTotal;
    if (data.budgetAllocated > remainingBudget) {
      addToast(`Insufficient Budget! Remaining: $${remainingBudget.toLocaleString()}`);
      return false;
    }
    return true;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateMilestone(formData, false)) return;
    try {
      await milestoneService.create({ projectId: selectedProjectId, ...formData });
      setShowCreateModal(false);
      resetForm();
      fetchMilestones(selectedProjectId);
      addToast("Milestone created successfully", "success");
    } catch (err) {
      addToast("Error creating milestone");
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateMilestone(formData, true)) return;
    const mId = editingMilestone?.milestoneId || editingMilestone?.MilestoneId;
    if (!mId) return addToast("Invalid Milestone ID");
    try {
      await milestoneService.update(mId, {
        ...formData,
        status: editingMilestone.status || editingMilestone.Status || "Pending"
      });
      setShowEditModal(false);
      fetchMilestones(selectedProjectId);
      addToast("Milestone updated", "success");
    } catch (err) {
      addToast("Error updating milestone");
    }
  };

  const handleDelete = async (milestone: any) => {
    const id = milestone?.milestoneId || milestone?.MilestoneId;
    if (!id || !window.confirm("Are you sure?")) return;
    try {
      await milestoneService.delete(id);
      fetchMilestones(selectedProjectId);
      addToast("Milestone deleted", "success");
    } catch (err) {
      addToast("Delete failed");
    }
  };

  const handleClose = async (milestone: any) => {
    const id = milestone?.milestoneId || milestone?.MilestoneId;
    if (!id) return;
    try {
      await milestoneService.close(id, { comment: "Completed" });
      fetchMilestones(selectedProjectId);
      addToast("Milestone marked as completed", "success");
    } catch (err) {
      addToast("Error closing milestone");
    }
  };

  const openEditModal = (m: any) => {
    const deadlineVal = m.deadline || m.Deadline || "";
    setEditingMilestone(m);
    setFormData({
      title: m.title || m.Title || "",
      description: m.description || m.Description || "",
      deadline: deadlineVal ? deadlineVal.split('T')[0] : "",
      budgetAllocated: m.budgetAllocated ?? m.BudgetAllocated ?? 0
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({ title: '', description: '', deadline: '', budgetAllocated: 0 });
  };

  const getStatusStyle = (status: string) => {
    const s = status?.toLowerCase();
    if (s === 'completed') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    if (s === 'pending') return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-gray-100 text-gray-500 border-gray-200';
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
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-600/20 transition-all leading-relaxed"
          />
        </div>
      </header>

      <main className="p-8 max-w-7xl mx-auto flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <aside className="w-full md:w-72">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm sticky top-24">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 block">
              Available Projects
            </label>
            
            <div className="space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
              {filteredProjects.map(p => {
                const pId = p.projectId || p.ProjectId;
                const isActive = selectedProjectId === pId;
                return (
                  <button
                    key={pId}
                    onClick={() => fetchMilestones(pId)}
                    className={`w-full text-left px-5 py-4 rounded-2xl text-sm font-bold transition-all transform active:scale-95 ${
                      isActive 
                      ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200' 
                      : 'text-gray-500 hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    {p.title || p.Title}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <section className="flex-1">
          {selectedProjectId ? (
            <div className="space-y-8">
              <div className="relative overflow-hidden bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm">
                <div className="relative z-10 flex justify-between items-end">
                  <div>
                    <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2 block">Active Project</label>
                    <h2 className="text-4xl font-black text-gray-900 tracking-tight mb-2">{selectedProject?.title || selectedProject?.Title}</h2>
                    <p className="font-medium italic text-gray-500">Manage and track individual project milestones and budget allocation.</p>
                  </div>
                  <button
                    onClick={() => { resetForm(); setShowCreateModal(true); }}
                    className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 hover:-translate-y-1"
                  >
                    <FiPlus strokeWidth={3} /> Add Milestone
                  </button>
                </div>
                <FiFlag className="absolute -bottom-4 -right-4 size-32 opacity-5 text-gray-900 rotate-12" />
              </div>

              <div className="grid gap-6">
                {milestones.length === 0 && !loading && (
                  <div className="text-center py-24 bg-white rounded-[2.5rem] border border-dashed border-gray-200 text-gray-400">
                    <FiClock size={40} className="mx-auto mb-4 opacity-20" />
                    <p className="font-black uppercase tracking-widest text-[10px]">No milestones defined yet</p>
                  </div>
                )}
                
                {milestones.map((m, index) => {
                  const mId = m.milestoneId || m.MilestoneId || index;
                  const title = m.title || m.Title || "Untitled";
                  const budget = m.budgetAllocated ?? m.BudgetAllocated ?? 0;
                  const deadline = m.deadline || m.Deadline;
                  const status = m.status || m.Status || "Pending";
                  const isCompleted = status.toLowerCase() === 'completed';

                  return (
                    <div 
                      key={mId} 
                      className={`group bg-white p-8 rounded-[2.5rem] border border-gray-100 flex items-center justify-between transition-all hover:-translate-y-2 hover:shadow-2xl ${isCompleted ? 'opacity-75' : ''}`}
                    >
                      <div className="flex items-center gap-6">
                        <div className={`p-4 rounded-3xl ${isCompleted ? 'bg-emerald-50' : 'bg-indigo-50'}`}>
                          <FiFlag className={isCompleted ? 'text-emerald-600' : 'text-indigo-600'} size={24} />
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="text-lg font-black text-gray-900 tracking-tight">{title}</h4>
                            <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border ${getStatusStyle(status)}`}>
                              {status}
                            </span>
                          </div>
                          <div className="flex items-center gap-6 text-sm text-gray-500 leading-relaxed font-medium">
                            <span className="flex items-center gap-2"><FiCalendar className="text-indigo-600" /> {deadline ? new Date(deadline).toLocaleDateString() : 'N/A'}</span>
                            <span className="flex items-center gap-2 font-black text-gray-900">
                              <FiDollarSign className="text-emerald-600" /> 
                              {budget.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {!isCompleted ? (
                          <>
                            <button onClick={() => handleClose(m)} className="p-4 text-emerald-600 hover:bg-emerald-50 rounded-2xl transition-colors"><FiCheckCircle size={20} /></button>
                            <button onClick={() => openEditModal(m)} className="p-4 text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-colors"><FiEdit3 size={20} /></button>
                            <button onClick={() => handleDelete(m)} className="p-4 text-red-600 hover:bg-red-50 rounded-2xl transition-colors"><FiTrash2 size={20} /></button>
                          </>
                        ) : (
                          <div className="px-6 py-3 bg-emerald-50 text-emerald-700 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-emerald-100">
                             <FiCheckCircle strokeWidth={3} /> Finalized
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="h-[60vh] flex flex-col items-center justify-center bg-white rounded-[2.5rem] border border-gray-100 text-gray-400 shadow-sm relative overflow-hidden">
              <FiClock size={64} className="mb-6 opacity-10" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em]">Select a project from the sidebar</p>
              <FiFlag className="absolute -bottom-10 -right-10 size-64 opacity-[0.02] -rotate-12" />
            </div>
          )}
        </section>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {(showCreateModal || showEditModal) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" 
              onClick={() => { setShowCreateModal(false); setShowEditModal(false); }} 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white p-10 rounded-[2.5rem] w-full max-w-lg shadow-2xl"
            >
              <h2 className="text-3xl font-black tracking-tight mb-8 text-gray-900">
                {showCreateModal ? 'New Milestone' : 'Edit Milestone'}
              </h2>
              <form onSubmit={showCreateModal ? handleCreate : handleUpdate} className="space-y-5">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Milestone Title</label>
                  <input
                    className="w-full p-4 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-600 font-bold"
                    placeholder="Enter title..." required
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Description</label>
                  <textarea
                    className="w-full p-4 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-600 font-medium"
                    placeholder="What needs to be achieved?" rows={3}
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Deadline</label>
                    <input
                      type="date" className="w-full p-4 bg-gray-50 border-none rounded-2xl outline-none font-bold text-sm"
                      required value={formData.deadline}
                      onChange={e => setFormData({ ...formData, deadline: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Allocated Budget</label>
                    <input
                      type="text" className="w-full p-4 bg-gray-50 border-none rounded-2xl outline-none font-black text-indigo-600"
                      placeholder="$ 0.00"
                      value={formData.budgetAllocated || ""}
                      onChange={e => setFormData({ ...formData, budgetAllocated: parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0 })}
                    />
                  </div>
                </div>
                <div className="flex gap-4 pt-6">
                  <button type="submit" className="flex-[2] bg-indigo-600 text-white p-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-100 transition-all">
                    Save Changes
                  </button>
                  <button type="button" onClick={() => { setShowCreateModal(false); setShowEditModal(false); }} className="flex-1 bg-gray-100 text-gray-500 p-5 rounded-2xl font-black text-sm uppercase tracking-widest">
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification Container */}
      <div className="fixed bottom-8 right-8 z-[100] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className={`pointer-events-auto flex items-center gap-3 px-6 py-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] bg-white border-l-4 min-w-[300px] ${
                toast.type === 'error' ? 'border-red-500' : 'border-emerald-500'
              }`}
            >
              {toast.type === 'error' ? (
                <FiXCircle className="text-red-500 text-xl shrink-0" />
              ) : (
                <FiCheckCircle className="text-emerald-500 text-xl shrink-0" />
              )}
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                  {toast.type === 'error' ? 'Validation Error' : 'Success'}
                </span>
                <span className="text-sm font-bold text-gray-700">{toast.message}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default Milestones;