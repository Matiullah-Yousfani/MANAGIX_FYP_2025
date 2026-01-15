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
      const res = await api.get('/tasks/pending-review', { headers: { userId: storedId } });
      const allSubmissions = Array.isArray(res.data) ? res.data : [];
      
      if (filterProjectId) {
        const filtered = allSubmissions.filter((sub: any) => 
            (sub.Task?.projectId || sub.Task?.ProjectId)?.toString() === filterProjectId.toString()
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
      await api.post(`/tasks/${taskId}/${type}`, { comment });
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
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="text-indigo-600">
        <FiShield size={40} />
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-black tracking-tight text-gray-900">Quality Control</h1>
        <div className="relative w-96">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text"
            placeholder="Search submissions..."
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-600/20"
          />
        </div>
      </header>

      <main className="p-8 max-w-5xl mx-auto">
        <div className="mb-10">
          <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2 block">QA Gatekeeper</label>
          <h2 className="text-4xl font-black text-gray-900 tracking-tight">Review Queue</h2>
          <p className="font-medium italic text-gray-500 mt-2">Validate deliverables before they contribute to project milestones.</p>
        </div>

        <div className="grid gap-6">
          {tasks.length === 0 ? (
            <div className="bg-white py-24 text-center rounded-[2.5rem] border border-dashed border-gray-200">
              <FiInbox size={48} className="mx-auto mb-4 opacity-10 text-gray-900" />
              <p className="font-black uppercase tracking-widest text-[10px] text-gray-400">Queue is currently clear</p>
            </div>
          ) : (
            tasks.map(submission => {
              const task = submission.Task;
              const taskId = task?.TaskId || task?.taskId;
              const employeeName = submission.Employee?.FullName || "Team Member";

              return (
                <motion.div 
                  layout
                  key={submission.SubmissionId} 
                  className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6 transition-all hover:shadow-xl group relative overflow-hidden"
                >
                  <div className="flex-1 relative z-10">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-[10px] font-black px-3 py-1 bg-amber-100 text-amber-700 rounded-full uppercase tracking-widest border border-amber-200">
                        Awaiting Audit
                      </span>
                      <span className="flex items-center gap-1 text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                        <FiUser /> {employeeName}
                      </span>
                    </div>
                    
                    <h3 className="text-xl font-black text-gray-900 tracking-tight mb-2">{task?.Title || task?.title}</h3>
                    <p className="text-sm font-medium italic text-gray-500 mb-6 leading-relaxed max-w-xl">
                      {task?.Description || task?.description}
                    </p>
                    
                    <button 
                      onClick={() => handleDownloadWork(taskId, task?.Title)}
                      className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-indigo-200 hover:bg-white transition-all group/btn"
                    >
                      <div className="p-2 bg-indigo-600 text-white rounded-lg group-hover/btn:scale-110 transition-transform">
                        <FiDownload size={16} />
                      </div>
                      <div className="text-left">
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Deliverable</div>
                        <div className="text-sm font-bold text-gray-700">Audit Attached Files</div>
                      </div>
                    </button>
                  </div>
                  
                  <div className="flex gap-3 relative z-10 w-full md:w-auto">
                    <button 
                      onClick={() => setDecisionModal({ taskId, type: 'reject' })}
                      className="flex-1 md:flex-none px-8 py-4 bg-white border border-red-100 text-red-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-50 transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                      <FiX strokeWidth={3} /> Reject
                    </button>
                    <button 
                      onClick={() => setDecisionModal({ taskId, type: 'approve' })}
                      className="flex-1 md:flex-none px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-xl shadow-indigo-100"
                    >
                      <FiCheck strokeWidth={3} /> Approve
                    </button>
                  </div>

                  <FiShield className="absolute -bottom-6 -right-6 size-32 opacity-[0.03] text-gray-900 rotate-12 group-hover:rotate-0 transition-transform duration-500" />
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
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" 
              onClick={() => setDecisionModal(null)} 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white p-10 rounded-[2.5rem] w-full max-w-lg shadow-2xl"
            >
              <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mb-6 ${
                decisionModal.type === 'approve' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
              }`}>
                {decisionModal.type === 'approve' ? <FiCheckCircle size={32} /> : <FiXCircle size={32} />}
              </div>
              
              <h2 className="text-3xl font-black tracking-tight text-gray-900 mb-2">
                {decisionModal.type === 'approve' ? 'Confirm Approval' : 'Submit Rejection'}
              </h2>
              <p className="font-medium italic text-gray-500 mb-8">
                {decisionModal.type === 'approve' ? 'Deliverable will be marked as complete.' : 'Provide feedback on what needs to be fixed.'}
              </p>

              <div className="space-y-1 mb-8">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Reviewer Comments</label>
                <textarea
                  className="w-full p-4 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-600 font-medium leading-relaxed resize-none"
                  placeholder="Type your feedback here..." rows={4}
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                />
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={submitDecision}
                  className={`flex-[2] text-white p-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl transition-all hover:-translate-y-1 ${
                    decisionModal.type === 'approve' ? 'bg-emerald-600 shadow-emerald-100' : 'bg-red-600 shadow-red-100'
                  }`}
                >
                  Confirm {decisionModal.type}
                </button>
                <button 
                  onClick={() => setDecisionModal(null)} 
                  className="flex-1 bg-gray-100 text-gray-500 p-5 rounded-2xl font-black text-sm uppercase tracking-widest"
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
              className={`pointer-events-auto flex items-center gap-3 px-6 py-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] bg-white border-l-4 min-w-[320px] ${
                toast.type === 'error' ? 'border-red-600' : 'border-emerald-600'
              }`}
            >
              {toast.type === 'error' ? <FiXCircle className="text-red-600 text-xl" /> : <FiCheckCircle className="text-emerald-600 text-xl" />}
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">System Feedback</span>
                <span className="text-sm font-bold text-gray-700">{toast.message}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default QAReview;