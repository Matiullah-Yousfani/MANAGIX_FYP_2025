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
const TaskCard = ({ task, index, onClick }: { task: any; index: number; onClick: () => void }) => {
  const [submission, setSubmission] = useState<any>(null);
  const isDone = STATUS_MAP[task.Status] === "Done";

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
    if (s === "Approved") return "bg-green-50 text-green-600";
    if (s === "Rejected") return "bg-red-50 text-red-600";
    if (s === "Under Review") return "bg-blue-50 text-blue-600";
    return "bg-gray-50 text-gray-400";
  };

  return (
    <Draggable 
      key={task.TaskId || task.taskId} 
      draggableId={String(task.TaskId || task.taskId)} 
      index={index} 
      isDragDisabled={isDone} 
    >
      {(p) => (
        <div
          ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps}
          onClick={onClick}
          className={`bg-white p-6 rounded-[1.8rem] shadow-sm border border-gray-100 transition-all cursor-pointer group hover:shadow-xl ${isDone ? '' : 'hover:-translate-y-1'}`}
        >
          <h4 className="font-bold text-gray-800 leading-tight group-hover:text-black">{task.Title || task.title}</h4>
          <p className="text-[11px] text-gray-500 mt-3 line-clamp-2">{task.Description || task.description}</p>
          
          {isDone && submission?.fileName && (
             <div className="mt-3 flex items-center gap-2 text-[10px] text-indigo-500 font-bold italic">
                <span className="opacity-50">📎</span> {submission.fileName}
             </div>
          )}

          <div className="mt-5 pt-4 border-t border-gray-50 flex justify-between items-center">
            <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-md ${getBadgeColor()}`}>
              {getStatusDisplay()}
            </span>
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

  useEffect(() => {
    if (isReadOnly) {
      api.get(`/tasks/${task.TaskId || task.taskId}/submission`).then(res => setSubmission(res.data));
    }
  }, [task.TaskId, task.taskId, isReadOnly]);

  const handleSave = async () => {
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
    } catch (err) { alert("Update failed"); } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl">
        <h2 className="text-2xl font-black italic uppercase mb-6">{task.Title || task.title}</h2>
        {isReadOnly ? (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-2xl">
                <p className="text-sm font-bold">Status: <span className="text-indigo-600">{submission?.status || "Loading..."}</span></p>
                <p className="text-xs text-gray-500 mt-2">File: {submission?.fileName}</p>
                <p className="text-xs text-gray-500 italic mt-1">"{submission?.comment}"</p>
            </div>
            {submission?.qaComment && (
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                    <p className="text-[10px] font-black text-amber-600 uppercase">Review Feedback</p>
                    <p className="text-xs mt-1">{submission.qaComment}</p>
                </div>
            )}
            <button onClick={onClose} className="w-full p-4 bg-black text-white rounded-2xl font-bold">Close</button>
          </div>
        ) : (
          <div className="space-y-6">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full p-4 bg-gray-50 rounded-2xl outline-none">
              <option value="Todo">Todo</option>
              <option value="InProgress">In Progress</option>
              <option value="Done">Done (Attach File)</option>
            </select>
            {status === "Done" && (
                <div className="space-y-4">
                    <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="text-xs block" />
                    <textarea placeholder="Comment..." className="w-full p-4 bg-gray-50 rounded-2xl h-24" value={comment} onChange={(e) => setComment(e.target.value)} />
                </div>
            )}
            <div className="flex gap-2">
                <button onClick={onClose} className="flex-1 p-4 font-bold text-gray-400">Cancel</button>
                <button onClick={handleSave} disabled={loading || (status === "Done" && !file)} className="flex-1 p-4 bg-black text-white rounded-2xl font-bold disabled:opacity-30">
                    {loading ? "Saving..." : "Update"}
                </button>
            </div>
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

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    const id = localStorage.getItem('userId');
    fetchUserProjects(role, id);
  }, []);

  const fetchUserProjects = async (role: string | null, id: string | null) => {
    if (!id || !role) {
      setLoadingProjects(false);
      return;
    }
    try {
      setLoadingProjects(true);
      if (role === 'Admin') {
        const res = await api.get('/projects'); 
        setProjects(Array.isArray(res.data) ? res.data : []);
      } 
      else if (role === 'Manager') {
        const res = await api.get(`/projects/manager/${id}`);
        setProjects(Array.isArray(res.data) ? res.data : []);
      }
      else if (role === 'Employee') {
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
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingProjects(false);
    }
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
    if (!destination || destination.droppableId === "Done") return;

    const backendStatus = destination.droppableId === "Todo" ? "Pending" : destination.droppableId;
    setTasks(prev => prev.map(t => String(t.TaskId || t.taskId) === draggableId ? { ...t, Status: backendStatus } : t));
    await taskService.update(draggableId, { Status: backendStatus });
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-4xl font-black italic uppercase tracking-tighter mb-8">Kanban Board</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Project</label>
            <select 
                value={selectedProjectId} 
                onChange={(e) => setSelectedProjectId(e.target.value)} 
                className="p-4 bg-white rounded-3xl shadow-sm outline-none border-none"
                disabled={loadingProjects}
            >
              <option value="">{loadingProjects ? "Loading Projects..." : "Select Project..."}</option>
              {projects.map(p => (
                  <option key={p.projectId || p.ProjectId} value={p.projectId || p.ProjectId}>
                      {p.title || p.Title}
                  </option>
              ))}
            </select>
        </div>

        <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Milestone</label>
            <select 
              value={selectedMilestoneId} 
              disabled={!selectedProjectId}
              onChange={(e) => setSelectedMilestoneId(e.target.value)} 
              className="p-4 bg-white rounded-3xl shadow-sm outline-none border-none disabled:opacity-50"
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

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {KANBAN_COLUMNS.map((col) => (
            <Droppable droppableId={col} key={col}>
              {(p, snap) => (
                <div ref={p.innerRef} {...p.droppableProps} className={`p-4 rounded-[2.5rem] min-h-[600px] transition-colors ${snap.isDraggingOver ? 'bg-indigo-50/50' : 'bg-gray-100/50'}`}>
                  <h3 className="text-[11px] font-black uppercase text-gray-400 mb-6 px-4 tracking-widest">{col}</h3>
                  <div className="space-y-4">
                    {tasks.filter(t => STATUS_MAP[t.Status || t.status] === col).map((t, i) => (
                      <TaskCard key={t.TaskId || t.taskId} task={t} index={i} onClick={() => setSelectedTask(t)} />
                    ))}
                    {p.placeholder}
                  </div>
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>

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