import React, { useEffect, useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import api from "../../api/axiosInstance";
import { taskService } from "../../api/taskService";
import { milestoneService } from "../../api/milestoneService";
import { projectService } from "../../api/projectService";
import { teamService } from "../../api/teamService";

// --- Constants ---
const KANBAN_COLUMNS = ["Todo", "InProgress", "Done"];
/** Maps backend task.status → Kanban column id */
const STATUS_MAP: Record<string, string> = {
  Todo: "Todo",
  Pending: "Todo",
  InProgress: "InProgress",
  Done: "Done",
  Submitted: "Done",
  Approved: "Done",
};

// --- Sub-Component: Task Card ---
const TaskCard = ({ task, index, onClick, role }: { task: any; index: number; onClick: () => void; role: string | null }) => {
  const roleNorm = (role || "").toLowerCase();
  const [submission, setSubmission] = useState<any>(null);
  const [submissionLoading, setSubmissionLoading] = useState(false);
  const st = task.Status || task.status;
  const isDone =
    st === "Approved" || st === "Done" || STATUS_MAP[st] === "Done";
  const canDrag = roleNorm === "employee" && !isDone && st !== "Approved";

  useEffect(() => {
    if (!isDone) {
      setSubmission(null);
      setSubmissionLoading(false);
      return;
    }
    const tid = task.TaskId || task.taskId;
    setSubmissionLoading(true);
    api.get(`/tasks/${tid}/submission`)
      .then((res) => setSubmission(res.data))
      .catch(() => setSubmission(null))
      .finally(() => setSubmissionLoading(false));
  }, [task.TaskId, task.taskId, isDone, task.submissionLoadedAt]);

  const submissionStatus = submission?.status ?? submission?.Status;
  const submissionFile =
    submission?.fileName ?? submission?.FileName ??
    (submission?.filePath ? String(submission.filePath).split(/[/\\]/).pop() : null);

  const getStatusDisplay = () => {
    if (st === "Approved") return "Approved";
    if (!isDone) return st === "Pending" ? "Todo" : st;
    if (submissionLoading) return "Submitted for review";
    if (!submission || submissionStatus === "Submitted") return "Submitted for review";
    if (submissionStatus === "Approved") return "Approved";
    if (submissionStatus === "Rejected") return "Rejected";
    return submissionStatus || "Submitted for review";
  };

  const getBadgeColor = () => {
    const s = getStatusDisplay();
    if (s === "Approved") return "bg-emerald-100 text-emerald-700";
    if (s === "Rejected") return "bg-red-50 text-red-600";
    if (s === "Submitted for review" || s === "Under Review") return "bg-amber-50 text-amber-700";
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

          {isDone && submissionFile && (
            <div className="mb-4 flex items-center gap-2 text-[10px] text-indigo-600 font-black uppercase tracking-wider bg-indigo-50/50 p-2 rounded-xl">
              <span>📎</span> {submissionFile}
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
const TaskModal = ({
  task,
  projectId,
  onClose,
  onRefresh,
}: {
  task: any;
  projectId: string;
  onClose: () => void;
  onRefresh: () => void;
}) => {
  const taskStatus = task.Status || task.status;
  const isReadOnly =
    taskStatus === "Approved" ||
    taskStatus === "Done" ||
    STATUS_MAP[taskStatus] === "Done";
  const [submission, setSubmission] = useState<any>(null);
  const [status, setStatus] = useState(
    taskStatus === "Pending" || taskStatus === "Todo" ? "Todo" : taskStatus === "InProgress" ? "InProgress" : "Todo"
  );
  const [file, setFile] = useState<File | null>(null);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [assigneeId, setAssigneeId] = useState("");
  const roleRaw = localStorage.getItem("roleName") || localStorage.getItem("userRole") || "";
  const roleNorm = roleRaw.toLowerCase();
  const isEmployee = roleNorm === "employee";
  const isManagerOrAdmin = roleNorm === "manager" || roleNorm === "admin";

  useEffect(() => {
    if (isReadOnly) {
      api.get(`/tasks/${task.TaskId || task.taskId}/submission`).then(res => setSubmission(res.data));
    }
  }, [task.TaskId, task.taskId, isReadOnly]);

  useEffect(() => {
    const id = task.AssignedEmployeeId ?? task.assignedEmployeeId;
    setAssigneeId(id ? String(id) : "");
  }, [task.TaskId, task.taskId, task.AssignedEmployeeId, task.assignedEmployeeId]);

  useEffect(() => {
    if (!isManagerOrAdmin || !projectId) return;
    let cancelled = false;
    (async () => {
      setMembersLoading(true);
      setMembersError(null);
      try {
        const team = await projectService.getTeamByProjectId(projectId);
        const tid = team?.TeamId ?? team?.teamId;
        if (!tid) {
          if (!cancelled) {
            setMembers([]);
            setMembersError("No team linked to this project. Assign a team on Team Setup first.");
          }
          return;
        }
        const mem = await teamService.getTeamMembers(String(tid));
        if (!cancelled) setMembers(Array.isArray(mem) ? mem : []);
      } catch {
        if (!cancelled) {
          setMembers([]);
          setMembersError("Could not load this project’s team. Check Team Setup.");
        }
      } finally {
        if (!cancelled) setMembersLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isManagerOrAdmin, projectId, task.TaskId, task.taskId]);

  const handleManagerSaveAssignment = async () => {
    try {
      setLoading(true);
      const taskId = task.TaskId || task.taskId;
      const titleStr = task.Title || task.title;
      const descStr = task.Description || task.description;
      if (!assigneeId) {
        await taskService.update(String(taskId), {
          title: titleStr,
          description: descStr,
          clearAssignee: true,
        });
      } else {
        await taskService.update(String(taskId), {
          title: titleStr,
          description: descStr,
          assignedEmployeeId: assigneeId,
        });
      }
      onRefresh();
    } catch (e: any) {
      alert(e?.response?.data?.message || e?.message || "Could not update assignee.");
    } finally {
      setLoading(false);
    }
  };

  const memberLabel = (m: any) => m.FullName || m.fullName || m.Email || m.email || "Member";

  const handleSave = async () => {
    if (!isEmployee) {
      onClose();
      return;
    }

    try {
      setLoading(true);
      const taskId = task.TaskId || task.taskId;
      const prior = task.Status || task.status || "";
      const titleStr = task.Title || task.title;
      const descStr = task.Description || task.description;

      if (status === "Done" && file) {
        if (prior === "Todo" || prior === "Pending") {
          await taskService.update(taskId, {
            title: titleStr,
            description: descStr,
            status: "InProgress",
          });
        }
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
          const base64 = reader.result!.toString().split(",")[1];
          await taskService.submit(taskId, {
            fileBase64: base64,
            fileName: file.name,
            comment: comment || undefined,
          });
          onRefresh();
          onClose();
        };
        return;
      } else {
        if (status === "Done") {
          alert("Attach a deliverable file to move this task to Done.");
          setLoading(false);
          return;
        }
        const backendStatus = status === "Todo" ? "Todo" : "InProgress";
        await taskService.update(taskId, {
          title: titleStr,
          description: descStr,
          status: backendStatus,
        });
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
                <p className="text-lg font-sans font-black text-indigo-600 mb-4">
                  {taskStatus === "Approved" || submission?.status === "Approved"
                    ? "Approved"
                    : submission?.status === "Rejected"
                      ? "Rejected"
                      : submission?.status === "Submitted" || !submission?.status
                        ? "Submitted for review"
                        : submission?.status ?? taskStatus}
                </p>
                <p className="text-sm font-medium text-gray-500 mb-1">
                  File: {submission?.fileName ?? submission?.FileName ?? "—"}
                </p>
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
            {isEmployee ? (
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
            ) : isManagerOrAdmin ? (
              <div className="space-y-6">
                <p className="text-gray-500 font-medium leading-relaxed">
                  {task.Description || task.description || "No description provided."}
                </p>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">
                    Assign to team member
                  </label>
                  {membersError && (
                    <p className="text-sm text-amber-700 bg-amber-50 rounded-xl px-4 py-3 border border-amber-100">
                      {membersError}
                    </p>
                  )}
                  <select
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                    disabled={membersLoading || (!!membersError && members.length === 0)}
                    className="w-full p-5 bg-gray-50 rounded-2xl outline-none font-medium text-gray-700 focus:ring-2 ring-indigo-500/20 border-none disabled:opacity-50"
                  >
                    <option value="">Unassigned</option>
                    {members.map((m) => {
                      const id = String(m.Id ?? m.UserId ?? m.userId ?? m.id ?? "");
                      return (
                        <option key={id} value={id}>
                          {memberLabel(m)}
                        </option>
                      );
                    })}
                  </select>
                  {membersLoading && (
                    <p className="text-xs text-gray-400 font-medium px-1">Loading team roster…</p>
                  )}
                </div>

                <p className="text-xs text-gray-400 font-medium px-1 leading-relaxed">
                  Assign manually here. For AI suggestions across all open tasks, use Team Hub → Smart Task Allocation.
                </p>

                <button
                  type="button"
                  onClick={handleManagerSaveAssignment}
                  disabled={loading || membersLoading}
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm disabled:opacity-40 shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all"
                >
                  {loading ? "Saving…" : "Save assignment"}
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-4 text-gray-400 font-black uppercase tracking-widest text-sm hover:text-gray-600 transition-colors"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <p className="text-gray-500 font-medium leading-relaxed">
                  {task.Description || task.description || "No description provided."}
                </p>
                <div className="p-6 bg-gray-50 rounded-[2rem] border border-gray-100 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  View only for your role
                </div>
                <button
                  onClick={onClose}
                  className="w-full py-5 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest"
                >
                  Close
                </button>
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
    const roleNorm = (role || "").toLowerCase();
    if (roleNorm === "employee") {
      const all = await taskService.getAssignedToMe();
      const list = Array.isArray(all) ? all : [];
      const pid = String(selectedProjectId);
      let filtered = list.filter(
        (t: any) => String(t.projectId ?? t.ProjectId) === pid
      );
      if (selectedMilestoneId) {
        const mid = String(selectedMilestoneId);
        filtered = filtered.filter(
          (t: any) => String(t.milestoneId ?? t.MilestoneId) === mid
        );
      }
      setTasks(filtered);
      return;
    }
    const url = selectedMilestoneId
      ? `/tasks/milestone/${selectedMilestoneId}`
      : `/tasks/project/${selectedProjectId}`;
    const res = await api.get(url);
    setTasks(res.data);
  };

  const onDragEnd = async (result: any) => {
    const { destination, draggableId } = result;
    const r = (role || "").toLowerCase();
    if (r !== "employee") return; 
    if (!destination) return;

    const backendStatus =
      destination.droppableId === "Todo"
        ? "Todo"
        : destination.droppableId === "InProgress"
          ? "InProgress"
          : "Done";
    setTasks((prev) =>
      prev.map((t) =>
        String(t.TaskId || t.taskId) === draggableId
          ? { ...t, Status: backendStatus, status: backendStatus }
          : t
      )
    );
    try {
      await taskService.update(draggableId, { status: backendStatus });
    } catch {
      refreshTasks();
    }
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
          projectId={selectedProjectId}
          onClose={() => setSelectedTask(null)}
          onRefresh={() => {
            setSelectedTask(null);
            refreshTasks();
          }}
        />
      )}
    </div>
  );
};

export default KanbanBoard;