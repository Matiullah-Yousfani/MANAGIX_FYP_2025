import React, { useEffect, useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import api from "../../api/axiosInstance";
import { taskService } from "../../api/taskService";
import { milestoneService } from "../../api/milestoneService";

// --- Constants ---
const KANBAN_COLUMNS = ["Todo", "InProgress", "Done"];
const STATUS_MAP: Record<string, string> = {
  Pending: "Todo",
  InProgress: "InProgress",
  Done: "Done",
  Submitted: "Done",
};

// --- Sub-Component: Task Card ---
const TaskCard = ({ task, index, onClick, role }: { task: any; index: number; onClick: () => void; role: string | null }) => {
  const [submission, setSubmission] = useState<any>(null);
  const isDone = STATUS_MAP[task.Status] === "Done";
  const canDrag = role === "Employee" && !isDone;

  useEffect(() => {
    if (isDone) {
      api.get(`/tasks/${task.TaskId || task.taskId}/submission`)
        .then((res) => setSubmission(res.data))
        .catch(() => setSubmission(null));
    }
  }, [task.TaskId, task.taskId, isDone]);

  const getStatusDisplay = () => {
    if (!isDone) return task.Status === "Pending" ? "Todo" : task.Status;
    if (!submission) return "Submitted";
    if (submission.status === "Submitted") return "Under Review";
    return submission.status;
  };

  const getBadgeColor = () => {
    const s = getStatusDisplay();
    if (s === "Approved") return "bg-emerald-100 text-emerald-700";
    if (s === "Rejected") return "bg-red-50 text-red-600";
    if (s === "Under Review") return "bg-indigo-50 text-indigo-600";
    return "bg-gray-100 text-gray-500";
  };

  return (
    <Draggable
      key={task.TaskId || task.taskId}
      draggableId={String(task.TaskId || task.taskId)}
      index={index}
      isDragDisabled={!canDrag}
    >
      {(p) => (
        <div
          ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps}
          onClick={onClick}
          className={`bg-white p-8 rounded-[2.5rem] border border-gray-100 transition-all duration-300 relative overflow-hidden group 
            ${!canDrag ? 'cursor-default' : 'hover:-translate-y-2 hover:shadow-2xl cursor-pointer'}`}
        >
          {/* Decorative Ghost Icon */}
          <div className="absolute -bottom-4 -right-4 size-32 opacity-5 text-indigo-600 pointer-events-none">
            <svg fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          </div>

          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">Task Details</label>
          <h4 className="font-sans font-black text-xl text-gray-900 tracking-tight leading-tight mb-3">
            {task.Title || task.title}
          </h4>
          <p className="text-sm font-medium text-gray-500 leading-relaxed line-clamp-2 mb-6">
            {task.Description || task.description}
          </p>

          {isDone && submission?.fileName && (
            <div className="mb-4 flex items-center gap-2 text-[10px] text-indigo-600 font-black uppercase tracking-wider bg-indigo-50/50 p-2 rounded-xl">
              <span>📎</span> {submission.fileName}
            </div>
          )}

          <div className="flex justify-between items-center">
            <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl ${getBadgeColor()}`}>
              {getStatusDisplay()}
            </span>
            <div className="size-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-300">
                <span className="text-xs">#</span>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
};

// --- Sub-Component: Task Detail Modal ---
const TaskModal = ({ task, onClose, onRefresh }: { task: any, onClose: () => void, onRefresh: () => void }) => {
  const isReadOnly = STATUS_MAP[task.Status] === "Done";
  const [submission, setSubmission] = useState<any>(null);
  const [status, setStatus] = useState(task.Status === "Pending" ? "Todo" : task.Status);
  const [file, setFile] = useState<File | null>(null);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const role = localStorage.getItem('roleName') || localStorage.getItem('userRole');

  useEffect(() => {
    if (isReadOnly) {
      api.get(`/tasks/${task.TaskId || task.taskId}/submission`).then(res => setSubmission(res.data));
    }
  }, [task.TaskId, task.taskId, isReadOnly]);

  const handleSave = async () => {
    if (role !== "Employee") {
      onClose();
      return;
    }

    try {
      setLoading(true);
      const backendStatus = status === "Todo" ? "Pending" : status;
      const taskId = task.TaskId || task.taskId;
      
      await api.put(`/tasks/${taskId}`, { 
          ...task, 
          Status: backendStatus,
          Title: task.Title || task.title,
          Description: task.Description || task.description
      });

      if (status === "Done" && file) {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            const base64 = reader.result!.toString().split(",")[1];
            await api.post(`/tasks/${taskId}/submit`, {
                TaskId: taskId, FileBase64: base64, FileName: file.name, Comment: comment
            }, { headers: { userId: localStorage.getItem("userId") } });
            onRefresh();
        };
      } else {
        onRefresh();
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/60 flex items-center justify-center z-[100] p-6 backdrop-blur-md">
      <div className="bg-white w-full max-w-xl rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
        <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest block mb-2">Task Editor</label>
        <h2 className="text-3xl font-sans font-black text-gray-900 tracking-tight mb-8">
          {task.Title || task.title}
        </h2>

        {isReadOnly ? (
          <div className="space-y-6">
            <div className="p-6 bg-gray-50 rounded-[2rem] border border-gray-100">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Current Status</label>
                <p className="text-lg font-sans font-black text-indigo-600 mb-4">{submission?.status || "Loading..."}</p>
                <p className="text-sm font-medium text-gray-500 mb-1">File: {submission?.fileName}</p>
                <p className="text-sm font-medium text-gray-400">"{submission?.comment}"</p>
            </div>
            {submission?.qaComment && (
                <div className="p-6 bg-emerald-50 rounded-[2rem] border border-emerald-100">
                    <label className="text-[10px] font-black text-emerald-700 uppercase tracking-widest block mb-2">Review Feedback</label>
                    <p className="text-sm font-medium text-emerald-800 leading-relaxed">{submission.qaComment}</p>
                </div>
            )}
            <button onClick={onClose} className="w-full py-5 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-black transition-colors">Close Portal</button>
          </div>
        ) : (
          <div className="space-y-8">
            {role === "Employee" ? (
              <>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Update Progress</label>
                    <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full p-5 bg-gray-50 rounded-2xl outline-none font-medium text-gray-700 focus:ring-2 ring-indigo-500/20 border-none">
                      <option value="Todo">Todo</option>
                      <option value="InProgress">In Progress</option>
                      <option value="Done">Done (Attach File)</option>
                    </select>
                </div>
                
                {status === "Done" && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Deliverable File</label>
                        <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
                        <textarea placeholder="Add a submission comment..." className="w-full p-5 bg-gray-50 rounded-2xl h-32 outline-none font-medium text-gray-700 focus:ring-2 ring-indigo-500/20 border-none resize-none" value={comment} onChange={(e) => setComment(e.target.value)} />
                    </div>
                )}
                
                <div className="flex gap-4 pt-4">
                    <button onClick={onClose} className="flex-1 py-5 font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors">Discard</button>
                    <button onClick={handleSave} disabled={loading || (status === "Done" && !file)} className="flex-2 px-10 py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest disabled:opacity-30 shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all">
                        {loading ? "Processing..." : "Update Task"}
                    </button>
                </div>
              </>
            ) : (
              <div className="space-y-6">
                 <p className="text-gray-500 font-medium leading-relaxed">{task.Description || "No description provided."}</p>
                 <div className="p-6 bg-gray-50 rounded-[2rem] border border-gray-100 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Administrator View Only</div>
                 <button onClick={onClose} className="w-full py-5 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest">Close View</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// --- Main Kanban Component ---
const KanbanBoard = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedMilestoneId, setSelectedMilestoneId] = useState("");
  const [selectedTask, setSelectedTask] = useState<any | null>(null);

  const role = localStorage.getItem('roleName') || localStorage.getItem('userRole');

  useEffect(() => {
    const id = localStorage.getItem('userId');
    fetchUserProjects(role, id);
  }, [role]);

  const fetchUserProjects = async (userRole: string | null, id: string | null) => {
    if (!id || !userRole) {
      setLoadingProjects(false);
      return;
    }
    try {
      setLoadingProjects(true);
      if (userRole === 'Admin') {
        const res = await api.get('/projects'); 
        setProjects(Array.isArray(res.data) ? res.data : []);
      } 
      else if (userRole === 'Manager') {
        const res = await api.get(`/projects/manager/${id}`);
        setProjects(Array.isArray(res.data) ? res.data : []);
      }
      else if (userRole === 'Employee') {
        const tasksRes = await api.get('/tasks/assigned-to-me');
        const assignedTasks = tasksRes.data || [];
        const projectIds = [...new Set(assignedTasks.map((t: any) => t.projectId || t.ProjectId))].filter(Boolean);
        
        if (projectIds.length > 0) {
          const details = await Promise.all(
            projectIds.map(pId => api.get(`/projects/${pId}`).then(r => r.data).catch(() => null))
          );
          setProjects(details.filter(p => p !== null));
        }
      }
    } catch (err) { console.error(err); } finally { setLoadingProjects(false); }
  };

  useEffect(() => {
    if (!selectedProjectId) {
      setMilestones([]);
      setTasks([]);
      return;
    }
    milestoneService.getByProject(selectedProjectId).then(setMilestones);
    setSelectedMilestoneId(""); 
    refreshTasks();
  }, [selectedProjectId]);

  useEffect(() => {
    if (selectedProjectId) refreshTasks();
  }, [selectedMilestoneId]);

  const refreshTasks = async () => {
    if (!selectedProjectId) return;
    const url = selectedMilestoneId 
      ? `/tasks/milestone/${selectedMilestoneId}` 
      : `/tasks/project/${selectedProjectId}`;
    const res = await api.get(url);
    setTasks(res.data);
  };

  const onDragEnd = async (result: any) => {
    const { destination, draggableId } = result;
    if (role !== "Employee") return; 
    if (!destination) return;

    const backendStatus = destination.droppableId === "Todo" ? "Pending" : destination.droppableId;
    setTasks(prev => prev.map(t => String(t.TaskId || t.taskId) === draggableId ? { ...t, Status: backendStatus } : t));
    await taskService.update(draggableId, { Status: backendStatus });
  };

  return (
    <div className="bg-[#F8FAFC] min-h-screen">
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100 px-10 py-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest block mb-1">Overview</label>
           <h1 className="text-4xl font-sans font-black text-gray-900 tracking-tight">Kanban Board</h1>
        </div>
        
        <div className="relative">
          <input 
            type="text" 
            placeholder="Search tasks..." 
            className="w-full md:w-96 p-4 pl-12 bg-gray-50 border-none rounded-2xl focus:ring-2 ring-indigo-500/20 font-medium text-sm transition-all"
          />
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
        </div>
      </header>

      <main className="p-10">
        {/* Metric Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-6">
              <div className="size-16 rounded-[1.5rem] bg-indigo-50 flex items-center justify-center text-indigo-600">
                <svg className="size-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
              </div>
              <div className="flex-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Active Project</label>
                  <select 
                      value={selectedProjectId} 
                      onChange={(e) => setSelectedProjectId(e.target.value)} 
                      className="w-full bg-transparent border-none p-0 font-sans font-black text-xl text-gray-900 outline-none cursor-pointer"
                      disabled={loadingProjects}
                  >
                    <option value="">{loadingProjects ? "Loading..." : "Select Project"}</option>
                    {projects.map(p => (
                        <option key={p.projectId || p.ProjectId} value={p.projectId || p.ProjectId}>
                            {p.title || p.Title}
                        </option>
                    ))}
                  </select>
              </div>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-6">
              <div className="size-16 rounded-[1.5rem] bg-emerald-50 flex items-center justify-center text-emerald-600">
                <svg className="size-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div className="flex-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Project Milestone</label>
                  <select 
                    value={selectedMilestoneId} 
                    disabled={!selectedProjectId}
                    onChange={(e) => setSelectedMilestoneId(e.target.value)} 
                    className="w-full bg-transparent border-none p-0 font-sans font-black text-xl text-gray-900 outline-none cursor-pointer disabled:opacity-30"
                  >
                    <option value="">All Milestone Tasks</option>
                    {milestones.map(m => (
                        <option key={m.milestoneId || m.MilestoneId} value={m.milestoneId || m.MilestoneId}>
                            {m.title || m.Title}
                        </option>
                    ))}
                  </select>
              </div>
          </div>
        </div>

        {/* Board */}
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {KANBAN_COLUMNS.map((col) => (
              <Droppable droppableId={col} key={col}>
                {(p, snap) => (
                  <div ref={p.innerRef} {...p.droppableProps} 
                    className={`p-6 rounded-[2.5rem] min-h-[700px] transition-all duration-500 
                    ${snap.isDraggingOver ? 'bg-indigo-50/40 ring-2 ring-indigo-500/10' : 'bg-gray-100/50'}`}>
                    
                    <div className="flex items-center justify-between mb-8 px-4">
                        <h3 className="text-[11px] font-black uppercase text-gray-400 tracking-[0.2em]">{col}</h3>
                        <span className="text-[10px] font-black text-indigo-600 bg-white size-6 flex items-center justify-center rounded-lg shadow-sm border border-gray-100">
                            {tasks.filter(t => STATUS_MAP[t.Status || t.status] === col).length}
                        </span>
                    </div>

                    <div className="space-y-6">
                      {tasks.filter(t => STATUS_MAP[t.Status || t.status] === col).map((t, i) => (
                        <TaskCard key={t.TaskId || t.taskId} task={t} index={i} onClick={() => setSelectedTask(t)} role={role} />
                      ))}
                      {p.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>
      </main>

      {selectedTask && (
        <TaskModal 
          task={selectedTask} 
          onClose={() => setSelectedTask(null)} 
          onRefresh={() => { setSelectedTask(null); refreshTasks(); }} 
        />
      )}
    </div>
  );
};

export default KanbanBoard;