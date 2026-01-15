import React, { useState } from "react";
import api from "../../api/axiosInstance";
import { motion, AnimatePresence } from "framer-motion";
import { FiPlus, FiUser, FiFlag, FiType, FiAlignLeft, FiXCircle, FiCheckCircle, FiLoader } from "react-icons/fi";

const CreateTaskModal = ({
  projectId,
  milestones,
  employees,
  onClose,
  onSuccess,
}: any) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<any>({
    title: "",
    description: "",
    milestoneId: "",
    assignedEmployeeId: "",
  });
  
  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'error' | 'success' }[]>([]);

  const addToast = (message: string, type: 'error' | 'success' = 'error') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const submit = async () => {
    if (isSubmitting) return;

    if (!form.title || !form.assignedEmployeeId) {
      addToast("Please fill in the title and assign an employee.", "error");
      return;
    }

    setIsSubmitting(true);

    try {
      await api.post("/tasks", {
        projectId,
        milestoneId: form.milestoneId || null,
        assignedEmployeeId: form.assignedEmployeeId,
        title: form.title,
        description: form.description,
      });

      // Find employee name for the toast
      const assignee = employees.find((emp: any) => 
        (emp.UserId || emp.userId)?.toString() === form.assignedEmployeeId.toString()
      );
      const employeeName = assignee?.FullName || assignee?.fullName || "team member";

      // 1. Show the success message
      addToast(`Task successfully assigned to ${employeeName}`, "success");
      
      // 2. DELAY the unmounting of the component
      // This is the ONLY way to see the toast if it's local to this component
      setTimeout(() => {
        onSuccess(); // Refresh parent data
        onClose();   // Close modal
      }, 2000);

    } catch (err) {
      setIsSubmitting(false);
      addToast("Failed to create task. Please try again.", "error");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={!isSubmitting ? onClose : undefined}
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-md"
      />

      {/* Modal Card */}
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative bg-white p-10 rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden"
      >
        <div className="relative z-10">
          <div className="mb-8">
            <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2 block">Task Orchestration</label>
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">Create New Task</h2>
            <p className="font-medium italic text-gray-500 mt-1">Assign responsibilities and link to milestones.</p>
          </div>

          <div className="space-y-5">
            {/* Title Input */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <FiType /> Task Title
              </label>
              <input
                disabled={isSubmitting}
                className="w-full p-4 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-600 font-bold transition-all disabled:opacity-50"
                placeholder="Enter task name..."
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>

            {/* Description Area */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <FiAlignLeft /> Scope of Work
              </label>
              <textarea
                disabled={isSubmitting}
                className="w-full p-4 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-600 font-medium leading-relaxed resize-none disabled:opacity-50"
                placeholder="What needs to be done?"
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Milestone Select */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <FiFlag /> Milestone
                </label>
                <select
                  disabled={isSubmitting}
                  className="w-full p-4 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-600 font-bold text-sm appearance-none cursor-pointer disabled:opacity-50"
                  value={form.milestoneId}
                  onChange={(e) => setForm({ ...form, milestoneId: e.target.value })}
                >
                  <option value="">General Task</option>
                  {milestones.map((m: any) => (
                    <option key={m.MilestoneId || m.milestoneId} value={m.MilestoneId || m.milestoneId}>
                      {m.Title || m.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Employee Select */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <FiUser /> Assignee
                </label>
                <select
                  disabled={isSubmitting}
                  className="w-full p-4 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-600 font-bold text-sm appearance-none cursor-pointer disabled:opacity-50"
                  required
                  value={form.assignedEmployeeId}
                  onChange={(e) => setForm({ ...form, assignedEmployeeId: e.target.value })}
                >
                  <option value="">Select Member</option>
                  {employees.map((emp: any) => (
                    <option key={emp.UserId || emp.userId} value={emp.UserId || emp.userId}>
                      {emp.FullName || emp.fullName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-6">
              <button 
                onClick={submit}
                disabled={isSubmitting}
                className="flex-[2] bg-indigo-600 text-white p-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-100 hover:-translate-y-1 transition-all flex items-center justify-center gap-2 disabled:bg-indigo-400"
              >
                {isSubmitting ? <FiLoader className="animate-spin" /> : <FiPlus strokeWidth={3} />}
                {isSubmitting ? "Processing..." : "Create Task"}
              </button>
              <button 
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 bg-gray-100 text-gray-500 p-5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all hover:bg-gray-200 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>

        <FiPlus className="absolute -bottom-6 -right-6 size-32 opacity-[0.03] text-gray-900 rotate-12" />
      </motion.div>

      {/* Toast Notification Container */}
      <div className="fixed bottom-8 right-8 z-[100] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className={`pointer-events-auto flex items-center gap-3 px-6 py-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] bg-white border-l-4 min-w-[320px] ${
                toast.type === 'error' ? 'border-red-600' : 'border-emerald-600'
              }`}
            >
              {toast.type === 'error' ? <FiXCircle className="text-red-600 text-xl" /> : <FiCheckCircle className="text-emerald-600 text-xl" />}
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">System Message</span>
                <span className="text-sm font-bold text-gray-700">{toast.message}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CreateTaskModal;