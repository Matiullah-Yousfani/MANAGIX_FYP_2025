import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/axiosInstance";

const TaskSubmit = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();

  const [file, setFile] = useState<File | null>(null);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const userId = localStorage.getItem("userId");
  const role =
    localStorage.getItem("roleName") || localStorage.getItem("userRole");

  // 🚫 Hard role protection
  if (role !== "Employee") {
    return (
      <div className="p-8 text-danger font-bold">
        Access Denied – Employees only
      </div>
    );
  }

  // Convert file to Base64 (backend aligned)
  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result!.toString().split(",")[1]);
      reader.onerror = (error) => reject(error);
    });

  const handleSubmit = async () => {
    if (!file || !taskId) {
      alert("File is required");
      return;
    }

    try {
      setLoading(true);

      const base64 = await toBase64(file);

      await api.post(
        `/tasks/${taskId}/submit`,
        {
          fileBase64: base64,
          fileName: file.name,
          comment,
        },
        {
          headers: {
            userId: userId,
          },
        }
      );

      alert("Task submitted successfully");
      navigate("/kanban"); // Always return to Kanban
    } catch (err) {
      console.error(err);
      alert("Submission failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-xl bg-bg text-fg">
      <button onClick={() => navigate(-1)} className="mb-4 text-primary underline">
        ← Back
      </button>

      <h1 className="text-2xl font-bold mb-4 text-fg">Submit Task</h1>

      <div className="mb-4">
        <label className="block mb-1 font-medium text-fg-muted">Upload File</label>
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="text-fg-muted file:mr-3 file:rounded-lg file:border-0 file:bg-surface-2 file:px-4 file:py-2 file:text-fg hover:file:bg-surface-3"
        />
      </div>

      <div className="mb-4">
        <label className="block mb-1 font-medium text-fg-muted">
          Comment (optional)
        </label>
        <textarea
          className="w-full p-2 rounded-lg bg-surface-2 text-fg border border-line outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </div>

      <button
        disabled={loading}
        onClick={handleSubmit}
        className="rounded-lg bg-primary text-primary-fg px-4 py-2 font-medium hover:bg-primary-hover disabled:opacity-50"
      >
        {loading ? "Submitting..." : "Submit Task"}
      </button>
    </div>
  );
};

export default TaskSubmit;
