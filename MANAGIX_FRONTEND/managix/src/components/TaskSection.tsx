import React, { useState, useEffect } from 'react';
import api from '../api/axiosInstance';
import { FiBriefcase, FiPlus, FiUploadCloud } from 'react-icons/fi';

const scrollbarStyles = `
  .custom-scroll::-webkit-scrollbar { width: 6px; }
  .custom-scroll::-webkit-scrollbar-track { background: transparent; }
  .custom-scroll::-webkit-scrollbar-thumb { background: #e0e7ff; border-radius: 10px; }
`;

const TaskSection = ({ tasks, projectId, milestones, refresh }: any) => {
  const role = localStorage.getItem('userRole');
  const userId = localStorage.getItem('userId');

  const EMPLOYEE_ROLE_ID = "A08BB9EB-B222-4B4E-965F-980F88540E97".toUpperCase();

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', milestoneId: '', assignedEmployeeId: '' });
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [submission, setSubmission] = useState({ file: null as File | null, comment: '' });
  const [projectTeam, setProjectTeam] = useState<any | null>(null);

  useEffect(() => {
    if (!showTaskModal || role !== 'Manager') return;

    const fetchProjectTeam = async () => {
      try {
        const res = await api.get(`/projects/${projectId}/team`);
        setProjectTeam(res.data);
        if (res.data?.TeamId) setSelectedTeamId(res.data.TeamId);
      } catch {
        setProjectTeam(null);
        // Fetch all teams if no project team
        api.get('/teams').then(res => setTeams(res.data)).catch(err => console.error(err));
      }
    };

    fetchProjectTeam();
  }, [showTaskModal]);

  useEffect(() => {
    const fetchAndFilterMembers = async () => {
      if (!selectedTeamId) return;
      setIsLoadingMembers(true);
      try {
        const [membersRes, allUsersRes] = await Promise.all([
          api.get(`/teams/${selectedTeamId}/members`),
          api.get('/users')
        ]);
        const teamMembers = membersRes.data || [];
        const allUsers = allUsersRes.data || [];
        const filtered = teamMembers.filter((member: any) => {
          const userInGlobalList = allUsers.find((u: any) =>
            (u.Id || u.UserId || u.id) === (member.UserId || member.userId)
          );
          if (!userInGlobalList) return false;
          const rawRoleId = userInGlobalList.RoleId || userInGlobalList.roleId || userInGlobalList.RoleID;
          return String(rawRoleId).toUpperCase() === EMPLOYEE_ROLE_ID;
        });
        setEmployees(filtered);
      } catch (err) {
        console.error("Error filtering members:", err);
        setEmployees([]);
      } finally {
        setIsLoadingMembers(false);
      }
    };
    fetchAndFilterMembers();
  }, [selectedTeamId]);

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
      setSelectedTeamId('');
    } catch (err) { alert("Error creating task"); }
    finally { setIsSaving(false); }
  };

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

  return (
    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 relative overflow-hidden">
      <style>{scrollbarStyles}</style>
      <FiBriefcase className="absolute -bottom-4 -right-4 size-32 text-gray-50 pointer-events-none" />
      
      <div className="flex justify-between items-center mb-8 relative z-10">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Workflow</span>
          <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Project Tasks</h2>
        </div>
        {role === 'Manager' && (
          <button 
            onClick={() => setShowTaskModal(true)} 
            className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2"
          >
            <FiPlus /> New Task
          </button>
        )}
      </div>

      {/* Tasks list */}
      <div className="space-y-4 relative z-10">
        {tasks.length === 0 ? (
          <div className="border-2 border-dashed border-gray-200 rounded-[2rem] p-12 flex flex-col items-center justify-center text-gray-400">
            <FiBriefcase className="size-12 mb-4 opacity-20" />
            <p className="font-medium">No tasks assigned yet.</p>
          </div>
        ) : (
          tasks.map((t: any) => {
            const status = t.status || t.Status;
            const taskId = t.taskId || t.TaskId;
            const isAssignedToMe = (t.assignedEmployeeId || t.AssignedEmployeeId) === userId;
            
            return (
              <div key={taskId} className="group p-6 border border-gray-50 rounded-[1.5rem] bg-gray-50/50 flex justify-between items-center hover:bg-white hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 text-lg line-clamp-1">{t.title || t.Title}</h4>
                  <p className="text-sm text-gray-500 font-medium line-clamp-2 max-w-xl">{t.description || t.Description}</p>
                  {t.qaComment && <p className="text-xs text-red-500 mt-2 font-medium italic bg-red-50 inline-block px-2 py-1 rounded-lg">Note: {t.qaComment}</p>}
                </div>
                
                <div className="flex items-center gap-4">
                  <span className={`text-[10px] font-black uppercase px-4 py-1.5 rounded-full tracking-tighter ${
                    status === 'Submitted' 
                    ? 'bg-emerald-100 text-emerald-700' 
                    : 'bg-indigo-100 text-indigo-700'
                  }`}>
                    {status}
                  </span>
                  
                  {role === 'Employee' && isAssignedToMe && (status === "Pending" || status === "InProgress") && (
                    <button 
                      onClick={() => { setSelectedTaskId(taskId); setShowSubmitModal(true); }} 
                      className="bg-emerald-600 text-white px-5 py-2 rounded-xl text-xs font-black hover:bg-emerald-700 transition-colors flex items-center gap-2"
                    >
                      <FiUploadCloud /> SUBMIT
                    </button>
                  )}
                  
                  {role === 'Manager' && status === "Submitted" && (
                    <button 
                      onClick={() => handleDownloadWork(taskId, t.title)} 
                      className="bg-gray-900 text-white px-5 py-2 rounded-xl text-xs font-black hover:bg-black transition-colors"
                    >
                      VIEW WORK
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Task Creation Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 pb-4 font-black text-gray-900 text-3xl">Assign Task</div>
            <div className="flex-1 overflow-y-auto px-8 pb-8 custom-scroll">
              <form onSubmit={handleCreateTask} className="space-y-4">
                
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Task Title</label>
                  <input className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white transition-all rounded-2xl outline-none" placeholder="What needs to be done?" required onChange={e => setNewTask({...newTask, title: e.target.value})} />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Instructions</label>
                  <textarea className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white transition-all rounded-2xl h-32 outline-none" placeholder="Provide detailed steps..." onChange={e => setNewTask({...newTask, description: e.target.value})} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Milestone</label>
                    <select className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl outline-none appearance-none" onChange={e => setNewTask({...newTask, milestoneId: e.target.value})}>
                      <option value="">None</option>
                      {milestones.map((m: any) => (<option key={m.milestoneId || m.MilestoneId} value={m.milestoneId || m.MilestoneId}>{m.title || m.Title}</option>))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Team</label>

                    {projectTeam?.TeamId ? (
                      <input
                        type="text"
                        className="w-full p-4 bg-gray-100 border-2 border-gray-200 rounded-2xl outline-none font-bold cursor-not-allowed"
                        value={projectTeam.Name}
                        disabled
                      />
                    ) : (
                      <select
                        className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl outline-none appearance-none"
                        required
                        value={selectedTeamId}
                        onChange={e => setSelectedTeamId(e.target.value)}
                      >
                        <option value="">Select Team</option>
                        {teams.map(t => (
                          <option key={t.teamId || t.TeamId} value={t.teamId || t.TeamId}>
                            {t.name || t.Name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Assignee</label>
                  <select 
                    className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl outline-none font-bold" 
                    required 
                    disabled={!selectedTeamId || isLoadingMembers} 
                    value={newTask.assignedEmployeeId}
                    onChange={e => setNewTask({...newTask, assignedEmployeeId: e.target.value})}
                  >
                    <option value="">{isLoadingMembers ? "Loading..." : "Select Employee"}</option>
                    {employees.map(emp => (
                      <option key={emp.UserId || emp.userId} value={emp.UserId || emp.userId}>
                        {emp.FullName || emp.fullName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-4 pt-6">
                  <button type="submit" disabled={isSaving || !newTask.assignedEmployeeId} className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black disabled:bg-gray-200 transition-all hover:bg-indigo-700 shadow-lg shadow-indigo-100 uppercase tracking-widest">
                    {isSaving ? "Creating..." : "Assign Task"}
                  </button>
                  <button type="button" onClick={() => setShowTaskModal(false)} className="flex-1 bg-gray-100 text-gray-800 py-4 rounded-2xl font-black hover:bg-gray-200">CANCEL</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Submission Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md flex items-center justify-center p-6 z-50">
          <div className="bg-white p-10 rounded-[2.5rem] w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-90 duration-300">
            <h2 className="text-3xl font-black text-gray-900 mb-6">Upload Work</h2>
            <form onSubmit={handleSubmitWork} className="space-y-4">
              <div className="group relative border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:border-emerald-500 transition-colors">
                <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" required onChange={e => setSubmission({...submission, file: e.target.files?.[0] || null})} />
                <FiUploadCloud className="mx-auto size-10 text-gray-300 group-hover:text-emerald-500 mb-2" />
                <p className="text-sm font-bold text-gray-500">{submission.file ? submission.file.name : "Click or drag file to upload"}</p>
              </div>
              <textarea className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl h-24 outline-none" placeholder="Any comments for the reviewer?" onChange={e => setSubmission({...submission, comment: e.target.value})} />
              <div className="flex gap-4 pt-4">
                <button type="submit" className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-black hover:bg-emerald-700 shadow-lg shadow-emerald-100 uppercase tracking-widest">SUBMIT WORK</button>
                <button type="button" onClick={() => setShowSubmitModal(false)} className="flex-1 bg-gray-100 text-gray-800 py-4 rounded-2xl font-black hover:bg-gray-200">CLOSE</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskSection;
