import React, { useEffect, useState } from "react";
import { toast, Badge, Select } from '../../components/ui';
import { FiSearch, FiPaperclip, FiInbox } from "react-icons/fi";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import api from "../../api/axiosInstance";
import { taskService } from "../../api/taskService";
import { milestoneService } from "../../api/milestoneService";
import { projectService } from "../../api/projectService";
import { teamService } from "../../api/teamService";
import ConfirmDeleteModal from "../../components/ConfirmDeleteModal";
import PriorityBadge, { normalizePriority } from "../../components/PriorityBadge";

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

const priorityNorm = normalizePriority;

/** Per-column visual identity (accent color, header dot, count pill). */
const COLUMN_META: Record<string, { label: string; dot: string; bar: string; pill: string; over: string }> = {
  Todo:       { label: 'To Do',       dot: 'bg-slate-400',   bar: 'bg-slate-300',   pill: 'bg-slate-100 text-slate-600',   over: 'bg-slate-100/70 ring-slate-400/20' },
  InProgress: { label: 'In Progress', dot: 'bg-indigo-500',  bar: 'bg-indigo-500',  pill: 'bg-indigo-100 text-indigo-700',  over: 'bg-indigo-50/60 ring-indigo-500/20' },
  Done:       { label: 'Done',        dot: 'bg-emerald-500', bar: 'bg-emerald-500', pill: 'bg-emerald-100 text-emerald-700', over: 'bg-emerald-50/60 ring-emerald-500/20' },
};

/** Left accent border on a task card, by priority. */
const PRIORITY_ACCENT: Record<string, string> = {
  High: 'border-l-red-500',
  Medium: 'border-l-amber-400',
  Low: 'border-l-emerald-500',
};

const initialsOf = (name?: string) =>
  (name || '')
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';

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

  const getStatusTone = (): 'emerald' | 'red' | 'amber' | 'gray' => {
    const s = getStatusDisplay();
    if (s === "Approved") return "emerald";
    if (s === "Rejected") return "red";
    if (s === "Submitted for review" || s === "Under Review") return "amber";
    return "gray";
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
          className={`bg-white p-5 rounded-xl border border-gray-200/70 border-l-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-200 group
            ${PRIORITY_ACCENT[priority] || 'border-l-slate-300'}
            ${p.isDragging ? 'shadow-xl rotate-1' : ''}
            ${!canDrag ? 'cursor-default' : 'hover:-translate-y-0.5 hover:shadow-lg cursor-pointer'}`}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <h4 className="font-extrabold text-[15px] text-gray-900 tracking-tight leading-snug line-clamp-2">
              {task.Title || task.title}
            </h4>
            <PriorityBadge priority={priority} className="shrink-0" />
          </div>

          <p className="text-xs font-medium text-gray-500 leading-relaxed line-clamp-2 mb-4">
            {task.Description || task.description}
          </p>

          {isDone && submissionFile && (
            <div className="mb-3 flex items-center gap-1.5 text-[10px] text-indigo-600 font-bold bg-indigo-50/60 px-2 py-1.5 rounded-lg">
              <FiPaperclip className="shrink-0" size={11} />
              <span className="truncate">{submissionFile}</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2 min-w-0" title={assigneeName}>
              <span className="grid place-items-center size-6 shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-[9px] font-bold">
                {initialsOf(assigneeName)}
              </span>
              <span className="text-[11px] font-semibold text-gray-500 truncate">
                {assigneeName || "Unassigned"}
              </span>
            </div>
            <Badge tone={getStatusTone()} className="shrink-0 normal-case">{getStatusDisplay()}</Badge>
          </div>
        </div>
      )}
    </Draggable>
  );
};

// --- Sub-Component: Task Detail Modal ---
const TaskDetailsPanel: React.FC<{ task: any; milestoneTitle?: string; assigneeName?: string }> = ({
  task,
  milestoneTitle,
  assigneeName,
}) => {
  const status = task.Status || task.status || 'Todo';
  const priority = priorityNorm(task.Priority || task.priority);
  const created = task.CreatedAt || task.createdAt;
  const deadline = task.Deadline || task.deadline;
  const description = task.Description || task.description;

  return (
    <div className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-200/70 mb-4">
      <div>
        <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest block mb-1">Description</label>
        <p className="text-sm font-medium text-gray-700 leading-relaxed whitespace-pre-wrap">
          {description || 'No description provided.'}
        </p>
      </div>
      {milestoneTitle && (
        <div>
          <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest block mb-1">User Story / Milestone</label>
          <p className="text-sm font-bold text-indigo-700">{milestoneTitle}</p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest block mb-1">Assigned To</label>
          <p className="text-sm font-bold text-gray-800">{assigneeName || 'Unassigned'}</p>
        </div>
        <div>
          <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest block mb-1">Priority</label>
          <PriorityBadge priority={priority} />
        </div>
        <div>
          <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest block mb-1">Created</label>
          <p className="text-sm font-medium text-gray-600">
            {created ? new Date(created).toLocaleDateString() : '—'}
          </p>
        </div>
        <div>
          <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest block mb-1">Due Date</label>
          <p className="text-sm font-medium text-gray-600">
            {deadline ? new Date(deadline).toLocaleDateString() : 'Not set'}
          </p>
        </div>
        <div className="col-span-2">
          <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest block mb-1">Current Status</label>
          <p className="text-sm font-extrabold text-indigo-600">{status === 'Pending' ? 'Todo' : status}</p>
        </div>
      </div>
    </div>
  );
};

const TaskModal = ({
  task,
  projectId,
  milestoneTitle,
  assigneeName,
  onClose,
  onRefresh,
}: {
  task: any;
  projectId: string;
  milestoneTitle?: string;
  assigneeName?: string;
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
  const [deadline, setDeadline] = useState(
    (task.Deadline || task.deadline || '').split('T')[0] || ''
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
    setDeadline((task.Deadline || task.deadline || '').split('T')[0] || '');
  }, [task.TaskId, task.taskId, task.AssignedEmployeeId, task.assignedEmployeeId, task.Priority, task.priority, task.Deadline, task.deadline]);

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
        deadline: deadline || undefined,
      };
      if (!assigneeId) payload.clearAssignee = true;
      else payload.assignedEmployeeId = assigneeId;
      await taskService.update(String(taskId), payload);
      onRefresh();
    } catch (e: any) {
      toast(e?.response?.data?.message || e?.message || "Could not update assignee.");
    } finally {
      setLoading(false);
    }
  };

  const memberLabel = (m: any) => m.FullName || m.fullName || m.Email || m.email || "Member";

  const taskTitle = task.Title || task.title;
  const assigneeForDelete = members.find(
    (m) => String(m.Id ?? m.UserId ?? m.userId ?? m.id) === assigneeId
  );
  const deleteAssigneeName = assigneeForDelete ? memberLabel(assigneeForDelete) : "Unassigned";

  const confirmDeleteTask = async () => {
    const taskId = task.TaskId || task.taskId;
    setDeleteBusy(true);
    try {
      await taskService.delete(String(taskId));
      setShowDeleteConfirm(false);
      onRefresh();
      onClose();
    } catch (e: any) {
      toast(e?.response?.data?.message || "Could not delete task.");
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
          toast("Attach a deliverable file to move this task to Done.");
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
    <div className="fixed inset-0 bg-gray-900/60 flex items-center justify-center z-[100] p-4 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-6 md:p-8 shadow-2xl my-4">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="min-w-0">
            <label className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-widest block mb-1">Task details</label>
            <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 tracking-tight break-words">
              {task.Title || task.title}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="shrink-0 text-gray-400 hover:text-gray-700 text-2xl leading-none px-2" aria-label="Close">×</button>
        </div>

        {isReadOnly ? (
          <div className="space-y-4">
            <TaskDetailsPanel task={task} milestoneTitle={milestoneTitle} assigneeName={assigneeName} />
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200/70">
                <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest block mb-2">Current Status</label>
                <p className="text-lg font-sans font-extrabold text-indigo-600 mb-4">
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
                    <label className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-widest block mb-2">Review Feedback</label>
                    <p className="text-sm font-medium text-emerald-800 leading-relaxed">{submission.qaComment}</p>
                </div>
            )}
            <button onClick={onClose} className="w-full py-5 bg-slate-700 text-white rounded-2xl font-extrabold uppercase tracking-widest hover:bg-slate-800 transition-colors">Close Portal</button>
          </div>
        ) : (
          <div className="space-y-8">
            <TaskDetailsPanel task={task} milestoneTitle={milestoneTitle} assigneeName={assigneeName} />
            {isEmployee ? (
              <>
                <div className="space-y-2">
                    <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest ml-4">Update Progress</label>
                    <Select
                      value={status}
                      onChange={setStatus}
                      className="w-full"
                      options={[
                        { value: 'Todo', label: 'Todo' },
                        { value: 'InProgress', label: 'In Progress' },
                        { value: 'Done', label: 'Done (Attach File)' },
                      ]}
                    />
                </div>
                
                {status === "Done" && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                        <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest ml-4">Deliverable File</label>
                        <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-extrabold file:uppercase file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
                        <textarea placeholder="Add a submission comment..." className="w-full p-5 bg-gray-50 rounded-2xl h-32 outline-none font-medium text-gray-700 focus:ring-2 ring-indigo-500/20 border-none resize-none" value={comment} onChange={(e) => setComment(e.target.value)} />
                    </div>
                )}
                
                <div className="flex gap-4 pt-4">
                    <button onClick={onClose} className="flex-1 py-5 font-extrabold text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors">Discard</button>
                    <button onClick={handleSave} disabled={loading || (status === "Done" && !file)} className="flex-2 px-10 py-5 bg-indigo-600 text-white rounded-2xl font-extrabold uppercase tracking-widest disabled:opacity-30 shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all">
                        {loading ? "Processing..." : "Update Task"}
                    </button>
                </div>
              </>
            ) : isManagerOrAdmin ? (
              <div className="space-y-4">

                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">
                    Priority
                  </label>
                  <Select
                    value={priority}
                    onChange={setPriority}
                    className="w-full"
                    options={[
                      { value: 'High', label: 'High' },
                      { value: 'Medium', label: 'Medium' },
                      { value: 'Low', label: 'Low' },
                    ]}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">
                    Due date
                  </label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full p-3 bg-gray-50 rounded-xl outline-none font-medium text-gray-700 focus:ring-2 ring-indigo-500/20 border border-gray-200/70"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest ml-4">
                    Assign to team member
                  </label>
                  {membersError && (
                    <p className="text-sm text-amber-700 bg-amber-50 rounded-xl px-4 py-3 border border-amber-100">
                      {membersError}
                    </p>
                  )}
                  <Select
                    value={assigneeId}
                    onChange={setAssigneeId}
                    disabled={membersLoading || (!!membersError && members.length === 0)}
                    className="w-full"
                    placeholder="Unassigned"
                    options={[
                      { value: '', label: 'Unassigned' },
                      ...members.map((m) => ({
                        value: String(m.Id ?? m.UserId ?? m.userId ?? m.id ?? ""),
                        label: memberLabel(m),
                      })),
                    ]}
                  />
                  {membersLoading && (
                    <p className="text-xs text-gray-400 font-medium px-1">Loading team roster…</p>
                  )}
                </div>

                <p className="text-xs text-gray-400 font-medium px-1 leading-relaxed">
                  Assign manually here. For AI task allocation, use Milestones → Smart Task Allocation.
                </p>

                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={loading || deleteBusy}
                  className="w-full py-3 text-red-600 bg-red-50 rounded-2xl font-extrabold uppercase tracking-widest text-xs hover:bg-red-100 transition-all"
                >
                  Delete task
                </button>

                <button
                  type="button"
                  onClick={handleManagerSaveAssignment}
                  disabled={loading || membersLoading}
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-extrabold uppercase tracking-widest text-sm disabled:opacity-40 shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all"
                >
                  {loading ? "Saving…" : "Save assignment"}
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-4 text-gray-400 font-extrabold uppercase tracking-widest text-sm hover:text-gray-600 transition-colors"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <p className="text-gray-500 font-medium leading-relaxed">
                  {task.Description || task.description || "No description provided."}
                </p>
                <div className="p-6 bg-gray-50 rounded-[2rem] border border-gray-200/70 text-center text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">
                  View only for your role
                </div>
                <button
                  onClick={onClose}
                  className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-extrabold uppercase tracking-widest"
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
          { label: "Assigned to", value: deleteAssigneeName },
        ]}
        warning={
          deleteAssigneeName !== "Unassigned"
            ? `This task is assigned to ${deleteAssigneeName}. Deleting it will remove their assignment.`
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
    <div className=" min-h-screen">
      {/* Sticky Header */}
      <header className="sticky top-4 z-30 mx-4 rounded-2xl bg-white/60 backdrop-blur-xl saturate-150 border border-white/50 shadow-[0_8px_30px_rgba(15,23,42,0.08)] px-8 py-5 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <label className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-widest block mb-1">Overview</label>
           <h1 className="text-4xl font-sans font-extrabold text-gray-900 tracking-tight">Kanban Board</h1>
        </div>
        
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative">
            <input
              type="search"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full md:w-72 p-3 pl-11 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/20 font-medium text-sm transition-all"
            />
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
          <Select
            value={priorityFilter}
            onChange={setPriorityFilter}
            className="w-44"
            options={[
              { value: 'all', label: 'All priorities' },
              { value: 'high', label: 'High' },
              { value: 'medium', label: 'Medium' },
              { value: 'low', label: 'Low' },
            ]}
          />
        </div>
      </header>

      <main className="p-10">
        {/* Metric Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div className="card p-5 flex items-center gap-4">
              <div className="size-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <svg className="size-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
              </div>
              <div className="flex-1">
                  <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest block mb-1">Active Project</label>
                  <Select
                      value={selectedProjectId}
                      onChange={setSelectedProjectId}
                      disabled={loadingProjects}
                      variant="plain"
                      className="text-xl font-extrabold text-gray-900"
                      placeholder={loadingProjects ? "Loading..." : "Select Project"}
                      options={projects.map(p => ({
                        value: String(p.projectId || p.ProjectId),
                        label: p.title || p.Title,
                      }))}
                  />
              </div>
          </div>

          <div className="card p-5 flex items-center gap-4">
              <div className="size-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <svg className="size-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div className="flex-1">
                  <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest block mb-1">Project Milestone</label>
                  <Select
                    value={selectedMilestoneId}
                    onChange={setSelectedMilestoneId}
                    disabled={!selectedProjectId}
                    variant="plain"
                    className="text-xl font-extrabold text-gray-900"
                    placeholder="All Milestone Tasks"
                    options={[
                      { value: '', label: 'All Milestone Tasks' },
                      ...milestones.map(m => ({
                        value: String(m.milestoneId || m.MilestoneId),
                        label: m.title || m.Title,
                      })),
                    ]}
                  />
              </div>
          </div>
        </div>

        {/* Board */}
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {KANBAN_COLUMNS.map((col) => {
              const meta = COLUMN_META[col] ?? COLUMN_META.Todo;
              const colTasks = visibleTasks.filter(t => STATUS_MAP[t.Status || t.status] === col);
              return (
              <Droppable droppableId={col} key={col}>
                {(p, snap) => (
                  <div className="rounded-2xl bg-gray-100/60 overflow-hidden">
                    {/* Colored accent bar */}
                    <div className={`h-1 ${meta.bar}`} />

                    <div className="flex items-center justify-between px-5 pt-5 pb-4">
                      <div className="flex items-center gap-2">
                        <span className={`size-2 rounded-full ${meta.dot}`} />
                        <h3 className="text-[11px] font-extrabold uppercase text-gray-500 tracking-[0.2em]">{meta.label}</h3>
                      </div>
                      <span className={`text-[11px] font-extrabold min-w-6 h-6 px-2 flex items-center justify-center rounded-full ${meta.pill}`}>
                        {colTasks.length}
                      </span>
                    </div>

                    <div
                      ref={p.innerRef} {...p.droppableProps}
                      className={`px-4 pb-4 min-h-[600px] space-y-4 transition-all duration-300 ${snap.isDraggingOver ? `ring-2 ring-inset ${meta.over}` : ''}`}
                    >
                      {colTasks.map((t, i) => (
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
                      {colTasks.length === 0 && !snap.isDraggingOver && (
                        <div className="flex flex-col items-center justify-center gap-2 py-12 text-center border-2 border-dashed border-gray-200 rounded-xl">
                          <FiInbox className="text-gray-300" size={24} />
                          <p className="text-xs font-semibold text-gray-400">No tasks</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Droppable>
              );
            })}
          </div>
        </DragDropContext>
      </main>

      {selectedTask && (
        <TaskModal
          task={selectedTask}
          projectId={selectedProjectId}
          milestoneTitle={(() => {
            const mid = selectedTask.MilestoneId ?? selectedTask.milestoneId;
            const m = milestones.find((x) => String(x.MilestoneId ?? x.milestoneId) === String(mid));
            return m?.Title ?? m?.title;
          })()}
          assigneeName={resolveAssignee(selectedTask)}
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