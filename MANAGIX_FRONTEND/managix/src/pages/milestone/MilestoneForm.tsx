import React, { useState } from "react";
import { milestoneService } from "../../api/milestoneService";
import { minDateToday } from "../../utils/dateInput";

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
    if (!title || !deadline) return alert("Title & Deadline required");

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

  return (
    <div className="bg-surface p-4 mb-3 rounded-xl border border-line shadow-e1">
      <h5 className="text-fg font-semibold mb-3">{milestone ? "Edit Milestone" : "Add Milestone"}</h5>

      <input
        className="w-full mb-2 p-3 bg-surface-2 border border-line rounded-lg text-fg outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
        placeholder="Title"
        value={title}
        onChange={e => setTitle(e.target.value)}
      />

      <textarea
        className="w-full mb-2 p-3 bg-surface-2 border border-line rounded-lg text-fg outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
        placeholder="Description"
        value={description}
        onChange={e => setDescription(e.target.value)}
      />

      <input
        type="date"
        min={minDateToday()}
        className="w-full mb-2 p-3 bg-surface-2 border border-line rounded-lg text-fg outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
        value={deadline}
        onChange={e => setDeadline(e.target.value)}
      />

      <input
        type="number"
        className="w-full mb-2 p-3 bg-surface-2 border border-line rounded-lg text-fg outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
        placeholder="Budget"
        value={budget}
        onChange={e => setBudget(Number(e.target.value))}
      />

      <button className="mr-2 px-4 py-2 rounded-lg bg-primary text-primary-fg font-semibold hover:bg-primary-hover transition-colors" onClick={submit}>
        Save
      </button>
      <button className="px-4 py-2 rounded-lg bg-surface-2 text-fg border border-line font-semibold hover:bg-surface-3 transition-colors" onClick={onCancel}>
        Cancel
      </button>
    </div>
  );
};

export default MilestoneForm;
