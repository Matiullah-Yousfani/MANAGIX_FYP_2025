import React, { useEffect, useState } from 'react';
import api from '../../api/axiosInstance';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiShield, FiDownload, FiCheck, FiX, FiUser, 
  FiFileText, FiSearch, FiInbox, FiCheckCircle, FiXCircle 
} from 'react-icons/fi';

const QAReview = () => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'error' | 'success' }[]>([]);
  
  // Decision Modal State
  const [decisionModal, setDecisionModal] = useState<{ taskId: string, type: 'approve' | 'reject' } | null>(null);
  const [comment, setComment] = useState('');

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const filterProjectId = queryParams.get('projectId');

  const addToast = (message: string, type: 'error' | 'success' = 'error') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  useEffect(() => {
    fetchTasksForReview();
  }, [filterProjectId]);

  const fetchTasksForReview = async () => {
    try {
      setLoading(true);
      const storedId = localStorage.getItem('userId');
      const headers = storedId ? { userId: storedId } : {};
      const [pendingRes, doneRes] = await Promise.all([
        api.get('/tasks/pending-review', { headers }),
        api.get('/tasks/qa/done', { headers }),
      ]);
      const pending = Array.isArray(pendingRes.data) ? pendingRes.data : [];
      const doneRows = Array.isArray(doneRes.data) ? doneRes.data : [];
      const seen = new Set(
        pending.map((s: any) => String(s.taskId ?? s.TaskId ?? s.task?.taskId ?? s.Task?.TaskId ?? ''))
      );
      const fromDone = doneRows
        .filter((row: any) => row.submission?.status === 'Submitted')
        .filter((row: any) => !seen.has(String(row.taskId)))
        .map((row: any) => ({
          taskId: row.taskId,
          status: row.submission?.status ?? 'Submitted',
          submittedAt: row.submission?.submittedAt,
          comment: row.submission?.comment,
          fileName: row.submission?.fileName,
          task: {
            taskId: row.taskId,
            title: row.title,
            projectId: row.projectId,
            status: row.status,
          },
          employee: { fullName: 'Assignee' },
        }));
      const allSubmissions = [...pending, ...fromDone];

      if (filterProjectId) {
        const filtered = allSubmissions.filter((sub: any) =>
          (sub.task?.projectId ?? sub.Task?.projectId ?? sub.Task?.ProjectId)?.toString() ===
          filterProjectId.toString()
        );
        setTasks(filtered);
      } else {
        setTasks(allSubmissions);
      }
    } catch (err: any) {
      addToast(`Review Fetch Failed: ${err.response?.status || 'Server Error'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const submitDecision = async () => {
    if (!decisionModal) return;
    try {
      const { taskId, type } = decisionModal;
      if (type === "approve") {
        await api.post(`/tasks/${taskId}/approve`, { qaComment: comment });
      } else {
        await api.post(`/tasks/${taskId}/reject`, { qaComment: comment });
      }
      addToast(`Task successfully ${type}ed`, 'success');
      setDecisionModal(null);
      setComment('');
      fetchTasksForReview(); 
    } catch (err) {
      addToast("Failed to update task status", "error");
    }
  };

  const handleDownloadWork = async (taskId: string, title: string) => {
    try {
      const res = await api.get(`/tasks/${taskId}/submission`);
      const { fileBase64, fileName } = res.data;
      const link = document.createElement('a');
      link.href = `data:application/octet-stream;base64,${fileBase64}`;
      link.download = fileName || `${title}_Review.dat`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      addToast("Download started", "success");
    } catch (err) {
      addToast("Could not download deliverable", "error");
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="text-primary">
        <FiShield size={40} />
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-surface border-b border-line px-8 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-fg">Quality Control</h1>
        <div className="relative w-96">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-fg-subtle" />
          <input
            type="text"
            placeholder="Search submissions..."
            className="w-full pl-12 pr-4 py-3 bg-surface-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
          />
        </div>
      </header>

      <main className="p-8 max-w-5xl mx-auto">
        <div className="mb-10">
          <label className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2 block">QA Gatekeeper</label>
          <h2 className="text-2xl font-bold text-fg tracking-tight">Review Queue</h2>
          <p className="font-medium text-fg-muted mt-2">Validate deliverables before they contribute to project milestones.</p>
        </div>

        <div className="grid gap-6">
          {tasks.length === 0 ? (
            <div className="bg-surface py-24 text-center rounded-xl border border-dashed border-line">
              <FiInbox size={48} className="mx-auto mb-4 opacity-10 text-fg" />
              <p className="font-bold uppercase tracking-widest text-[10px] text-fg-subtle">Queue is currently clear</p>
            </div>
          ) : (
            tasks.map((submission) => {
              const task = submission.task ?? submission.Task;
              const taskId = task?.taskId ?? task?.TaskId;
              const employeeName =
                submission.employee?.fullName ??
                submission.Employee?.FullName ??
                "Team Member";

              return (
                <motion.div 
                  layout
                  key={submission.submissionId ?? submission.SubmissionId} 
                  className="bg-surface p-8 rounded-xl border border-line shadow-e1 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 transition-all hover:shadow-e2 group relative overflow-hidden"
                >
                  <div className="flex-1 relative z-10">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-[10px] font-bold px-3 py-1 bg-warning-soft text-warning rounded-full uppercase tracking-widest border border-warning/25">
                        Awaiting Audit
                      </span>
                      <span className="flex items-center gap-1 text-[10px] font-bold text-primary uppercase tracking-widest">
                        <FiUser /> {employeeName}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-fg tracking-tight mb-2">{task?.Title || task?.title}</h3>
                    <p className="text-sm font-medium text-fg-muted mb-6 leading-relaxed max-w-xl">
                      {task?.Description || task?.description}
                    </p>

                    <button
                      onClick={() => handleDownloadWork(taskId, task?.Title)}
                      className="flex items-center gap-3 p-4 bg-surface-2 rounded-lg border border-transparent hover:border-primary-border hover:bg-surface-3 transition-all group/btn"
                    >
                      <div className="p-2 bg-primary text-primary-fg rounded-lg group-hover/btn:scale-110 transition-transform">
                        <FiDownload size={16} />
                      </div>
                      <div className="text-left">
                        <div className="text-[10px] font-bold text-fg-subtle uppercase tracking-widest leading-none mb-1">Deliverable</div>
                        <div className="text-sm font-bold text-fg-muted">Audit Attached Files</div>
                      </div>
                    </button>
                  </div>
                  
                  <div className="flex gap-3 relative z-10 w-full md:w-auto">
                    <button 
                      onClick={() => setDecisionModal({ taskId, type: 'reject' })}
                      className="flex-1 md:flex-none px-8 py-4 bg-surface border border-danger/25 text-danger rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-danger-soft transition-all flex items-center justify-center gap-2 shadow-e1"
                    >
                      <FiX strokeWidth={3} /> Reject
                    </button>
                    <button
                      onClick={() => setDecisionModal({ taskId, type: 'approve' })}
                      className="flex-1 md:flex-none px-8 py-4 bg-primary text-primary-fg rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-primary-hover transition-all flex items-center justify-center gap-2 shadow-e2"
                    >
                      <FiCheck strokeWidth={3} /> Approve
                    </button>
                  </div>

                  <FiShield className="absolute -bottom-6 -right-6 size-32 opacity-[0.03] text-fg rotate-12 group-hover:rotate-0 transition-transform duration-500" />
                </motion.div>
              );
            })
          )}
        </div>
      </main>

      {/* Decision Modal */}
      <AnimatePresence>
        {decisionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setDecisionModal(null)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-surface p-10 rounded-xl w-full max-w-lg shadow-e3"
            >
              <div className={`w-16 h-16 rounded-xl flex items-center justify-center mb-6 ${
                decisionModal.type === 'approve' ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'
              }`}>
                {decisionModal.type === 'approve' ? <FiCheckCircle size={32} /> : <FiXCircle size={32} />}
              </div>

              <h2 className="text-2xl font-bold tracking-tight text-fg mb-2">
                {decisionModal.type === 'approve' ? 'Confirm Approval' : 'Submit Rejection'}
              </h2>
              <p className="font-medium text-fg-muted mb-8">
                {decisionModal.type === 'approve' ? 'Deliverable will be marked as complete.' : 'Provide feedback on what needs to be fixed.'}
              </p>

              <div className="space-y-1 mb-8">
                <label className="text-[10px] font-bold text-fg-subtle uppercase tracking-widest ml-1">Reviewer Comments</label>
                <textarea
                  className="w-full p-4 bg-surface-2 rounded-lg outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary font-medium leading-relaxed resize-none"
                  placeholder="Type your feedback here..." rows={4}
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                />
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={submitDecision}
                  className={`flex-[2] text-primary-fg p-5 rounded-lg font-bold text-sm uppercase tracking-widest shadow-e2 transition-all hover:-translate-y-1 ${
                    decisionModal.type === 'approve' ? 'bg-success' : 'bg-danger'
                  }`}
                >
                  Confirm {decisionModal.type}
                </button>
                <button
                  onClick={() => setDecisionModal(null)}
                  className="flex-1 bg-surface-2 text-fg-muted p-5 rounded-lg font-bold text-sm uppercase tracking-widest"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toasts */}
      <div className="fixed bottom-8 right-8 z-[100] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className={`pointer-events-auto flex items-center gap-3 px-6 py-4 rounded-xl shadow-e3 bg-surface border-l-4 min-w-[320px] ${
                toast.type === 'error' ? 'border-danger' : 'border-success'
              }`}
            >
              {toast.type === 'error' ? <FiXCircle className="text-danger text-xl" /> : <FiCheckCircle className="text-success text-xl" />}
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-widest text-fg-subtle mb-1">System Feedback</span>
                <span className="text-sm font-bold text-fg-muted">{toast.message}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default QAReview;