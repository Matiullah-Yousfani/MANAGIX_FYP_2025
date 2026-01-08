import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { taskService } from "../../api/taskService";
import api from '../../api/axiosInstance';

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
// 1. ADD THIS INTERFACE
interface TaskProps {
  propProjectId?: string;
  propMilestoneId?: string;
}

const Task = () => {
  const { projectId, milestoneId } = useParams<{
    projectId: string;
    milestoneId: string;
  }>();

  // Get Role for Access Control
  const role = localStorage.getItem('roleName') || localStorage.getItem('userRole');

  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("Todo");
  const [assignedEmployeeId, setAssignedEmployeeId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [team, setTeam] = useState<any[]>([]);

  // Fetch Employees for the assignment dropdown
  useEffect(() => {
  const fetchTeam = async () => {
    try {
      // ✅ Use the endpoint you confirmed works
      const res = await api.get('/users'); 
      console.log("API Data:", res.data);

      // ✅ Filter: Include users who have a RoleId assigned
      // If you know the specific ID for 'Employee', replace 'null' with that ID string
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
      // Ensure data mapping matches your backend response keys
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
      alert("Missing project or milestone context");
      return;
    }

    const payload = {
      ProjectId: projectId,
      MilestoneId: milestoneId,
      Title: title,
      Description: description,
      Status: status,
      AssignedEmployeeId: assignedEmployeeId || null,
    };

    try {
      if (editingId) {
        await taskService.update(editingId, payload);
      } else {
        await taskService.create(payload);
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

  const handleDelete = async (taskId: string) => {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    try {
      await taskService.delete(taskId);
      fetchTasks();
    } catch (err) {
      console.error("Error deleting task:", err);
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
    <div className="p-8 min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-black mb-8 italic uppercase tracking-tighter">Tasks</h1>

        {/* CREATE/EDIT SECTION - Only visible to Manager */}
        {role === 'Manager' && (
          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 mb-10">
            <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6">
              {editingId ? "Edit Existing Task" : "Create New Task"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Task Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-black transition-all"
                  required
                />
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full p-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-black transition-all"
                >
                  <option value="Todo">Todo</option>
                  <option value="InProgress">In Progress</option>
                  <option value="Done">Done</option>
                </select>
              </div>

              <textarea
                placeholder="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-black transition-all h-24"
              />

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Assign to Team Member</label>
               <select
  value={assignedEmployeeId}
  onChange={(e) => setAssignedEmployeeId(e.target.value)}
  className="w-full p-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-black transition-all"
  required
>
  <option value="">-- Select Employee --</option>
  {team.map((member) => (
    <option key={member.UserId} value={member.UserId}>
      {member.FullName}
    </option>
  ))}
</select>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 p-4 bg-black text-white rounded-2xl font-bold hover:bg-gray-800 transition-all"
                >
                  {editingId ? "Update Task" : "Save Task"}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="p-4 bg-gray-200 text-gray-600 rounded-2xl font-bold px-8"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        {/* TASK LIST TABLE - Visible to everyone */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
          <table className="min-w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Title</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-10 text-center text-gray-400 font-medium">
                    No tasks found for this milestone.
                  </td>
                </tr>
              ) : (
                tasks.map((t) => (
                  <tr key={t.TaskId} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-800">{t.Title}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                        t.Status === 'Done' ? 'bg-green-100 text-green-600' : 
                        t.Status === 'InProgress' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {t.Status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {role === 'Manager' ? (
                        <div className="flex justify-end gap-2">
                          <button
                            className="p-2 px-4 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold hover:bg-black hover:text-white transition-all"
                            onClick={() => handleEdit(t)}
                          >
                            Edit
                          </button>
                          <button
                            className="p-2 px-4 bg-red-50 text-red-500 rounded-xl text-xs font-bold hover:bg-red-500 hover:text-white transition-all"
                            onClick={() => handleDelete(t.TaskId)}
                          >
                            Delete
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] font-black text-gray-300 uppercase">View Only</span>
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
  );
};

export default Task;