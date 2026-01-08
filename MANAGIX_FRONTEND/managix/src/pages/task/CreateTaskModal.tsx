import React, { useState } from "react";
import api from "../../api/axiosInstance";

const CreateTaskModal = ({
  projectId,
  milestones,
  employees,
  onClose,
  onSuccess,
}: any) => {
  const [form, setForm] = useState<any>({
    title: "",
    description: "",
    milestoneId: "",
    assignedEmployeeId: "",
  });

  const submit = async () => {
    await api.post("/tasks", {
      projectId,
      milestoneId: form.milestoneId || null,
      assignedEmployeeId: form.assignedEmployeeId,
      title: form.title,
      description: form.description,
    });

    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
      <div className="bg-white p-6 rounded-xl w-96">
        <h2 className="font-bold mb-4">Create Task</h2>

        <input
          placeholder="Title"
          className="w-full mb-2 p-2 border"
          onChange={(e) =>
            setForm({ ...form, title: e.target.value })
          }
        />

        <textarea
          placeholder="Description"
          className="w-full mb-2 p-2 border"
          onChange={(e) =>
            setForm({ ...form, description: e.target.value })
          }
        />

        <select
          className="w-full mb-2 p-2 border"
          onChange={(e) =>
            setForm({ ...form, milestoneId: e.target.value })
          }
        >
          <option value="">No Milestone</option>
          {milestones.map((m: any) => (
            <option key={m.MilestoneId} value={m.MilestoneId}>
              {m.Title}
            </option>
          ))}
        </select>

        <select
          className="w-full mb-4 p-2 border"
          onChange={(e) =>
            setForm({
              ...form,
              assignedEmployeeId: e.target.value,
            })
          }
        >
          <option value="">Assign Employee</option>
          {employees.map((e: any) => (
            <option key={e.UserId} value={e.UserId}>
              {e.FullName}
            </option>
          ))}
        </select>

        <div className="flex justify-end gap-2">
          <button onClick={onClose}>Cancel</button>
          <button
            onClick={submit}
            className="bg-black text-white px-4 rounded"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateTaskModal;
