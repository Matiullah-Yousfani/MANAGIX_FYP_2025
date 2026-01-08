import React, { useEffect, useState } from 'react';
import api from '../../api/axiosInstance';
import { milestoneService } from '../../api/milestoneService';
import { 
  FiCalendar, FiDollarSign, FiTrash2, FiEdit3, 
  FiCheckCircle, FiClock, FiAlertCircle, FiPlus, FiSearch 
} from 'react-icons/fi';

const Milestones = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [milestones, setMilestones] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<any>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    deadline: '',
    budgetAllocated: 0
  });

  const userId = localStorage.getItem('userId');

  const selectedProject = projects.find(p => (p.projectId || p.ProjectId) === selectedProjectId);

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
      alert("Milestone deadline cannot be in the past.");
      return false;
    }
    if (milestoneDate > projectDeadline) {
      alert(`Milestone deadline cannot exceed project deadline (${projectDeadline.toLocaleDateString()}).`);
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
      alert(`Insufficient Project Budget! \nRemaining: $${remainingBudget.toLocaleString()} \nRequested: $${data.budgetAllocated.toLocaleString()}`);
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
    } catch (err) {
      alert("Error creating milestone");
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateMilestone(formData, true)) return;
    const mId = editingMilestone?.milestoneId || editingMilestone?.MilestoneId;
    if (!mId) return alert("Invalid Milestone ID");
    try {
      await milestoneService.update(mId, {
        ...formData,
        status: editingMilestone.status || editingMilestone.Status || "Pending"
      });
      setShowEditModal(false);
      fetchMilestones(selectedProjectId);
    } catch (err) {
      alert("Error updating milestone");
    }
  };

  const handleDelete = async (milestone: any) => {
    const id = milestone?.milestoneId || milestone?.MilestoneId;
    if (!id || !window.confirm("Are you sure?")) return;
    try {
      await milestoneService.delete(id);
      fetchMilestones(selectedProjectId);
    } catch (err) {
      alert("Delete failed");
    }
  };

  const handleClose = async (milestone: any) => {
    const id = milestone?.milestoneId || milestone?.MilestoneId;
    if (!id) return;
    try {
      await milestoneService.close(id, { comment: "Completed" });
      fetchMilestones(selectedProjectId);
    } catch (err) {
      alert("Error closing milestone");
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
    if (s === 'completed') return 'bg-green-100 text-green-700 border-green-200';
    if (s === 'pending') return 'bg-amber-100 text-amber-700 border-amber-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-screen bg-gray-50/50">
      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Sidebar */}
        <div className="w-full md:w-72 flex flex-col gap-4">
          <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex flex-col max-h-[calc(100vh-100px)]">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[2px] mb-4 px-2">Projects</h3>
            
            <div className="relative mb-4 px-2">
              <FiSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text"
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
              />
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-1" style={{ maxHeight: '600px' }}>
              {filteredProjects.length > 0 ? (
                filteredProjects.map(p => {
                  const pId = p.projectId || p.ProjectId;
                  return (
                    <button
                      key={pId}
                      onClick={() => fetchMilestones(pId)}
                      className={`w-full text-left px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                        selectedProjectId === pId 
                        ? 'bg-black text-white shadow-lg' 
                        : 'text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {p.title || p.Title}
                    </button>
                  );
                })
              ) : (
                <p className="text-center text-xs text-gray-400 py-4">No projects found</p>
              )}
            </div>
          </div>
        </div>

        {/* List Content */}
        <div className="flex-1">
          {selectedProjectId ? (
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
                <div>
                  <h2 className="text-xl font-black text-gray-900">Project Milestones</h2>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">{selectedProject?.title || selectedProject?.Title}</p>
                </div>
                <button
                  onClick={() => { resetForm(); setShowCreateModal(true); }}
                  className="bg-indigo-600 text-white px-5 py-3 rounded-2xl text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                >
                  <FiPlus /> New Milestone
                </button>
              </div>

              <div className="grid gap-4">
                {milestones.length === 0 && !loading && (
                  <div className="text-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-gray-100 text-gray-400">
                    No milestones found.
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
                    <div key={mId} className={`bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-between group transition-all ${isCompleted ? 'bg-gray-50/50' : ''}`}>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className={`font-bold ${isCompleted ? 'text-gray-500' : 'text-gray-900'}`}>{title}</h4>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${getStatusStyle(status)}`}>
                            {isCompleted && <FiCheckCircle size={10} />}
                            {status}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-400 font-medium">
                           <span className="flex items-center gap-1"><FiCalendar /> {deadline ? new Date(deadline).toLocaleDateString() : 'No date'}</span>
                           <span className={`flex items-center gap-1 font-bold ${isCompleted ? 'text-gray-400' : 'text-indigo-600'}`}><FiDollarSign /> {budget.toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {!isCompleted ? (
                          <>
                            <button onClick={() => handleClose(m)} className="p-3 text-green-600 hover:bg-green-50 rounded-xl transition-colors" title="Mark as Completed"><FiCheckCircle size={18} /></button>
                            <button onClick={() => openEditModal(m)} className="p-3 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"><FiEdit3 size={18} /></button>
                            <button onClick={() => handleDelete(m)} className="p-3 text-red-400 hover:bg-red-50 rounded-xl transition-colors"><FiTrash2 size={18} /></button>
                          </>
                        ) : (
                          <div className="px-4 py-2 bg-green-50 text-green-600 rounded-2xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2 border border-green-100">
                             <FiCheckCircle /> Milestone Completed
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="h-96 flex flex-col items-center justify-center bg-white rounded-[3rem] border-2 border-dashed border-gray-100 text-gray-300">
              <FiClock size={48} className="mb-4 opacity-20" />
              <p className="font-bold tracking-tight">Select a project to manage</p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-8 rounded-[2.5rem] w-full max-w-md shadow-2xl">
            <h2 className="text-2xl font-black mb-6">{showCreateModal ? 'New Milestone' : 'Edit Milestone'}</h2>
            <form onSubmit={showCreateModal ? handleCreate : handleUpdate} className="space-y-4">
              <input
                className="w-full p-4 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-600 font-bold"
                placeholder="Title" required
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
              />
              <textarea
                className="w-full p-4 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-600"
                placeholder="Description" rows={3}
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date" className="w-full p-4 bg-gray-50 border-none rounded-2xl outline-none text-sm"
                  required value={formData.deadline}
                  onChange={e => setFormData({ ...formData, deadline: e.target.value })}
                />
                <input
                  type="text" className="w-full p-4 bg-gray-50 border-none rounded-2xl outline-none font-bold text-indigo-600"
                  placeholder="Budget"
                  value={formData.budgetAllocated || ""}
                  onChange={e => setFormData({ ...formData, budgetAllocated: parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0 })}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-[2] bg-indigo-600 text-white p-4 rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:scale-[1.02] transition-transform">
                  Save
                </button>
                <button type="button" onClick={() => { setShowCreateModal(false); setShowEditModal(false); }} className="flex-1 bg-gray-100 text-gray-500 p-4 rounded-2xl font-bold">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default Milestones;