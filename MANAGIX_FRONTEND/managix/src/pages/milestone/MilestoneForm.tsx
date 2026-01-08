import React, { useState } from "react";
import { milestoneService } from "../../api/milestoneService";

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
    <div className="card p-3 mb-3">
      <h5>{milestone ? "Edit Milestone" : "Add Milestone"}</h5>

      <input
        className="form-control mb-2"
        placeholder="Title"
        value={title}
        onChange={e => setTitle(e.target.value)}
      />

      <textarea
        className="form-control mb-2"
        placeholder="Description"
        value={description}
        onChange={e => setDescription(e.target.value)}
      />

      <input
        type="date"
        className="form-control mb-2"
        value={deadline}
        onChange={e => setDeadline(e.target.value)}
      />

      <input
        type="number"
        className="form-control mb-2"
        placeholder="Budget"
        value={budget}
        onChange={e => setBudget(Number(e.target.value))}
      />

      <button className="btn btn-primary me-2" onClick={submit}>
        Save
      </button>
      <button className="btn btn-secondary" onClick={onCancel}>
        Cancel
      </button>
    </div>
  );
};

export default MilestoneForm;
