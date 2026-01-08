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
  const role = localStorage.getItem("roleName");

  // 🚫 Hard role protection
  if (role !== "Employee") {
    return (
      <div className="p-8 text-red-500 font-bold">
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
    <div className="p-8 max-w-xl">
      <button onClick={() => navigate(-1)} className="mb-4 underline">
        ← Back
      </button>

      <h1 className="text-2xl font-bold mb-4">Submit Task</h1>

      <div className="mb-4">
        <label className="block mb-1 font-medium">Upload File</label>
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
      </div>

      <div className="mb-4">
        <label className="block mb-1 font-medium">
          Comment (optional)
        </label>
        <textarea
          className="border w-full p-2"
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </div>

      <button
        disabled={loading}
        onClick={handleSubmit}
        className="border px-4 py-2 disabled:opacity-50"
      >
        {loading ? "Submitting..." : "Submit Task"}
      </button>
    </div>
  );
};

export default TaskSubmit;
