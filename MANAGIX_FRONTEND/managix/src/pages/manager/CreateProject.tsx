import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectService } from '../../api/projectService';
import { milestoneService } from '../../api/milestoneService';
import { 
  FiCalendar, 
  FiDollarSign, 
  FiTrash2, 
  FiPlus, 
  FiChevronRight, 
  FiChevronLeft, 
  FiCheckCircle, 
  FiLayers 
} from 'react-icons/fi';

const CreateProject = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [projectModels, setProjectModels] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    deadline: '',
    budget: 0,
    modelId: '', // This will hold the GUID from the dropdown
    managerId: localStorage.getItem('userId') || ''
  });

  const [milestones, setMilestones] = useState<any[]>([]);
  
  const [currentMilestone, setCurrentMilestone] = useState({
    title: '',
    description: '',
    deadline: '',
    budgetAllocated: 0
  });

  // 1. Fetch models from database on mount
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const data = await projectService.getProjectModels();
        setProjectModels(data);
      } catch (err) {
        console.error("Failed to load project models:", err);
      }
    };
    fetchModels();
  }, []);

  const totalAllocated = milestones.reduce((sum, m) => sum + m.budgetAllocated, 0);
  const remainingBudget = formData.budget - totalAllocated;

  const addMilestoneToList = () => {
    const { title, deadline, budgetAllocated } = currentMilestone;
    if (!title || !deadline) {
      alert("Please fill in Milestone Title and Date");
      return;
    }
    const projectDeadline = new Date(formData.deadline);
    const milestoneDate = new Date(deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (milestoneDate < today) {
      alert("Milestone deadline cannot be in the past.");
      return;
    }
    if (milestoneDate > projectDeadline) {
      alert(`Milestone deadline cannot exceed project deadline (${formData.deadline}).`);
      return;
    }
    if (budgetAllocated > remainingBudget) {
      const excess = budgetAllocated - remainingBudget;
      alert(`Budget Exceeded! Milestone exceeds remaining budget by $${excess.toFixed(2)}.`);
      return;
    }

    setMilestones([...milestones, currentMilestone]);
    setCurrentMilestone({ title: '', description: '', deadline: '', budgetAllocated: 0 });
  };

  const removeMilestone = (index: number) => {
    setMilestones(milestones.filter((_, i) => i !== index));
  };

  const handleLaunchProject = async () => {
    if (milestones.length === 0) {
      alert("Please add at least one milestone before launching.");
      return;
    }
    setLoading(true);
    try {
      // Send formData which now includes the selected modelId
      const newProject = await projectService.create(formData);
      const projectId = newProject.ProjectId || newProject.projectId;
      
      const milestonePromises = milestones.map(m => 
        milestoneService.create({
          projectId: projectId,
          title: m.title,
          description: m.description,
          deadline: m.deadline,
          budgetAllocated: m.budgetAllocated
        })
      );
      await Promise.all(milestonePromises);
      alert("Project Launched Successfully!");
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      alert("Failed to launch project. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-xl mx-auto bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        
        {/* Header Section */}
        <div className="bg-white px-8 pt-8 pb-4">
           <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Create Project</h2>
           <p className="text-gray-500 text-sm mt-1">Fill in the details to get your project started.</p>
        </div>

        {/* Stepper UI */}
        <div className="px-8 mb-8">
          <div className="flex items-center justify-between relative">
             {[1, 2, 3].map((s) => (
               <div key={s} className="flex flex-col items-center z-10">
                 <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                   step >= s ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-gray-100 text-gray-400'
                 }`}>
                   {step > s ? <FiCheckCircle size={16} /> : s}
                 </div>
               </div>
             ))}
             <div className="absolute top-4 left-0 w-full h-[2px] bg-gray-100 -z-0">
               <div 
                 className="h-full bg-indigo-600 transition-all duration-500" 
                 style={{ width: `${(step - 1) * 50}%` }}
               ></div>
             </div>
          </div>
        </div>

        <div className="px-8 pb-10">
          {/* STEP 1: Details & Methodology Selection */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Project Title</label>
                <input 
                  type="text" className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-gray-800 font-medium"
                  placeholder="Enter a catchy title..."
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})} 
                />
              </div>

              {/* PROJECT METHODOLOGY DROPDOWN */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Project Methodology</label>
                <div className="relative">
                  <FiLayers className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
                  <select 
                    className="w-full pl-12 p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-gray-800 font-medium appearance-none"
                    value={formData.modelId}
                    onChange={e => setFormData({...formData, modelId: e.target.value})}
                  >
                    <option value="">Select Methodology...</option>
                    {projectModels.map((model) => (
                      <option key={model.ModelId} value={model.ModelId}>
                        {model.ModelName || model.modelName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Description</label>
                <textarea 
                  rows={4} className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-gray-800"
                  placeholder="What is this project about?"
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                />
              </div>

              <button 
                onClick={() => setStep(2)} 
                disabled={!formData.title || !formData.modelId} 
                className="w-full bg-indigo-600 text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all disabled:opacity-50"
              >
                Continue <FiChevronRight />
              </button>
            </div>
          )}

          {/* STEP 2: Budget & Date */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="grid grid-cols-1 gap-6">
                <div className="relative">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Target Deadline</label>
                  <div className="relative">
                    <FiCalendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="date" className="w-full pl-12 p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={formData.deadline}
                      onChange={e => setFormData({...formData, deadline: e.target.value})} 
                    />
                  </div>
                </div>
                <div className="relative">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Total Budget</label>
                  <div className="relative">
                    <FiDollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="text" inputMode="numeric"
                      className="w-full pl-12 p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-indigo-600"
                      placeholder="0.00"
                      value={formData.budget === 0 ? "" : formData.budget}
                      onChange={e => {
                          const val = e.target.value.replace(/[^0-9.]/g, '');
                          setFormData({...formData, budget: parseFloat(val) || 0})
                      }} 
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setStep(1)} className="flex-1 bg-gray-100 text-gray-600 p-4 rounded-2xl font-bold flex items-center justify-center gap-2"><FiChevronLeft /> Back</button>
                <button onClick={() => setStep(3)} className="flex-1 bg-indigo-600 text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-2">Next Step <FiChevronRight /></button>
              </div>
            </div>
          )}

          {/* STEP 3: Milestones */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100">
                <h3 className="text-indigo-900 font-bold mb-4 flex items-center gap-2"><FiPlus /> New Milestone</h3>
                <div className="space-y-3">
                  <input 
                    className="w-full p-3 bg-white border-none rounded-xl shadow-sm outline-none" placeholder="Milestone Name"
                    value={currentMilestone.title}
                    onChange={e => setCurrentMilestone({...currentMilestone, title: e.target.value})}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input 
                      type="date" className="p-3 bg-white border-none rounded-xl shadow-sm outline-none text-sm"
                      value={currentMilestone.deadline}
                      onChange={e => setCurrentMilestone({...currentMilestone, deadline: e.target.value})}
                    />
                    <input 
                      type="text" className="p-3 bg-white border-none rounded-xl shadow-sm outline-none text-sm font-bold text-indigo-600" placeholder="$ Amount"
                      value={currentMilestone.budgetAllocated === 0 ? "" : currentMilestone.budgetAllocated}
                      onChange={e => {
                          const val = e.target.value.replace(/[^0-9.]/g, '');
                          setCurrentMilestone({...currentMilestone, budgetAllocated: parseFloat(val) || 0})
                      }}
                    />
                  </div>
                  <button onClick={addMilestoneToList} className="w-full bg-indigo-600 text-white p-3 rounded-xl font-bold text-sm shadow-md shadow-indigo-100">+ Add to Project</button>
                </div>
              </div>

              {/* Summary Card */}
              <div className="bg-gray-900 rounded-3xl p-6 text-white shadow-xl">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-gray-400 text-sm">Allocation Status</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${remainingBudget < 0 ? 'bg-red-500' : 'bg-green-500'}`}>
                    {remainingBudget >= 0 ? 'Budget OK' : 'Over Budget'}
                  </span>
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-gray-400 text-xs uppercase tracking-widest">Remaining</p>
                    <p className="text-3xl font-bold">${remainingBudget.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-400 text-xs">Total: ${formData.budget}</p>
                  </div>
                </div>
              </div>

              {/* Milestones List */}
              <div className="space-y-3 max-h-52 overflow-y-auto pr-2 custom-scrollbar">
                {milestones.map((m, i) => (
                  <div key={i} className="flex justify-between items-center p-4 bg-white border border-gray-100 rounded-2xl hover:border-indigo-200 transition-colors group">
                    <div>
                      <p className="font-bold text-gray-800">{m.title}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1"><FiCalendar /> {m.deadline}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-indigo-600">${m.budgetAllocated}</span>
                      <button onClick={() => removeMilestone(i)} className="text-gray-300 hover:text-red-500 transition-colors">
                        <FiTrash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button onClick={() => setStep(2)} className="flex-1 bg-gray-50 text-gray-500 p-4 rounded-2xl font-bold">Back</button>
                <button 
                  onClick={handleLaunchProject}
                  disabled={loading}
                  className="flex-[2] bg-indigo-600 text-white p-4 rounded-2xl font-bold hover:shadow-lg hover:shadow-indigo-200 transition-all disabled:bg-gray-300"
                >
                  {loading ? 'Processing...' : 'Launch Project'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateProject;