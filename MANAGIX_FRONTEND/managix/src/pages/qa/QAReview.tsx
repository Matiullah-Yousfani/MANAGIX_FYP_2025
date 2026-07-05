import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Select } from '../../components/ui';
import api from '../../api/axiosInstance';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiShield, FiDownload, FiCheck, FiX, FiUser,
  FiFileText, FiSearch, FiInbox, FiCheckCircle, FiXCircle,
  FiClock, FiAlertTriangle, FiFilter, FiBriefcase,
} from 'react-icons/fi';
import PriorityBadge from '../../components/PriorityBadge';

type ReviewTab = 'pending' | 'approved' | 'rejected';
type SortKey = 'newest' | 'oldest' | 'priority' | 'project' | 'deadline' | 'waiting';

type QaStats = {
  pendingReviews: number;
  approvedToday: number;
  rejectedToday: number;
  projectsAssigned: number;
  averageReviewHours: number | null;
  completionRate: number | null;
  overdue2Days: number;
  overdue3Days: number;
  overdue5Days: number;
};

type ReviewItem = {
  submissionId: string;
  taskId: string;
  status: string;
  submittedAt: string;
  reviewedAt?: string | null;
  comment?: string | null;
  qaComment?: string | null;
  fileName?: string | null;
  task?: {
    taskId: string;
    title: string;
    description?: string;
    status: string;
    projectId: string;
    milestoneId?: string;
    priority?: string;
    deadline?: string;
    assignedEmployeeId?: string;
  };
  project?: { projectId: string; title: string } | null;
  milestone?: { milestoneId: string; title: string } | null;
  employee?: { userId: string; fullName: string } | null;
};

const PRIORITY_ORDER: Record<string, number> = { High: 0, Medium: 1, Low: 2 };

const daysWaiting = (submittedAt: string) => {
  const ms = Date.now() - new Date(submittedAt).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
};

const formatHours = (h: number | null | undefined) => {
  if (h == null || Number.isNaN(h)) return '—';
  if (h < 1) return `${Math.round(h * 60)}m`;
  return `${h.toFixed(1)}h`;
};

const QAReview = () => {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [stats, setStats] = useState<QaStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'error' | 'success' }[]>([]);

  const [tab, setTab] = useState<ReviewTab>('pending');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('newest');
  const [filterProject, setFilterProject] = useState('');
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterPriority, setFilterPriority] = useState('');

  const [selectedItem, setSelectedItem] = useState<ReviewItem | null>(null);
  const [decisionModal, setDecisionModal] = useState<{ taskId: string; type: 'approve' | 'reject' } | null>(null);
  const [comment, setComment] = useState('');

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const filterProjectId = queryParams.get('projectId');
  const deepLinkTaskId = queryParams.get('taskId');

  const addToast = (message: string, type: 'error' | 'success' = 'error') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const normalizeItem = (raw: any): ReviewItem => ({
    submissionId: String(raw.submissionId ?? raw.SubmissionId ?? ''),
    taskId: String(raw.taskId ?? raw.TaskId ?? raw.task?.taskId ?? ''),
    status: raw.status ?? raw.Status ?? 'Submitted',
    submittedAt: raw.submittedAt ?? raw.SubmittedAt ?? new Date().toISOString(),
    reviewedAt: raw.reviewedAt ?? raw.ReviewedAt,
    comment: raw.comment ?? raw.Comment,
    qaComment: raw.qaComment ?? raw.QAComment,
    fileName: raw.fileName ?? raw.FileName,
    task: raw.task ?? raw.Task,
    project: raw.project ?? raw.Project,
    milestone: raw.milestone ?? raw.Milestone,
    employee: raw.employee ?? raw.Employee,
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [pendingRes, historyRes, statsRes] = await Promise.all([
        api.get('/tasks/pending-review'),
        api.get('/tasks/qa/history'),
        api.get('/tasks/qa/stats'),
      ]);

      const pending = (Array.isArray(pendingRes.data) ? pendingRes.data : []).map(normalizeItem);
      const history = (Array.isArray(historyRes.data) ? historyRes.data : []).map(normalizeItem);

      const seen = new Set(pending.map((p) => p.taskId));
      const merged = [
        ...pending,
        ...history.filter((h) => !seen.has(h.taskId) || h.status !== 'Submitted'),
      ];

      const uniqueBySubmission = new Map<string, ReviewItem>();
      merged.forEach((item) => {
        const key = item.submissionId || item.taskId;
        if (!uniqueBySubmission.has(key)) uniqueBySubmission.set(key, item);
      });

      let all = Array.from(uniqueBySubmission.values());

      if (filterProjectId) {
        all = all.filter(
          (sub) => String(sub.task?.projectId ?? '') === filterProjectId.toString(),
        );
      }

      setItems(all);
      setStats(statsRes.data ?? null);
    } catch (err: any) {
      addToast(`Review fetch failed: ${err.response?.data?.message ?? err.response?.status ?? 'Server error'}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [filterProjectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!deepLinkTaskId || items.length === 0) return;
    const match = items.find((i) => i.taskId === deepLinkTaskId);
    if (match) {
      setSelectedItem(match);
      if (match.status === 'Submitted') setTab('pending');
      else if (match.status === 'Approved') setTab('approved');
      else if (match.status === 'Rejected') setTab('rejected');
    }
  }, [deepLinkTaskId, items]);

  const projectOptions = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach((i) => {
      const id = i.project?.projectId ?? i.task?.projectId;
      const title = i.project?.title ?? 'Unknown project';
      if (id) map.set(String(id), title);
    });
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [items]);

  const employeeOptions = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach((i) => {
      const id = i.employee?.userId ?? i.task?.assignedEmployeeId;
      const name = i.employee?.fullName ?? 'Team member';
      if (id) map.set(String(id), name);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [items]);

  const filteredItems = useMemo(() => {
    let list = items.filter((item) => {
      if (tab === 'pending') return item.status === 'Submitted';
      if (tab === 'approved') return item.status === 'Approved';
      return item.status === 'Rejected';
    });

    if (filterProject) {
      list = list.filter((i) => String(i.task?.projectId ?? '') === filterProject);
    }
    if (filterEmployee) {
      list = list.filter(
        (i) => String(i.employee?.userId ?? i.task?.assignedEmployeeId ?? '') === filterEmployee,
      );
    }
    if (filterPriority) {
      list = list.filter((i) => (i.task?.priority ?? 'Medium') === filterPriority);
    }

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((i) => {
        const title = (i.task?.title ?? '').toLowerCase();
        const project = (i.project?.title ?? '').toLowerCase();
        const employee = (i.employee?.fullName ?? '').toLowerCase();
        return title.includes(q) || project.includes(q) || employee.includes(q);
      });
    }

    list = [...list].sort((a, b) => {
      switch (sortKey) {
        case 'oldest':
          return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
        case 'priority': {
          const pa = PRIORITY_ORDER[a.task?.priority ?? 'Medium'] ?? 1;
          const pb = PRIORITY_ORDER[b.task?.priority ?? 'Medium'] ?? 1;
          return pa - pb;
        }
        case 'project':
          return (a.project?.title ?? '').localeCompare(b.project?.title ?? '');
        case 'deadline': {
          const da = a.task?.deadline ? new Date(a.task.deadline).getTime() : Infinity;
          const db = b.task?.deadline ? new Date(b.task.deadline).getTime() : Infinity;
          return da - db;
        }
        case 'waiting':
          return daysWaiting(b.submittedAt) - daysWaiting(a.submittedAt);
        case 'newest':
        default:
          return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
      }
    });

    return list;
  }, [items, tab, search, sortKey, filterProject, filterEmployee, filterPriority]);

  const recentlyReviewed = useMemo(
    () => items
      .filter((i) => i.status === 'Approved' || i.status === 'Rejected')
      .sort((a, b) => new Date(b.reviewedAt ?? b.submittedAt).getTime() - new Date(a.reviewedAt ?? a.submittedAt).getTime())
      .slice(0, 5),
    [items],
  );

  const submitDecision = async () => {
    if (!decisionModal) return;
    if (decisionModal.type === 'reject' && !comment.trim()) {
      addToast('A rejection reason is required.', 'error');
      return;
    }
    try {
      const { taskId, type } = decisionModal;
      if (type === 'approve') {
        await api.post(`/tasks/${taskId}/approve`, { qaComment: comment.trim() || undefined });
      } else {
        await api.post(`/tasks/${taskId}/reject`, { qaComment: comment.trim() });
      }
      addToast(`Task successfully ${type === 'approve' ? 'approved' : 'rejected'}`, 'success');
      setDecisionModal(null);
      setComment('');
      setSelectedItem(null);
      fetchData();
    } catch (err: any) {
      addToast(err.response?.data?.message ?? 'Failed to update task status', 'error');
    }
  };

  const handleDownloadWork = async (taskId: string, title: string) => {
    try {
      const res = await api.get(`/tasks/${taskId}/submission`);
      const { fileBase64, fileName } = res.data;
      if (!fileBase64) {
        addToast('No file attached to this submission', 'error');
        return;
      }
      const link = document.createElement('a');
      link.href = `data:application/octet-stream;base64,${fileBase64}`;
      link.download = fileName || `${title}_Review.dat`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      addToast('Download started', 'success');
    } catch {
      addToast('Could not download deliverable', 'error');
    }
  };

  const openReview = (item: ReviewItem) => {
    setSelectedItem(item);
    setComment('');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center ">
        <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="text-indigo-600">
          <FiShield size={40} />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen ">
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200/70 px-8 py-4 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Quality Control</h1>
        <div className="relative w-96 max-w-full">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search tasks, projects, employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-600/20"
          />
        </div>
      </header>

      <main className="p-8 max-w-6xl mx-auto">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
            {[
              { label: 'Pending Reviews', value: stats.pendingReviews, tone: 'amber' },
              { label: 'Approved Today', value: stats.approvedToday, tone: 'emerald' },
              { label: 'Rejected Today', value: stats.rejectedToday, tone: 'red' },
              { label: 'Projects Assigned', value: stats.projectsAssigned, tone: 'indigo' },
              { label: 'Avg Review Time', value: formatHours(stats.averageReviewHours), tone: 'slate' },
            ].map((card) => (
              <div key={card.label} className="bg-white rounded-2xl border border-gray-200/70 p-5 shadow-sm">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 mb-1">{card.label}</p>
                <p className="text-2xl font-extrabold text-gray-900">{card.value}</p>
              </div>
            ))}
          </div>
        )}

        {(stats?.overdue2Days ?? 0) > 0 && (
          <div className="mb-8 flex flex-wrap gap-3">
            {stats!.overdue2Days > 0 && (
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-800 rounded-xl text-xs font-bold border border-amber-200">
                <FiAlertTriangle /> {stats!.overdue2Days} waiting 2+ days
              </span>
            )}
            {stats!.overdue3Days > 0 && (
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-800 rounded-xl text-xs font-bold border border-orange-200">
                <FiClock /> {stats!.overdue3Days} waiting 3+ days
              </span>
            )}
            {stats!.overdue5Days > 0 && (
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-800 rounded-xl text-xs font-bold border border-red-200">
                <FiAlertTriangle /> {stats!.overdue5Days} waiting 5+ days
              </span>
            )}
          </div>
        )}

        <div className="mb-6 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <label className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-widest mb-2 block">QA Gatekeeper</label>
            <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">Review Queue</h2>
            <p className="font-medium italic text-gray-500 mt-2">Validate deliverables before they contribute to project milestones.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {(['pending', 'approved', 'rejected'] as ReviewTab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-widest transition-all ${
                  tab === t ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-gray-500 border border-gray-200 hover:border-indigo-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-3 items-center bg-white p-4 rounded-2xl border border-gray-200/70">
          <FiFilter className="text-gray-400" />
          <Select
            value={filterProject}
            onChange={setFilterProject}
            className="w-44"
            placeholder="All projects"
            options={[{ value: '', label: 'All projects' }, ...projectOptions.map((p) => ({ value: p.id, label: p.title }))]}
          />
          <Select
            value={filterEmployee}
            onChange={setFilterEmployee}
            className="w-44"
            placeholder="All employees"
            options={[{ value: '', label: 'All employees' }, ...employeeOptions.map((e) => ({ value: e.id, label: e.name }))]}
          />
          <Select
            value={filterPriority}
            onChange={setFilterPriority}
            className="w-40"
            placeholder="All priorities"
            options={[
              { value: '', label: 'All priorities' },
              { value: 'High', label: 'High' },
              { value: 'Medium', label: 'Medium' },
              { value: 'Low', label: 'Low' },
            ]}
          />
          <Select
            value={sortKey}
            onChange={(v) => setSortKey(v as SortKey)}
            className="w-44 ml-auto"
            options={[
              { value: 'newest', label: 'Newest first' },
              { value: 'oldest', label: 'Oldest first' },
              { value: 'priority', label: 'Priority' },
              { value: 'project', label: 'Project' },
              { value: 'deadline', label: 'Deadline' },
              { value: 'waiting', label: 'Days waiting' },
            ]}
          />
        </div>

        <div className="grid gap-4">
          {filteredItems.length === 0 ? (
            <div className="bg-white py-24 text-center rounded-2xl border border-dashed border-gray-200">
              <FiInbox size={48} className="mx-auto mb-4 opacity-10 text-gray-900" />
              <p className="font-extrabold uppercase tracking-widest text-[10px] text-gray-400">
                {tab === 'pending' ? 'Queue is currently clear' : `No ${tab} tasks`}
              </p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const waiting = daysWaiting(item.submittedAt);
              const overdue = waiting >= 2;
              return (
                <motion.div
                  layout
                  key={item.submissionId || item.taskId}
                  className="bg-white p-6 rounded-2xl border border-gray-200/70 shadow-sm hover:shadow-md transition-all cursor-pointer"
                  onClick={() => openReview(item)}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-widest border ${
                          item.status === 'Submitted'
                            ? 'bg-amber-100 text-amber-700 border-amber-200'
                            : item.status === 'Approved'
                              ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                              : 'bg-red-100 text-red-700 border-red-200'
                        }`}>
                          {item.status === 'Submitted' ? 'Pending QA Review' : item.status}
                        </span>
                        {item.task?.priority && <PriorityBadge priority={item.task.priority} />}
                        {overdue && tab === 'pending' && (
                          <span className="text-[10px] font-extrabold text-red-600 uppercase tracking-widest flex items-center gap-1">
                            <FiAlertTriangle size={12} /> {waiting}d waiting
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-extrabold text-gray-900 truncate">{item.task?.title}</h3>
                      <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500 font-medium">
                        <span className="flex items-center gap-1"><FiBriefcase size={12} /> {item.project?.title ?? 'Project'}</span>
                        <span className="flex items-center gap-1"><FiUser size={12} /> {item.employee?.fullName ?? 'Team member'}</span>
                        <span className="flex items-center gap-1"><FiClock size={12} /> {new Date(item.submittedAt).toLocaleString()}</span>
                      </div>
                    </div>
                    {tab === 'pending' && (
                      <div className="flex gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => { setSelectedItem(item); setDecisionModal({ taskId: item.taskId, type: 'reject' }); }}
                          className="px-4 py-2 bg-white border border-red-100 text-red-600 rounded-xl font-extrabold text-xs uppercase tracking-widest hover:bg-red-50"
                        >
                          <FiX className="inline mr-1" /> Reject
                        </button>
                        <button
                          type="button"
                          onClick={() => { setSelectedItem(item); setDecisionModal({ taskId: item.taskId, type: 'approve' }); }}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-extrabold text-xs uppercase tracking-widest hover:bg-indigo-700"
                        >
                          <FiCheck className="inline mr-1" /> Approve
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {recentlyReviewed.length > 0 && tab === 'pending' && (
          <div className="mt-12">
            <h3 className="text-sm font-extrabold uppercase tracking-widest text-gray-400 mb-4">Recently Reviewed</h3>
            <div className="grid gap-2">
              {recentlyReviewed.map((item) => (
                <button
                  key={item.submissionId}
                  type="button"
                  onClick={() => openReview(item)}
                  className="text-left bg-white px-4 py-3 rounded-xl border border-gray-200/70 hover:border-indigo-200 transition-all flex justify-between items-center"
                >
                  <span className="font-bold text-gray-800 text-sm truncate">{item.task?.title}</span>
                  <span className={`text-[10px] font-extrabold uppercase ${item.status === 'Approved' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {item.status}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Task review detail modal */}
      <AnimatePresence>
        {selectedItem && !decisionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-md"
              onClick={() => setSelectedItem(null)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white p-8 rounded-[2rem] w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600 mb-1">Task Review</p>
                  <h2 className="text-2xl font-extrabold text-gray-900">{selectedItem.task?.title}</h2>
                </div>
                {selectedItem.task?.priority && <PriorityBadge priority={selectedItem.task.priority} />}
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                <div><span className="text-gray-400 font-bold text-xs uppercase">Project</span><p className="font-semibold">{selectedItem.project?.title ?? '—'}</p></div>
                <div><span className="text-gray-400 font-bold text-xs uppercase">Milestone</span><p className="font-semibold">{selectedItem.milestone?.title ?? '—'}</p></div>
                <div><span className="text-gray-400 font-bold text-xs uppercase">Employee</span><p className="font-semibold">{selectedItem.employee?.fullName ?? '—'}</p></div>
                <div><span className="text-gray-400 font-bold text-xs uppercase">Submitted</span><p className="font-semibold">{new Date(selectedItem.submittedAt).toLocaleString()}</p></div>
                {selectedItem.task?.deadline && (
                  <div><span className="text-gray-400 font-bold text-xs uppercase">Deadline</span><p className="font-semibold">{new Date(selectedItem.task.deadline).toLocaleDateString()}</p></div>
                )}
              </div>

              {selectedItem.task?.description && (
                <div className="mb-6">
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 mb-2">Description</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{selectedItem.task.description}</p>
                </div>
              )}

              {selectedItem.comment && (
                <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 mb-1">Employee comment</p>
                  <p className="text-sm text-gray-700">{selectedItem.comment}</p>
                </div>
              )}

              {selectedItem.qaComment && (
                <div className="mb-6 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-500 mb-1">Previous QA feedback</p>
                  <p className="text-sm text-gray-700">{selectedItem.qaComment}</p>
                </div>
              )}

              <button
                type="button"
                onClick={() => handleDownloadWork(selectedItem.taskId, selectedItem.task?.title ?? 'task')}
                className="w-full flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-indigo-200 mb-6"
              >
                <div className="p-2 bg-indigo-600 text-white rounded-lg"><FiDownload size={16} /></div>
                <div className="text-left">
                  <div className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Deliverable</div>
                  <div className="text-sm font-bold text-gray-700">{selectedItem.fileName ?? 'Download attached files'}</div>
                </div>
              </button>

              {selectedItem.status === 'Submitted' && (
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setDecisionModal({ taskId: selectedItem.taskId, type: 'reject' })}
                    className="flex-1 py-4 border border-red-200 text-red-600 rounded-2xl font-extrabold text-xs uppercase tracking-widest hover:bg-red-50"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => setDecisionModal({ taskId: selectedItem.taskId, type: 'approve' })}
                    className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-extrabold text-xs uppercase tracking-widest hover:bg-indigo-700"
                  >
                    Approve
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="w-full mt-3 py-3 text-gray-500 font-bold text-sm"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Approve / Reject modal */}
      <AnimatePresence>
        {decisionModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-md"
              onClick={() => setDecisionModal(null)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white p-10 rounded-2xl w-full max-w-lg shadow-2xl"
            >
              <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mb-6 ${
                decisionModal.type === 'approve' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
              }`}>
                {decisionModal.type === 'approve' ? <FiCheckCircle size={32} /> : <FiXCircle size={32} />}
              </div>

              <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 mb-2">
                {decisionModal.type === 'approve' ? 'Confirm Approval' : 'Submit Rejection'}
              </h2>
              <p className="font-medium italic text-gray-500 mb-8">
                {decisionModal.type === 'approve'
                  ? 'Deliverable will be marked as complete.'
                  : 'Provide a clear reason so the employee knows what to fix.'}
              </p>

              <div className="space-y-1 mb-8">
                <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest ml-1">
                  {decisionModal.type === 'reject' ? 'Rejection reason (required)' : 'Reviewer comments (optional)'}
                </label>
                <textarea
                  className="w-full p-4 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-indigo-600 font-medium leading-relaxed resize-none"
                  placeholder={decisionModal.type === 'reject'
                    ? 'e.g. Code does not meet acceptance criteria...'
                    : 'Optional approval notes...'}
                  rows={4}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  required={decisionModal.type === 'reject'}
                />
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={submitDecision}
                  disabled={decisionModal.type === 'reject' && !comment.trim()}
                  className={`flex-[2] text-white p-5 rounded-2xl font-extrabold text-sm uppercase tracking-widest shadow-xl transition-all hover:-translate-y-1 disabled:opacity-40 disabled:hover:translate-y-0 ${
                    decisionModal.type === 'approve' ? 'bg-emerald-600 shadow-emerald-100' : 'bg-red-600 shadow-red-100'
                  }`}
                >
                  Confirm {decisionModal.type}
                </button>
                <button
                  type="button"
                  onClick={() => setDecisionModal(null)}
                  className="flex-1 bg-gray-100 text-gray-500 p-5 rounded-2xl font-extrabold text-sm uppercase tracking-widest"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 mb-1">System Feedback</span>
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
