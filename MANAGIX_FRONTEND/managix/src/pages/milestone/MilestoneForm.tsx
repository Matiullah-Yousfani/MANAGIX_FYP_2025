import React, { useState } from "react";
import { milestoneService } from "../../api/milestoneService";
import { minDateToday } from "../../utils/dateInput";
import { DatePicker } from "../../components/ui";

interface Props {
  projectId: string;
  milestone?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

const MilestoneForm: React.FC<Props> = ({
  projectId,
  milestone,
  onSuccess,
  onCancel
}) => {
  const [title, setTitle] = useState(milestone?.title || "");
  const [description, setDescription] = useState(milestone?.description || "");
  const [deadline, setDeadline] = useState(
    milestone?.deadline?.split("T")[0] || ""
  );
  const [budget, setBudget] = useState(milestone?.budgetAllocated || 0);

  const submit = async () => {
    if (!title || !deadline) return toast("Title & Deadline required");

    if (milestone) {
      await milestoneService.update(milestone.milestoneId, {
        title,
        description,
        deadline,
        budgetAllocated: budget,
        status: milestone.status
      });
    } else {
      await milestoneService.create({
        projectId,
        title,
        description,
        deadline,
        budgetAllocated: budget
      });
    }

    onSuccess();
  };

  const fieldCls =
    "w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/20 transition-all";

  return (
    <div className="card p-6 mb-4 space-y-4">
      <h5 className="text-lg font-bold text-slate-900">
        {milestone ? "Edit Milestone" : "Add Milestone"}
      </h5>

      <input
        className={fieldCls}
        placeholder="Title"
        value={title}
        onChange={e => setTitle(e.target.value)}
      />

      <textarea
        className={`${fieldCls} h-24 resize-none`}
        placeholder="Description"
        value={description}
        onChange={e => setDescription(e.target.value)}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1">Deadline</label>
          <DatePicker
            min={minDateToday()}
            value={deadline}
            onChange={setDeadline}
          />
        </div>
        <div>
          <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1">Budget</label>
          <input
            type="number"
            className={`${fieldCls} nums`}
            placeholder="Budget"
            value={budget}
            onChange={e => setBudget(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="flex gap-3 pt-1">
        <button
          onClick={submit}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-indigo-600/20 transition-all active:scale-[0.97]"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-2.5 rounded-xl font-semibold text-sm transition-colors active:scale-[0.97]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default MilestoneForm;
