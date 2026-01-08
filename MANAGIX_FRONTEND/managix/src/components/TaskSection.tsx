import React, { useState, useEffect } from 'react';
import api from '../api/axiosInstance';

const scrollbarStyles = `
  .custom-scroll::-webkit-scrollbar { width: 6px; }
  .custom-scroll::-webkit-scrollbar-track { background: transparent; }
  .custom-scroll::-webkit-scrollbar-thumb { background: #e4e4e7; border-radius: 10px; }
`;

const TaskSection = ({ tasks, projectId, milestones, refresh }: any) => {
  const role = localStorage.getItem('userRole');
  const userId = localStorage.getItem('userId');
  
  // Modal Visibility
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  
  // Manager: Create State
  const [isSaving, setIsSaving] = useState(false);
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [employees, setEmployees] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', milestoneId: '', assignedEmployeeId: '' });

  // Employee/Manager: Submission & Review State
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [submission, setSubmission] = useState({ file: null as File | null, comment: '' });

  // 1. Fetch Teams (Manager Only)
  useEffect(() => {
    if (showTaskModal && role === 'Manager') {
      api.get('/teams').then(res => setTeams(res.data)).catch(err => console.error(err));
    }
  }, [showTaskModal, role]);

  // 2. Fetch Members (Manager Only)
  useEffect(() => {
    if (selectedTeamId) {
      setIsLoadingMembers(true);
      api.get(`/teams/${selectedTeamId}/members`)
        .then(res => { setEmployees(res.data); setIsLoadingMembers(false); })
        .catch(() => { setEmployees([]); setIsLoadingMembers(false); });
    }
  }, [selectedTeamId]);

  const filteredEmployees = employees.filter(emp => 
    (emp.fullName || emp.FullName || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ACTION: Create Task (Manager)
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.post('/tasks', {
        projectId,
        ...newTask,
        milestoneId: newTask.milestoneId === "" ? null : newTask.milestoneId
      });
      setShowTaskModal(false);
      refresh();
      setNewTask({ title: '', description: '', milestoneId: '', assignedEmployeeId: '' });
    } catch (err) { alert("Error creating task"); }
    finally { setIsSaving(false); }
  };

  // ACTION: Submit Work (Employee)
  const handleSubmitWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submission.file) return alert("Select a file first");

    const reader = new FileReader();
    reader.readAsDataURL(submission.file);
    reader.onload = async () => {
      const base64File = (reader.result as string).split(',')[1];
      try {
        await api.post(`/tasks/${selectedTaskId}/submit`, {
          fileBase64: base64File,
          fileName: submission.file?.name,
          comment: submission.comment
        }, { headers: { userId: userId } });
        alert("Work Submitted!");
        setShowSubmitModal(false);
        refresh();
      } catch (err) { alert("Upload failed."); }
    };
  };

  // ACTION: Download Work (Manager)
  const handleDownloadWork = async (taskId: string, title: string) => {
    try {
      const res = await api.get(`/tasks/${taskId}/submission`);
      const { fileBase64, fileName } = res.data;
      const link = document.createElement('a');
      link.href = `data:application/octet-stream;base64,${fileBase64}`;
      link.download = fileName || `${title}_work.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) { alert("File not found on server."); }
  };

  // ACTION: Approve/Reject (Manager)
  const handleReview = async (taskId: string, action: 'approve' | 'reject') => {
    const comment = prompt(action === 'approve' ? "Approval comment:" : "Reason for rejection:");
    if (comment === null) return;
    try {
      await api.post(`/tasks/${taskId}/${action}`, { qaComment: comment });
      alert(`Task ${action === 'approve' ? 'Approved' : 'Rejected'}`);
      refresh();
    } catch (err) { alert("Status update failed."); }
  };

  return (
    <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
      <style>{scrollbarStyles}</style>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-black uppercase tracking-tighter">Project Tasks</h2>
        {role === 'Manager' && (
          <button onClick={() => setShowTaskModal(true)} className="bg-black text-white px-8 py-3 rounded-2xl font-bold hover:bg-zinc-800 transition">+ New Task</button>
        )}
      </div>

      <div className="space-y-4">
        {tasks.map((t: any) => {
          const status = t.status || t.Status;
          const taskId = t.taskId || t.TaskId;
          const isAssignedToMe = (t.assignedEmployeeId || t.AssignedEmployeeId) === userId;

          return (
            <div key={taskId} className="p-6 border border-gray-50 rounded-[1.5rem] bg-gray-50/30 flex justify-between items-center">
              <div>
                <h4 className="font-bold text-lg">{t.title || t.Title}</h4>
                <p className="text-sm text-gray-400">{t.description || t.Description}</p>
                {t.qaComment && <p className="text-xs text-red-500 mt-1 italic">Note: {t.qaComment}</p>}
              </div>

              <div className="flex items-center gap-4">
                <span className={`text-[10px] font-black uppercase px-4 py-1 rounded-full ${status === 'Submitted' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{status}</span>
                
                {/* Employee: Submit */}
                {role === 'Employee' && isAssignedToMe && (status === "Pending" || status === "InProgress") && (
                  <button onClick={() => { setSelectedTaskId(taskId); setShowSubmitModal(true); }} className="bg-green-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-green-700">SUBMIT</button>
                )}

                {/* Manager: Review Actions */}
                {role === 'Manager' && status === "Submitted" && (
                  <div className="flex gap-2">
                    <button onClick={() => handleDownloadWork(taskId, t.title)} className="bg-zinc-800 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-black">VIEW</button>
                    <button onClick={() => handleReview(taskId, 'approve')} className="bg-green-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-green-700">✓</button>
                    <button onClick={() => handleReview(taskId, 'reject')} className="bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-red-700">✕</button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL: ASSIGN TASK (MANAGER) */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-[2.5rem] w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="p-8 pb-4 font-black text-3xl">Assign Task</div>
            <div className="flex-1 overflow-y-auto px-8 pb-8 custom-scroll">
              <form onSubmit={handleCreateTask} className="space-y-5">
                <input className="w-full p-4 border-2 border-gray-100 rounded-xl" placeholder="Title" required onChange={e => setNewTask({...newTask, title: e.target.value})} />
                <textarea className="w-full p-4 border-2 border-gray-100 rounded-xl h-24" placeholder="Instructions" onChange={e => setNewTask({...newTask, description: e.target.value})} />
                <div className="grid grid-cols-2 gap-4">
                  <select className="p-4 border-2 border-gray-100 rounded-xl" onChange={e => setNewTask({...newTask, milestoneId: e.target.value})}>
                    <option value="">No Milestone</option>
                    {milestones.map((m: any) => (<option key={m.milestoneId || m.MilestoneId} value={m.milestoneId || m.MilestoneId}>{m.title || m.Title}</option>))}
                  </select>
                  <select className="p-4 border-2 border-gray-100 rounded-xl" required onChange={e => setSelectedTeamId(e.target.value)}>
                    <option value="">Select Team</option>
                    {teams.map(t => (<option key={t.teamId || t.TeamId} value={t.teamId || t.TeamId}>{t.name || t.Name}</option>))}
                  </select>
                </div>
                <select className="w-full p-4 border-2 border-gray-100 rounded-xl font-bold" required disabled={!selectedTeamId} onChange={e => setNewTask({...newTask, assignedEmployeeId: e.target.value})}>
                  <option value="">Select Employee</option>
                  {filteredEmployees.map(emp => (<option key={emp.userId || emp.UserId} value={emp.userId || emp.UserId}>{emp.fullName || emp.FullName}</option>))}
                </select>
                <div className="flex gap-4 pt-4">
                  <button type="submit" className="flex-1 bg-black text-white p-4 rounded-xl font-black">ASSIGN</button>
                  <button type="button" onClick={() => setShowTaskModal(false)} className="flex-1 bg-gray-100 p-4 rounded-xl font-bold">CANCEL</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SUBMIT WORK (EMPLOYEE) */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="bg-white p-10 rounded-[2.5rem] w-full max-w-lg shadow-2xl">
            <h2 className="text-3xl font-black mb-6">Upload Work</h2>
            <form onSubmit={handleSubmitWork} className="space-y-4">
              <input type="file" className="w-full p-4 border-2 border-dashed border-gray-200 rounded-xl" required onChange={e => setSubmission({...submission, file: e.target.files?.[0] || null})} />
              <textarea className="w-full p-4 border-2 border-gray-100 rounded-xl h-24" placeholder="Comments..." onChange={e => setSubmission({...submission, comment: e.target.value})} />
              <div className="flex gap-4">
                <button type="submit" className="flex-1 bg-green-600 text-white p-4 rounded-xl font-black">SUBMIT</button>
                <button type="button" onClick={() => setShowSubmitModal(false)} className="flex-1 bg-gray-100 p-4 rounded-xl font-bold">CLOSE</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskSection;