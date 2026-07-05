import React, { useEffect, useState } from "react";
import { toast, Select } from '../../components/ui';
import { useParams } from "react-router-dom";
import { taskService } from "../../api/taskService";
import api from '../../api/axiosInstance';
import ConfirmDeleteModal from '../../components/ConfirmDeleteModal';
import ToastStack, { useToast } from '../../components/ToastStack';

interface Task {
  TaskId: string;
  ProjectId: string;
  MilestoneId: string;
  AssignedEmployeeId?: string;
  Title: string;
  Description?: string;
  Status: string;
  CreatedAt?: string;
}

interface TaskProps {
  propProjectId?: string;
  propMilestoneId?: string;
}

const Task = () => {
  const { projectId, milestoneId } = useParams<{
    projectId: string;
    milestoneId: string;
  }>();

  const role = localStorage.getItem('roleName') || localStorage.getItem('userRole');

  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("Todo");
  const [assignedEmployeeId, setAssignedEmployeeId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [team, setTeam] = useState<any[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const { toasts, push: pushToast } = useToast();

  const assigneeName = (id?: string) => {
    if (!id) return 'Unassigned';
    const u = team.find((x: any) => String(x.UserId || x.userId) === String(id));
    return u?.FullName || u?.fullName || 'Assigned employee';
  };

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const res = await api.get('/users');
        const employees = res.data.filter((u: any) => u.RoleId !== null);
        setTeam(employees);
      } catch (err) {
        console.error("Failed to fetch team", err);
      }
    };
    fetchTeam();
  }, []);

  const fetchTasks = async () => {
    if (!milestoneId) return;
    try {
      const data = await taskService.getByMilestone(milestoneId);
      const normalized = (data || []).map((t: any) => ({
        TaskId: t.taskId || t.TaskId,
        ProjectId: t.projectId || t.ProjectId,
        MilestoneId: t.milestoneId || t.MilestoneId,
        Title: t.title || t.Title,
        Description: t.description || t.Description,
        Status: t.status || t.Status,
        AssignedEmployeeId: t.assignedEmployeeId || t.AssignedEmployeeId,
        CreatedAt: t.createdAt || t.CreatedAt,
      }));
      setTasks(normalized);
    } catch (err) {
      console.error("Error fetching tasks:", err);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [milestoneId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !milestoneId) {
      toast("Missing project or milestone context");
      return;
    }

    const createPayload = {
      projectId,
      milestoneId,
      title,
      description: description || undefined,
      status,
      assignedEmployeeId,
    };

    const updatePayload = {
      title,
      description: description || undefined,
      status,
      assignedEmployeeId: assignedEmployeeId || undefined,
    };

    try {
      if (editingId) {
        await taskService.update(editingId, updatePayload);
      } else {
        await taskService.create(createPayload);
      }
      resetForm();
      fetchTasks();
    } catch (err) {
      console.error("Error saving task:", err);
    }
  };

  const handleEdit = (task: Task) => {
    setEditingId(task.TaskId);
    setTitle(task.Title);
    setDescription(task.Description || "");
    setStatus(task.Status);
    setAssignedEmployeeId(task.AssignedEmployeeId || "");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      await taskService.delete(deleteTarget.TaskId);
      setDeleteTarget(null);
      pushToast('Task deleted successfully', 'success');
      fetchTasks();
    } catch (err: any) {
      pushToast(err?.response?.data?.message || 'Error deleting task', 'error');
    } finally {
      setDeleteBusy(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setStatus("Todo");
    setAssignedEmployeeId("");
    setEditingId(null);
  };

  return (
    <div className="p-10 min-h-screen ">
      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <header className="mb-12">
          <label className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-[0.2em] block mb-2">
            Milestone Management
          </label>
          <h1 className="text-5xl font-sans font-extrabold text-gray-900 tracking-tight italic uppercase">
            Tasks<span className="text-indigo-600">.</span>
          </h1>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* LEFT: FORM SECTION (Only visible to Manager) */}
          {role === 'Manager' && (
            <div className="lg:col-span-5">
              <div className="bg-white p-10 rounded-2xl shadow-sm border border-gray-200/70 sticky top-10 overflow-hidden group">
                {/* Ghost Icon Watermark */}
                <div className="absolute -right-8 -bottom-8 size-48 text-indigo-600 opacity-[0.03] pointer-events-none transition-all duration-700 group-hover:scale-110 group-hover:opacity-[0.06] group-hover:-rotate-12">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.25 5.5a2.5 2.5 0 115 0 2.5 2.5 0 01-5 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 12l8-8M20 12l-8 8M4 12l8-8M12 20L4 12" />
                  </svg>
                </div>

                <div className="relative z-10">
                  <h2 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-8 flex items-center gap-2">
                    <span className="size-2 bg-indigo-500 rounded-full animate-pulse"></span>
                    {editingId ? "Modify Task Parameters" : "Initialize New Task"}
                  </h2>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-extrabold text-gray-400 uppercase ml-4 tracking-widest">Core Title</label>
                      <input
                        type="text"
                        placeholder="Project Requirement..."
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full p-5 bg-gray-50 rounded-2xl outline-none font-bold text-gray-800 focus:ring-2 focus:ring-indigo-500/20 transition-all border-none"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-extrabold text-gray-400 uppercase ml-4 tracking-widest">Workflow State</label>
                        <Select
                          value={status}
                          onChange={setStatus}
                          className="w-full"
                          options={[
                            { value: 'Todo', label: 'Todo' },
                            { value: 'InProgress', label: 'In Progress' },
                            { value: 'Done', label: 'Done' },
                          ]}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-extrabold text-gray-400 uppercase ml-4 tracking-widest">Assignee</label>
                        <Select
                          value={assignedEmployeeId}
                          onChange={setAssignedEmployeeId}
                          className="w-full"
                          placeholder="Select User"
                          options={[{ value: '', label: 'Select User' }, ...team.map((member) => ({ value: String(member.UserId), label: member.FullName }))]}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-extrabold text-gray-400 uppercase ml-4 tracking-widest">Technical Description</label>
                      <textarea
                        placeholder="Enter task scope and objectives..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full p-5 bg-gray-50 rounded-2xl outline-none font-medium text-gray-600 focus:ring-2 focus:ring-indigo-500/20 transition-all h-32 resize-none border-none"
                      />
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        type="submit"
                        className="flex-[2] py-5 bg-indigo-600 text-white rounded-2xl font-extrabold uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-95"
                      >
                        {editingId ? "Update Record" : "Deploy Task"}
                      </button>
                      {editingId && (
                        <button
                          type="button"
                          onClick={resetForm}
                          className="flex-1 py-5 bg-gray-100 text-gray-500 rounded-2xl font-extrabold uppercase tracking-widest hover:bg-gray-200 transition-all"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* RIGHT: TASK LIST SECTION */}
          <div className={role === 'Manager' ? "lg:col-span-7" : "lg:col-span-12"}>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200/70 overflow-hidden">
              <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-white">
                <h3 className="text-[12px] font-extrabold uppercase text-gray-400 tracking-[0.2em]">Active Task Registry</h3>
                <span className="text-[10px] font-extrabold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase">
                  {tasks.length} Records Found
                </span>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-gray-50/50">
                      <th className="px-8 py-5 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Task Detail</th>
                      <th className="px-8 py-5 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest text-center">Status</th>
                      <th className="px-8 py-5 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest text-right">Operations</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {tasks.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-8 py-20 text-center">
                          <div className="flex flex-col items-center opacity-20">
                            <span className="text-5xl mb-4">📂</span>
                            <p className="text-[10px] font-extrabold uppercase tracking-widest">Registry Empty</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      tasks.map((t) => (
                        <tr key={t.TaskId} className="group hover:bg-gray-50/50 transition-colors">
                          <td className="px-8 py-6">
                            <div className="flex flex-col">
                              <span className="text-lg font-extrabold text-gray-900 leading-tight group-hover:text-indigo-600 transition-colors">
                                {t.Title}
                              </span>
                              <span className="text-xs font-medium text-gray-400 mt-1 line-clamp-1">
                                {t.Description || "No additional metadata provided."}
                              </span>
                            </div>
                          </td>
                          <td className="px-8 py-6 text-center">
                            <span className={`px-4 py-2 rounded-full text-[9px] font-extrabold uppercase tracking-tighter ${
                              t.Status === 'Done' ? 'bg-emerald-100 text-emerald-700' : 
                              t.Status === 'InProgress' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {t.Status}
                            </span>
                          </td>
                          <td className="px-8 py-6 text-right">
                            {role === 'Manager' ? (
                              <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  className="p-3 bg-slate-700 text-white rounded-xl text-[10px] font-extrabold uppercase tracking-widest hover:bg-indigo-600 transition-all active:scale-90"
                                  onClick={() => handleEdit(t)}
                                >
                                  Edit
                                </button>
                                <button
                                  className="p-3 bg-red-50 text-red-500 rounded-xl text-[10px] font-extrabold uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all active:scale-90"
                                  onClick={() => setDeleteTarget(t)}
                                >
                                  Delete
                                </button>
                              </div>
                            ) : (
                              <span className="text-[9px] font-extrabold text-gray-300 uppercase tracking-widest">Read Only</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        message={
          deleteTarget
            ? `Delete "${deleteTarget.Title}"? Assigned to ${assigneeName(deleteTarget.AssignedEmployeeId)}. You won't be able to revert this!`
            : undefined
        }
        details={
          deleteTarget
            ? [
                { label: 'Task', value: deleteTarget.Title },
                { label: 'Assigned to', value: assigneeName(deleteTarget.AssignedEmployeeId) },
                { label: 'Status', value: deleteTarget.Status },
              ]
            : []
        }
        busy={deleteBusy}
        onConfirm={handleDelete}
        onCancel={() => !deleteBusy && setDeleteTarget(null)}
      />
      <ToastStack toasts={toasts} />
    </div>
  );
};

export default Task;