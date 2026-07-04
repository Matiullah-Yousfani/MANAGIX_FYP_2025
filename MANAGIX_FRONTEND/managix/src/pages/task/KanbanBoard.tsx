import React, { useEffect, useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import api from "../../api/axiosInstance";
import { taskService } from "../../api/taskService";
import { milestoneService } from "../../api/milestoneService";
import { projectService } from "../../api/projectService";
import { teamService } from "../../api/teamService";
import ConfirmDeleteModal from "../../components/ConfirmDeleteModal";

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

const priorityNorm = (p?: string) => {
  const v = (p || "Medium").trim().toLowerCase();
  if (v === "high") return "High";
  if (v === "low") return "Low";
  return "Medium";
};

const priorityStyle = (p: string) => {
  if (p === "High") return "bg-danger-soft text-danger border-danger/25";
  if (p === "Low") return "bg-surface-2 text-fg-muted border-line";
  return "bg-warning-soft text-warning border-warning/25";
};

// --- Sub-Component: Task Card ---
const TaskCard = ({
  task,
  index,
  onClick,
  role,
  assigneeName,
}: {
  task: any;
  index: number;
  onClick: () => void;
  role: string | null;
  assigneeName?: string;
}) => {
  const priority = priorityNorm(task.Priority || task.priority);
  const isHigh = priority === "High";
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
    if (s === "Approved") return "bg-success-soft text-success";
    if (s === "Rejected") return "bg-danger-soft text-danger";
    if (s === "Submitted for review" || s === "Under Review") return "bg-warning-soft text-warning";
    return "bg-surface-2 text-fg-muted";
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
          className={`bg-surface-2 p-8 rounded-xl border transition-all duration-300 relative overflow-hidden group
            ${isHigh ? 'border-danger/25 ring-1 ring-danger/25' : 'border-line'}
            ${!canDrag ? 'cursor-default' : 'hover:-translate-y-2 hover:shadow-e3 cursor-pointer'}`}
        >
          {/* Decorative Ghost Icon */}
          <div className="absolute -bottom-4 -right-4 size-32 opacity-5 text-primary pointer-events-none">
            <svg fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          </div>

          <label className="text-[10px] font-bold uppercase tracking-widest text-fg-subtle block mb-2">Task Details</label>
          <h4 className="font-sans font-bold text-xl text-fg tracking-tight leading-tight mb-3">
            {task.Title || task.title}
          </h4>
          <p className="text-sm font-medium text-fg-muted leading-relaxed line-clamp-2 mb-6">
            {task.Description || task.description}
          </p>

          {isDone && submissionFile && (
            <div className="mb-4 flex items-center gap-2 text-[10px] text-primary font-bold uppercase tracking-wider bg-primary-soft p-2 rounded-lg">
              <span>📎</span> {submissionFile}
            </div>
          )}

          <div className="flex flex-wrap gap-2 mb-4">
            <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg border ${priorityStyle(priority)}`}>
              {priority}
            </span>
          </div>

          <div className="flex justify-between items-center gap-2">
            <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg ${getBadgeColor()}`}>
              {getStatusDisplay()}
            </span>
            <span className="text-[10px] font-bold text-fg-muted truncate max-w-[45%]" title={assigneeName}>
              {assigneeName || "Unassigned"}
            </span>
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
  const [priority, setPriority] = useState(
    priorityNorm(task.Priority || task.priority)
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
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
    setPriority(priorityNorm(task.Priority || task.priority));
  }, [task.TaskId, task.taskId, task.AssignedEmployeeId, task.assignedEmployeeId, task.Priority, task.priority]);

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
      const payload: Parameters<typeof taskService.update>[1] = {
        title: titleStr,
        description: descStr,
        priority,
      };
      if (!assigneeId) payload.clearAssignee = true;
      else payload.assignedEmployeeId = assigneeId;
      await taskService.update(String(taskId), payload);
      onRefresh();
    } catch (e: any) {
      alert(e?.response?.data?.message || e?.message || "Could not update assignee.");
    } finally {
      setLoading(false);
    }
  };

  const memberLabel = (m: any) => m.FullName || m.fullName || m.Email || m.email || "Member";

  const taskTitle = task.Title || task.title;
  const assigneeForDelete = members.find(
    (m) => String(m.Id ?? m.UserId ?? m.userId ?? m.id) === assigneeId
  );
  const assigneeName = assigneeForDelete ? memberLabel(assigneeForDelete) : "Unassigned";

  const confirmDeleteTask = async () => {
    const taskId = task.TaskId || task.taskId;
    setDeleteBusy(true);
    try {
      await taskService.delete(String(taskId));
      setShowDeleteConfirm(false);
      onRefresh();
      onClose();
    } catch (e: any) {
      alert(e?.response?.data?.message || "Could not delete task.");
    } finally {
      setDeleteBusy(false);
    }
  };

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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-6 backdrop-blur-md">
      <div className="bg-surface w-full max-w-xl rounded-xl p-10 shadow-e3 relative overflow-hidden border border-line">
        <label className="text-[10px] font-bold text-primary uppercase tracking-widest block mb-2">Task Editor</label>
        <h2 className="text-2xl font-sans font-bold text-fg tracking-tight mb-8">
          {task.Title || task.title}
        </h2>

        {isReadOnly ? (
          <div className="space-y-6">
            <div className="p-6 bg-surface-2 rounded-xl border border-line">
                <label className="text-[10px] font-bold text-fg-subtle uppercase tracking-widest block mb-2">Current Status</label>
                <p className="text-lg font-sans font-bold text-primary mb-4">
                  {taskStatus === "Approved" || submission?.status === "Approved"
                    ? "Approved"
                    : submission?.status === "Rejected"
                      ? "Rejected"
                      : submission?.status === "Submitted" || !submission?.status
                        ? "Submitted for review"
                        : submission?.status ?? taskStatus}
                </p>
                <p className="text-sm font-medium text-fg-muted mb-1">
                  File: {submission?.fileName ?? submission?.FileName ?? "—"}
                </p>
                <p className="text-sm font-medium text-fg-subtle">"{submission?.comment}"</p>
            </div>
            {submission?.qaComment && (
                <div className="p-6 bg-success-soft rounded-xl border border-success/25">
                    <label className="text-[10px] font-bold text-success uppercase tracking-widest block mb-2">Review Feedback</label>
                    <p className="text-sm font-medium text-success leading-relaxed">{submission.qaComment}</p>
                </div>
            )}
            <button onClick={onClose} className="w-full py-5 bg-primary text-primary-fg rounded-lg font-bold uppercase tracking-widest hover:bg-primary-hover transition-colors">Close Portal</button>
          </div>
        ) : (
          <div className="space-y-8">
            {isEmployee ? (
              <>
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-fg-subtle uppercase tracking-widest ml-4">Update Progress</label>
                    <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full p-5 bg-surface-2 rounded-lg outline-none font-medium text-fg-muted focus:ring-2 focus:ring-primary/25 focus:border-primary border border-line">
                      <option value="Todo">Todo</option>
                      <option value="InProgress">In Progress</option>
                      <option value="Done">Done (Attach File)</option>
                    </select>
                </div>

                {status === "Done" && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                        <label className="text-[10px] font-bold text-fg-subtle uppercase tracking-widest ml-4">Deliverable File</label>
                        <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="block w-full text-sm text-fg-muted file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:uppercase file:bg-primary-soft file:text-primary hover:file:bg-surface-3" />
                        <textarea placeholder="Add a submission comment..." className="w-full p-5 bg-surface-2 rounded-lg h-32 outline-none font-medium text-fg-muted focus:ring-2 focus:ring-primary/25 focus:border-primary border border-line resize-none" value={comment} onChange={(e) => setComment(e.target.value)} />
                    </div>
                )}

                <div className="flex gap-4 pt-4">
                    <button onClick={onClose} className="flex-1 py-5 font-bold text-fg-subtle uppercase tracking-widest hover:text-fg-muted transition-colors">Discard</button>
                    <button onClick={handleSave} disabled={loading || (status === "Done" && !file)} className="flex-2 px-10 py-5 bg-primary text-primary-fg rounded-lg font-bold uppercase tracking-widest disabled:opacity-30 shadow-e2 hover:bg-primary-hover transition-all">
                        {loading ? "Processing..." : "Update Task"}
                    </button>
                </div>
              </>
            ) : isManagerOrAdmin ? (
              <div className="space-y-6">
                <p className="text-fg-muted font-medium leading-relaxed">
                  {task.Description || task.description || "No description provided."}
                </p>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-fg-subtle uppercase tracking-widest ml-4">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full p-5 bg-surface-2 rounded-lg outline-none font-medium text-fg-muted focus:ring-2 focus:ring-primary/25 focus:border-primary border border-line"
                  >
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-fg-subtle uppercase tracking-widest ml-4">
                    Assign to team member
                  </label>
                  {membersError && (
                    <p className="text-sm text-warning bg-warning-soft rounded-lg px-4 py-3 border border-warning/25">
                      {membersError}
                    </p>
                  )}
                  <select
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                    disabled={membersLoading || (!!membersError && members.length === 0)}
                    className="w-full p-5 bg-surface-2 rounded-lg outline-none font-medium text-fg-muted focus:ring-2 focus:ring-primary/25 focus:border-primary border border-line disabled:opacity-50"
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
                    <p className="text-xs text-fg-subtle font-medium px-1">Loading team roster…</p>
                  )}
                </div>

                <p className="text-xs text-fg-subtle font-medium px-1 leading-relaxed">
                  Assign manually here. For AI task allocation, use Milestones → Smart Task Allocation.
                </p>

                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={loading || deleteBusy}
                  className="w-full py-3 text-danger bg-danger-soft rounded-lg font-bold uppercase tracking-widest text-xs hover:bg-danger/10 transition-all"
                >
                  Delete task
                </button>

                <button
                  type="button"
                  onClick={handleManagerSaveAssignment}
                  disabled={loading || membersLoading}
                  className="w-full py-4 bg-primary text-primary-fg rounded-lg font-bold uppercase tracking-widest text-sm disabled:opacity-40 shadow-e2 hover:bg-primary-hover transition-all"
                >
                  {loading ? "Saving…" : "Save assignment"}
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-4 text-fg-subtle font-bold uppercase tracking-widest text-sm hover:text-fg-muted transition-colors"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <p className="text-fg-muted font-medium leading-relaxed">
                  {task.Description || task.description || "No description provided."}
                </p>
                <div className="p-6 bg-surface-2 rounded-xl border border-line text-center text-[10px] font-bold text-fg-subtle uppercase tracking-widest">
                  View only for your role
                </div>
                <button
                  onClick={onClose}
                  className="w-full py-5 bg-primary text-primary-fg rounded-lg font-bold uppercase tracking-widest"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmDeleteModal
        open={showDeleteConfirm}
        message={`Delete task "${taskTitle}"? You won't be able to revert this!`}
        details={[
          { label: "Task", value: taskTitle || "—" },
          { label: "Assigned to", value: assigneeName },
        ]}
        warning={
          assigneeName !== "Unassigned"
            ? `This task is assigned to ${assigneeName}. Deleting it will remove their assignment.`
            : undefined
        }
        busy={deleteBusy}
        onConfirm={confirmDeleteTask}
        onCancel={() => !deleteBusy && setShowDeleteConfirm(false)}
      />
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
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const role = localStorage.getItem('roleName') || localStorage.getItem('userRole');

  useEffect(() => {
    api.get('/users')
      .then((res) => {
        const map: Record<string, string> = {};
        (res.data || []).forEach((u: any) => {
          const id = String(u.userId ?? u.UserId ?? '');
          if (id) map[id] = u.fullName ?? u.FullName ?? 'User';
        });
        setUserNames(map);
      })
      .catch(() => setUserNames({}));
  }, []);

  const resolveAssignee = (t: any) => {
    const id = t.assignedEmployeeId ?? t.AssignedEmployeeId;
    return id ? userNames[String(id)] || 'Assigned' : 'Unassigned';
  };

  const visibleTasks = tasks.filter((t) => {
    const pr = priorityNorm(t.Priority || t.priority);
    if (priorityFilter !== 'all' && pr.toLowerCase() !== priorityFilter) return false;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    const title = String(t.Title || t.title || '').toLowerCase();
    const desc = String(t.Description || t.description || '').toLowerCase();
    const assignee = resolveAssignee(t).toLowerCase();
    return title.includes(q) || desc.includes(q) || assignee.includes(q);
  });

  useEffect(() => {
    const id = localStorage.getItem('userId');
    const effectiveRole =
      localStorage.getItem('roleName') || localStorage.getItem('userRole') || role;
    fetchUserProjects(effectiveRole, id);
  }, [role]);

  const isQaRole = (r: string | null) => {
    const n = (r || '').toLowerCase();
    return n === 'qa' || n.includes('quality');
  };

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
      else if (isQaRole(userRole)) {
        const data = await projectService.getByEmployee(id);
        setProjects(Array.isArray(data) ? data : []);
      }
      else if (userRole === 'Employee') {
        const data = await projectService.getByEmployee(id);
        if (Array.isArray(data) && data.length > 0) {
          setProjects(data);
        } else {
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
    <div className="bg-bg min-h-screen">
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 bg-surface border-b border-line px-10 py-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <label className="text-[10px] font-bold text-primary uppercase tracking-widest block mb-1">Overview</label>
           <h1 className="text-2xl font-sans font-bold text-fg tracking-tight">Kanban Board</h1>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative">
            <input
              type="search"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full md:w-72 p-4 pl-12 bg-surface-2 border border-line rounded-lg focus:ring-2 focus:ring-primary/25 focus:border-primary font-medium text-sm transition-all"
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-fg-subtle">🔍</span>
          </div>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="p-4 bg-surface-2 border border-line rounded-lg font-bold text-sm"
          >
            <option value="all">All priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </header>

      <main className="p-10">
        {/* Metric Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div className="bg-surface p-8 rounded-xl shadow-e1 border border-line flex items-center gap-6">
              <div className="size-16 rounded-xl bg-primary-soft flex items-center justify-center text-primary">
                <svg className="size-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
              </div>
              <div className="flex-1">
                  <label className="text-[10px] font-bold text-fg-subtle uppercase tracking-widest block mb-1">Active Project</label>
                  <select
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      className="w-full bg-transparent border-none p-0 font-sans font-bold text-xl text-fg outline-none cursor-pointer"
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

          <div className="bg-surface p-8 rounded-xl shadow-e1 border border-line flex items-center gap-6">
              <div className="size-16 rounded-xl bg-success-soft flex items-center justify-center text-success">
                <svg className="size-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div className="flex-1">
                  <label className="text-[10px] font-bold text-fg-subtle uppercase tracking-widest block mb-1">Project Milestone</label>
                  <select
                    value={selectedMilestoneId}
                    disabled={!selectedProjectId}
                    onChange={(e) => setSelectedMilestoneId(e.target.value)}
                    className="w-full bg-transparent border-none p-0 font-sans font-bold text-xl text-fg outline-none cursor-pointer disabled:opacity-30"
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
                    className={`p-6 rounded-xl min-h-[700px] transition-all duration-500
                    ${snap.isDraggingOver ? 'bg-primary-soft ring-2 ring-primary/25' : 'bg-surface-2'}`}>

                    <div className="flex items-center justify-between mb-8 px-4">
                        <h3 className="text-[11px] font-bold uppercase text-fg-subtle tracking-[0.2em]">{col}</h3>
                        <span className="text-[10px] font-bold text-primary bg-surface size-6 flex items-center justify-center rounded-lg shadow-e1 border border-line">
                            {visibleTasks.filter(t => STATUS_MAP[t.Status || t.status] === col).length}
                        </span>
                    </div>

                    <div className="space-y-6">
                      {visibleTasks.filter(t => STATUS_MAP[t.Status || t.status] === col).map((t, i) => (
                        <TaskCard
                          key={t.TaskId || t.taskId}
                          task={t}
                          index={i}
                          onClick={() => setSelectedTask(t)}
                          role={role}
                          assigneeName={resolveAssignee(t)}
                        />
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