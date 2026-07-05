import React, { useState } from "react";
import { toast } from '../../components/ui';
import { useParams, useNavigate } from "react-router-dom";
import { FiLock, FiArrowLeft, FiUploadCloud } from "react-icons/fi";
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
      <div className="p-8 max-w-xl mx-auto">
        <div className="card p-10 text-center">
          <div className="mx-auto mb-4 grid place-items-center size-14 rounded-2xl bg-red-50 text-red-500">
            <FiLock size={26} />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Access Denied</h2>
          <p className="text-sm text-slate-500 mt-1">This page is available to Employees only.</p>
        </div>
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
      toast("File is required");
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

      toast("Task submitted successfully");
      navigate("/kanban"); // Always return to Kanban
    } catch (err) {
      console.error(err);
      toast("Submission failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
      >
        <FiArrowLeft /> Back
      </button>

      <div className="mb-8">
        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-600 mb-1">Deliverable</div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Submit Task</h1>
        <p className="mt-1 text-sm text-slate-500">Upload your completed work for review.</p>
      </div>

      <div className="card p-8 space-y-6">
        <div>
          <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-2">Upload File</label>
          <div className="group border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:border-indigo-400 hover:bg-indigo-50/40 transition-all cursor-pointer relative">
            <input
              type="file"
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <FiUploadCloud className="mx-auto mb-3 text-slate-400 group-hover:text-indigo-500 transition-colors" size={30} />
            <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest">
              {file ? file.name : "Choose a file"}
            </p>
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-2">Comment (optional)</label>
          <textarea
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none"
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>

        <button
          disabled={loading}
          onClick={handleSubmit}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-extrabold uppercase text-xs tracking-widest shadow-lg shadow-indigo-600/20 disabled:opacity-50 transition-all active:scale-[0.98]"
        >
          {loading ? "Submitting..." : "Submit Task"}
        </button>
      </div>
    </div>
  );
};

export default TaskSubmit;
