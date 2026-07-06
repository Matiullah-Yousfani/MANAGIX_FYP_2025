import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiUsers, FiBriefcase, FiClock, FiAlertTriangle,
  FiActivity, FiTrendingUp, FiShield, FiCheckCircle,
  FiChevronRight, FiLayers, FiArrowLeft, FiBell,
} from 'react-icons/fi';
import { monitoringService, type AdminDashboard as AdminDashboardData, heatColor } from '../../api/monitoringService';
import ProjectGantt from '../ProjectGantt';
import { adminService } from '../../api/adminService';

type DetailView =
  | 'users'
  | 'projects'
  | 'project-detail'
  | 'tasks'
  | 'approvals'
  | 'workload'
  | 'managers'
  | 'qa'
  | 'timesheets'
  | 'meetings'
  | 'ai'
  | 'analytics'
  | 'activity'
  | 'alerts';

type TaskFilter = 'all' | 'Pending' | 'In Progress' | 'Completed' | 'Approved' | 'Pending QA Review' | 'Rejected';
type ProjectFilter = 'all' | 'Active' | 'Completed' | 'Delayed';
type UserFilter = 'all' | 'Managers' | 'Employees' | 'QA' | 'Admins' | 'Other';

const DETAIL_VIEWS: DetailView[] = [
  'users', 'projects', 'project-detail', 'tasks', 'approvals', 'workload',
  'managers', 'qa', 'timesheets', 'meetings', 'ai', 'analytics', 'activity', 'alerts',
];

const parseDetailView = (raw: string | null): DetailView | null => {
  if (!raw) return null;
  return DETAIL_VIEWS.includes(raw as DetailView) ? (raw as DetailView) : null;
};

const parseTaskFilter = (raw: string | null): TaskFilter => {
  const allowed: TaskFilter[] = ['all', 'Pending', 'In Progress', 'Completed', 'Approved', 'Pending QA Review', 'Rejected'];
  if (!raw || raw === 'all') return 'all';
  return allowed.includes(raw as TaskFilter) ? (raw as TaskFilter) : 'all';
};

const parseProjectFilter = (raw: string | null): ProjectFilter => {
  const allowed: ProjectFilter[] = ['all', 'Active', 'Completed', 'Delayed'];
  if (!raw || raw === 'all') return 'all';
  return allowed.includes(raw as ProjectFilter) ? (raw as ProjectFilter) : 'all';
};

const parseUserFilter = (raw: string | null): UserFilter => {
  const allowed: UserFilter[] = ['all', 'Managers', 'Employees', 'QA', 'Admins', 'Other'];
  if (!raw || raw === 'all') return 'all';
  return allowed.includes(raw as UserFilter) ? (raw as UserFilter) : 'all';
};

const CHART_COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

const STATUS_COLORS: Record<string, string> = {
  Pending: '#F59E0B',
  Todo: '#F59E0B',
  'In Progress': '#3B82F6',
  InProgress: '#3B82F6',
  Completed: '#10B981',
  Done: '#10B981',
  Approved: '#059669',
  'Pending QA Review': '#8B5CF6',
  Rejected: '#EF4444',
};

const ROLE_COLORS: Record<string, string> = {
  Managers: '#4F46E5',
  Employees: '#10B981',
  QA: '#8B5CF6',
  Admins: '#F59E0B',
  Other: '#6B7280',
};

const PROJECT_COLORS: Record<string, string> = {
  Active: '#4F46E5',
  Completed: '#10B981',
  Delayed: '#EF4444',
  'On Hold': '#F59E0B',
};

const AnimatedDonutChart: React.FC<{
  segments: { label: string; value: number; color: string }[];
  total: number;
  animKey: number;
  unit?: string;
}> = ({ segments, total, animKey, unit = 'items' }) => {
  const radius = 72;
  const stroke = 22;
  const circumference = 2 * Math.PI * radius;
  let cumulative = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-8">
      <div className="relative w-48 h-48 shrink-0">
        <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
          <circle cx="100" cy="100" r={radius} fill="none" stroke="#F3F4F6" strokeWidth={stroke} />
          {segments.filter((s) => s.value > 0).map((seg, i) => {
            const dash = total > 0 ? (seg.value / total) * circumference : 0;
            const offset = cumulative;
            cumulative += dash;
            return (
              <motion.circle
                key={`${animKey}-${seg.label}`}
                cx="100"
                cy="100"
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={stroke}
                strokeLinecap="round"
                initial={{ strokeDasharray: `0 ${circumference}`, strokeDashoffset: -offset }}
                animate={{ strokeDasharray: `${dash} ${circumference - dash}`, strokeDashoffset: -offset }}
                transition={{ duration: 0.9, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <motion.span
            key={`total-${animKey}`}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="text-2xl font-extrabold text-gray-900"
          >
            {total}
          </motion.span>
          <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">{unit}</span>
        </div>
      </div>
      <div className="space-y-3 flex-1 w-full">
        {segments.filter((s) => s.value > 0).map((seg, i) => (
          <motion.div
            key={seg.label}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.08 }}
            className="flex items-center justify-between text-sm"
          >
            <div className="flex items-center gap-2">
              <span className="size-3 rounded-full shrink-0" style={{ background: seg.color }} />
              <span className="font-bold text-gray-700">{seg.label}</span>
            </div>
            <span className="font-extrabold text-gray-900">{seg.value}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const AnimatedTaskBarChart: React.FC<{
  data: { label: string; value: number; color: string }[];
  animKey: number;
}> = ({ data, animKey }) => {
  const peak = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex items-end justify-center gap-6 h-44 px-2">
      {data.map((d, i) => (
        <div key={d.label} className="flex flex-col items-center gap-2 flex-1 max-w-[80px]">
          <motion.span
            key={`lbl-${animKey}-${d.label}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 + i * 0.1 }}
            className="text-sm font-extrabold text-gray-700"
          >
            {d.value}
          </motion.span>
          <div className="w-full h-32 flex items-end">
            <motion.div
              key={`bar-${animKey}-${d.label}`}
              initial={{ height: 0 }}
              animate={{ height: `${Math.max(8, (d.value / peak) * 100)}%` }}
              transition={{ duration: 0.75, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
              className="w-full rounded-t-2xl"
              style={{ background: d.color, minHeight: 8 }}
            />
          </div>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide text-center leading-tight">
            {d.label}
          </span>
        </div>
      ))}
    </div>
  );
};

const SummaryStatCard: React.FC<{
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  active: boolean;
  animKey: number;
  onClick: () => void;
}> = ({ label, value, icon, color, active, animKey, onClick }) => (
  <motion.button
    type="button"
    onClick={onClick}
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.45, ease: 'easeOut' }}
    className={`text-left rounded-2xl border p-6 transition-all hover:shadow-md ${
      active ? 'border-indigo-300 bg-indigo-50/60 shadow-md ring-2 ring-indigo-200' : 'border-gray-200/70 bg-white hover:border-gray-200'
    }`}
  >
    <div className="flex items-start justify-between">
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">{label}</p>
        <motion.p
          key={`${animKey}-${label}-${value}`}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5, type: 'spring', stiffness: 200 }}
          className="text-4xl font-extrabold mt-2"
          style={{ color }}
        >
          {value}
        </motion.p>
      </div>
      <div className="opacity-70" style={{ color }}>{icon}</div>
    </div>
  </motion.button>
);

const taskStatusTone = (status: string) => {
  const map: Record<string, string> = {
    Pending: 'bg-amber-100 text-amber-800 border-amber-200',
    Todo: 'bg-amber-100 text-amber-800 border-amber-200',
    'In Progress': 'bg-blue-100 text-blue-800 border-blue-200',
    InProgress: 'bg-blue-100 text-blue-800 border-blue-200',
    Completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    Done: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    Approved: 'bg-teal-100 text-teal-800 border-teal-200',
    'Pending QA Review': 'bg-violet-100 text-violet-800 border-violet-200',
    Rejected: 'bg-red-100 text-red-800 border-red-200',
  };
  return map[status] ?? 'bg-gray-100 text-gray-700 border-gray-200';
};

const matchesTaskFilter = (displayStatus: string, status: string, filter: TaskFilter) => {
  if (filter === 'all') return true;
  if (filter === 'Completed') return displayStatus === 'Completed' || status === 'Done' || status === 'Approved';
  if (filter === 'Pending') return displayStatus === 'Pending' || status === 'Todo';
  if (filter === 'In Progress') return displayStatus === 'In Progress' || status === 'InProgress';
  return displayStatus === filter || status === filter;
};

const projectRowCategory = (row: AdminDashboardData['projectHealthRows'][0]): ProjectFilter => {
  if (row.isClosed) return 'Completed';
  if (row.isOverdue) return 'Delayed';
  return 'Active';
};

const matchesProjectFilter = (row: AdminDashboardData['projectHealthRows'][0], filter: ProjectFilter) => {
  if (filter === 'all') return true;
  return projectRowCategory(row) === filter;
};

const matchesUserFilter = (role: string, filter: UserFilter) => {
  if (filter === 'all') return true;
  return role === filter;
};

const BarChart: React.FC<{ data: { label: string; value: number }[]; max?: number; color?: string }> = ({
  data, max, color = '#4F46E5',
}) => {
  const peak = max ?? Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex items-end gap-2 h-40">
      {data.map((d) => (
        <div key={d.label} className="flex-1 flex flex-col items-center gap-2 min-w-0">
          <span className="text-[10px] font-extrabold text-gray-500">{d.value}</span>
          <div className="w-full rounded-t-lg transition-all" style={{ height: `${Math.max(4, (d.value / peak) * 100)}%`, background: color, minHeight: 4 }} />
          <span className="text-[9px] font-bold text-gray-400 truncate w-full text-center">{d.label}</span>
        </div>
      ))}
    </div>
  );
};

const DetailShell: React.FC<{ title: string; subtitle?: string; onBack: () => void; children: React.ReactNode }> = ({
  title, subtitle, onBack, children,
}) => (
  <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="space-y-6">
    <button
      type="button"
      onClick={onBack}
      className="inline-flex items-center gap-2 text-sm font-extrabold text-indigo-600 uppercase tracking-widest hover:text-indigo-800"
    >
      <FiArrowLeft /> Control Center
    </button>
    <div>
      <h2 className="text-3xl font-extrabold text-gray-900">{title}</h2>
      {subtitle && <p className="text-gray-500 mt-1">{subtitle}</p>}
    </div>
    <div className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-8">{children}</div>
  </motion.div>
);

const workloadTone = (s: string) => {
  if (s === 'Overloaded') return 'bg-red-100 text-red-700 border-red-200';
  if (s === 'Busy') return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-emerald-100 text-emerald-700 border-emerald-200';
};

const roleBadgeTone = (role: string) => {
  if (role === 'Manager') return 'bg-violet-100 text-violet-700 border-violet-200';
  if (role === 'QA') return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-sky-100 text-sky-700 border-sky-200';
};

const userStatusTone = (status: string) => {
  const s = status.toLowerCase();
  if (s === 'online') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (s === 'overloaded') return 'bg-red-100 text-red-700 border-red-200';
  if (s === 'busy') return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-gray-100 text-gray-500 border-gray-200';
};

const activeColumnLabel = (role: string) => {
  if (role === 'Manager') return 'Active load';
  if (role === 'QA') return 'Pending reviews';
  return 'Active tasks';
};

const projectStatusLabel = (row: AdminDashboardData['projectHealthRows'][0]) => {
  if (row.isClosed) return { text: 'Completed', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
  if (row.isOverdue) return { text: 'Delayed', cls: 'bg-red-100 text-red-700 border-red-200' };
  return { text: 'Active', cls: 'bg-indigo-100 text-indigo-700 border-indigo-200' };
};

const HubCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  hint?: string;
  accent?: string;
  onClick: () => void;
  badge?: number;
}> = ({ icon, label, value, hint, accent = 'indigo', onClick, badge }) => {
  const border: Record<string, string> = {
    indigo: 'hover:border-indigo-300 hover:shadow-indigo-100',
    amber: 'hover:border-amber-300 hover:shadow-amber-100',
    red: 'hover:border-red-300 hover:shadow-red-100',
    emerald: 'hover:border-emerald-300 hover:shadow-emerald-100',
    violet: 'hover:border-violet-300 hover:shadow-violet-100',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative text-left bg-white rounded-2xl border border-gray-200/70 p-6 shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5 group ${border[accent] ?? border.indigo}`}
    >
      {badge != null && badge > 0 && (
        <span className="absolute top-4 right-4 size-6 bg-red-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
      <div className="text-indigo-600 mb-4 opacity-80 group-hover:scale-110 transition-transform">{icon}</div>
      <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">{label}</p>
      <p className="text-3xl font-extrabold text-gray-900 mt-1">{value}</p>
      {hint && <p className="text-xs text-gray-400 mt-2">{hint}</p>}
      <FiChevronRight className="absolute bottom-6 right-6 text-gray-300 group-hover:text-indigo-500 transition-colors" />
    </button>
  );
};

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ganttDetail, setGanttDetail] = useState<any>(null);
  const [ganttKey, setGanttKey] = useState(0);
  const [chartAnimKey, setChartAnimKey] = useState(0);
  const lastViewKey = useRef<string>('hub');

  const detailView = useMemo(() => parseDetailView(searchParams.get('view')), [searchParams]);
  const selectedProjectId = searchParams.get('projectId');
  const taskFilter = useMemo(() => parseTaskFilter(searchParams.get('filter')), [searchParams]);
  const projectFilter = useMemo(() => parseProjectFilter(searchParams.get('filter')), [searchParams]);
  const userFilter = useMemo(() => parseUserFilter(searchParams.get('filter')), [searchParams]);

  const viewKey = `${searchParams.get('view') ?? 'hub'}:${searchParams.get('projectId') ?? ''}`;

  const patchParams = useCallback((mutate: (p: URLSearchParams) => void, replace = false) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      mutate(next);
      return next;
    }, { replace });
  }, [setSearchParams]);

  const openDetail = useCallback((view: DetailView, opts?: { projectId?: string; filter?: string }) => {
    patchParams((p) => {
      p.set('view', view);
      if (opts?.projectId) p.set('projectId', opts.projectId);
      else p.delete('projectId');
      if (opts?.filter) p.set('filter', opts.filter);
      else p.delete('filter');
    });
  }, [patchParams]);

  const goHub = useCallback(() => {
    setSearchParams({}, { replace: false });
  }, [setSearchParams]);

  const goProjects = useCallback(() => {
    openDetail('projects');
  }, [openDetail]);

  const openProject = useCallback((id: string) => {
    openDetail('project-detail', { projectId: id });
  }, [openDetail]);

  const setTaskFilter = useCallback((filter: TaskFilter) => {
    patchParams((p) => {
      if (filter === 'all') p.delete('filter');
      else p.set('filter', filter);
    }, true);
  }, [patchParams]);

  const setProjectFilter = useCallback((filter: ProjectFilter) => {
    patchParams((p) => {
      if (filter === 'all') p.delete('filter');
      else p.set('filter', filter);
    }, true);
  }, [patchParams]);

  const setUserFilter = useCallback((filter: UserFilter) => {
    patchParams((p) => {
      if (filter === 'all') p.delete('filter');
      else p.set('filter', filter);
    }, true);
  }, [patchParams]);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const d = await monitoringService.dashboard();
      setData(d);
      setError(null);
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (viewKey === lastViewKey.current) return;
    lastViewKey.current = viewKey;
    if (searchParams.get('view')) setChartAnimKey((k) => k + 1);
  }, [viewKey, searchParams]);

  useEffect(() => {
    if (detailView === 'project-detail' && !selectedProjectId) {
      goProjects();
    }
  }, [detailView, selectedProjectId, goProjects]);

  useEffect(() => {
    if (!selectedProjectId) {
      setGanttDetail(null);
      return;
    }
    adminService.getAdminProjectDetailPage(selectedProjectId).then(setGanttDetail).catch(() => setGanttDetail(null));
    setGanttKey((k) => k + 1);
  }, [selectedProjectId]);

  const selectedProject = useMemo(
    () => data?.projectHealthRows?.find((p) => String(p.projectId) === selectedProjectId),
    [data, selectedProjectId],
  );

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-center">
        <FiAlertTriangle className="mx-auto text-red-500 mb-3" size={36} />
        <p className="font-bold text-gray-700">{error ?? 'No data'}</p>
      </div>
    );
  }

  const o = data.overview;
  const pa = data.pendingApprovals;
  const pendingTotal = pa.pendingUsers + pa.pendingTimesheets + pa.pendingQaReviews + pa.pendingProjectClosures;

  /* ─── HUB: minimal summary only ─── */
  if (!detailView) {
    return (
      <div className="space-y-8 pb-12 max-w-5xl">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-[0.3em] mb-1">Organization</p>
            <h1 className="text-3xl font-extrabold text-gray-900">Control Center</h1>
            <p className="text-sm text-gray-500 mt-1">Tap a card for full details.</p>
          </div>
          {pa.pendingUsers > 0 && (
            <button
              type="button"
              onClick={() => navigate('/admin?tab=users')}
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-extrabold text-xs uppercase tracking-widest hover:bg-indigo-700 shrink-0"
            >
              Approve Users ({pa.pendingUsers})
            </button>
          )}
        </div>

        {data.systemAlerts.length > 0 && (
          <button
            type="button"
            onClick={() => openDetail('alerts')}
            className="w-full flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 hover:shadow-md transition-all"
          >
            <FiAlertTriangle />
            <span className="font-bold text-sm flex-1 text-left">{data.systemAlerts.length} system alert(s) need attention</span>
            <FiChevronRight />
          </button>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <HubCard icon={<FiUsers size={22} />} label="People" value={o.totalUsers} hint={`${o.managers} managers · ${o.employees} staff · ${o.qa} QA`} onClick={() => openDetail('users')} />
          <HubCard icon={<FiBriefcase size={22} />} label="Projects" value={data.projectHealthRows.length} hint={`${o.activeProjects} active · ${o.overdueProjects} overdue`} accent={o.overdueProjects > 0 ? 'amber' : 'indigo'} onClick={() => openDetail('projects')} />
          <HubCard icon={<FiClock size={22} />} label="Tasks" value={o.pendingTasks} hint="Charts & task details" onClick={() => openDetail('tasks')} />
          <HubCard icon={<FiBell size={22} />} label="Pending approvals" value={pendingTotal} hint="Users, timesheets, QA, closures" accent={pendingTotal > 0 ? 'amber' : 'indigo'} badge={pendingTotal} onClick={() => openDetail('approvals')} />
          <HubCard icon={<FiTrendingUp size={22} />} label="Workload" value={data.employeeWorkload.length} hint={`${o.overloadedEmployees} overloaded · employees, managers & QA`} accent={o.overloadedEmployees > 0 ? 'red' : 'emerald'} onClick={() => openDetail('workload')} />
          <HubCard icon={<FiShield size={22} />} label="QA queue" value={pa.pendingQaReviews} hint="Awaiting review" accent={pa.pendingQaReviews > 0 ? 'amber' : 'indigo'} onClick={() => openDetail('qa')} />
          <HubCard icon={<FiLayers size={22} />} label="Timelines" value={data.projectHealthRows.length} hint="Gantt per project" onClick={() => openDetail('projects')} />
          <HubCard icon={<FiBarChart2Icon />} label="Analytics" value="→" hint="Trends, hours, managers" onClick={() => openDetail('analytics')} />
          <HubCard icon={<FiActivity size={22} />} label="Activity" value={data.recentActivity.length} hint="Recent notifications" onClick={() => openDetail('activity')} />
        </div>
      </div>
    );
  }

  /* ─── DETAIL VIEWS ─── */
  return (
    <div className="pb-12 max-w-5xl">
      <AnimatePresence mode="wait">
        {detailView === 'users' && (() => {
          const ud = data.userDistribution;
          const managers = ud.Managers ?? o.managers;
          const employees = ud.Employees ?? o.employees;
          const qa = ud.QA ?? o.qa;
          const admins = ud.Admins ?? o.admins;
          const other = ud.Other ?? 0;

          const chartSegments = [
            { label: 'Managers', value: managers, color: ROLE_COLORS.Managers },
            { label: 'Employees', value: employees, color: ROLE_COLORS.Employees },
            { label: 'QA', value: qa, color: ROLE_COLORS.QA },
            { label: 'Admins', value: admins, color: ROLE_COLORS.Admins },
            ...(other > 0 ? [{ label: 'Other', value: other, color: ROLE_COLORS.Other }] : []),
          ].filter((s) => s.value > 0);

          const barData = chartSegments.map((s) => ({ label: s.label, value: s.value, color: s.color }));
          const totalPeople = chartSegments.reduce((sum, s) => sum + s.value, 0);
          const filteredUsers = (data.userRows ?? []).filter((u) => matchesUserFilter(u.role, userFilter));
          const filterLabel = userFilter === 'all' ? 'All people' : `${userFilter}`;

          return (
            <DetailShell key="users" title="People & Roles" subtitle="Organization-wide user analytics" onBack={goHub}>
              <div className="space-y-8">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <SummaryStatCard label="Managers" value={managers} icon={<FiBriefcase size={24} />} color={ROLE_COLORS.Managers} active={userFilter === 'Managers'} animKey={chartAnimKey} onClick={() => setUserFilter(userFilter === 'Managers' ? 'all' : 'Managers')} />
                  <SummaryStatCard label="Employees" value={employees} icon={<FiUsers size={24} />} color={ROLE_COLORS.Employees} active={userFilter === 'Employees'} animKey={chartAnimKey} onClick={() => setUserFilter(userFilter === 'Employees' ? 'all' : 'Employees')} />
                  <SummaryStatCard label="QA" value={qa} icon={<FiShield size={24} />} color={ROLE_COLORS.QA} active={userFilter === 'QA'} animKey={chartAnimKey} onClick={() => setUserFilter(userFilter === 'QA' ? 'all' : 'QA')} />
                  <SummaryStatCard label="Admins" value={admins} icon={<FiActivity size={24} />} color={ROLE_COLORS.Admins} active={userFilter === 'Admins'} animKey={chartAnimKey} onClick={() => setUserFilter(userFilter === 'Admins' ? 'all' : 'Admins')} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="p-6 bg-gray-50 rounded-2xl border border-gray-200/70">
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 mb-6">Role distribution</p>
                    <AnimatedDonutChart segments={chartSegments} total={totalPeople} animKey={chartAnimKey} unit="people" />
                  </div>
                  <div className="p-6 bg-gray-50 rounded-2xl border border-gray-200/70">
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 mb-6">People overview</p>
                    <AnimatedTaskBarChart data={barData} animKey={chartAnimKey} />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <h3 className="font-extrabold text-gray-800">{filterLabel}</h3>
                    {userFilter !== 'all' && (
                      <button type="button" onClick={() => setUserFilter('all')} className="text-xs font-extrabold text-indigo-600 uppercase tracking-widest hover:underline">Show all</button>
                    )}
                  </div>
                  {filteredUsers.length === 0 ? (
                    <p className="text-gray-400 italic py-8 text-center bg-gray-50 rounded-2xl">No users in this category.</p>
                  ) : (
                    <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                      {filteredUsers.map((user, i) => (
                        <motion.div
                          key={user.userId}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(i * 0.03, 0.4) }}
                          className="flex items-center gap-4 p-4 rounded-xl border border-gray-200/70 bg-white"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-900 truncate">{user.fullName}</p>
                            <p className="text-xs text-gray-500 truncate">{user.email}</p>
                            {user.statusReason && (
                              <p className="text-[11px] text-gray-400 mt-1 line-clamp-2" title={user.statusReason}>
                                {user.statusReason}
                              </p>
                            )}
                          </div>
                          <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full border uppercase bg-indigo-50 text-indigo-700 border-indigo-200">{user.role}</span>
                          <span
                            className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border uppercase ${userStatusTone(user.status)}`}
                            title={user.statusReason || undefined}
                          >
                            {user.status}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>

                <button type="button" onClick={() => navigate('/admin?tab=all-users')} className="text-sm font-extrabold text-indigo-600 uppercase tracking-widest hover:underline">
                  Open user directory in Admin Portal →
                </button>
              </div>
            </DetailShell>
          );
        })()}

        {detailView === 'projects' && (() => {
          const ps = data.projectStatus;
          const activeCount = ps.Active ?? o.activeProjects;
          const completedCount = ps.Completed ?? o.completedProjects;
          const delayedCount = ps.Delayed ?? o.overdueProjects;
          const onHold = ps['On Hold'] ?? 0;

          const chartSegments = [
            { label: 'Active', value: activeCount, color: PROJECT_COLORS.Active },
            { label: 'Completed', value: completedCount, color: PROJECT_COLORS.Completed },
            { label: 'Delayed', value: delayedCount, color: PROJECT_COLORS.Delayed },
            ...(onHold > 0 ? [{ label: 'On Hold', value: onHold, color: PROJECT_COLORS['On Hold'] }] : []),
          ].filter((s) => s.value > 0);

          const barData = [
            { label: 'Active', value: activeCount, color: PROJECT_COLORS.Active },
            { label: 'Completed', value: completedCount, color: PROJECT_COLORS.Completed },
            { label: 'Delayed', value: delayedCount, color: PROJECT_COLORS.Delayed },
          ];

          const totalProjects = chartSegments.reduce((sum, s) => sum + s.value, 0);
          const filteredProjects = data.projectHealthRows.filter((row) => matchesProjectFilter(row, projectFilter));
          const filterLabel = projectFilter === 'all' ? 'All projects' : `${projectFilter} projects`;

          return (
            <DetailShell key="projects" title="Projects" subtitle="Organization-wide portfolio analytics" onBack={goHub}>
              <div className="space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <SummaryStatCard label="Active" value={activeCount} icon={<FiBriefcase size={28} />} color={PROJECT_COLORS.Active} active={projectFilter === 'Active'} animKey={chartAnimKey} onClick={() => setProjectFilter(projectFilter === 'Active' ? 'all' : 'Active')} />
                  <SummaryStatCard label="Completed" value={completedCount} icon={<FiCheckCircle size={28} />} color={PROJECT_COLORS.Completed} active={projectFilter === 'Completed'} animKey={chartAnimKey} onClick={() => setProjectFilter(projectFilter === 'Completed' ? 'all' : 'Completed')} />
                  <SummaryStatCard label="Delayed" value={delayedCount} icon={<FiAlertTriangle size={28} />} color={PROJECT_COLORS.Delayed} active={projectFilter === 'Delayed'} animKey={chartAnimKey} onClick={() => setProjectFilter(projectFilter === 'Delayed' ? 'all' : 'Delayed')} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="p-6 bg-gray-50 rounded-2xl border border-gray-200/70">
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 mb-6">Status distribution</p>
                    <AnimatedDonutChart segments={chartSegments} total={totalProjects} animKey={chartAnimKey} unit="projects" />
                  </div>
                  <div className="p-6 bg-gray-50 rounded-2xl border border-gray-200/70">
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 mb-6">Portfolio overview</p>
                    <AnimatedTaskBarChart data={barData} animKey={chartAnimKey} />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <h3 className="font-extrabold text-gray-800">{filterLabel} ({filteredProjects.length})</h3>
                    {projectFilter !== 'all' && (
                      <button type="button" onClick={() => setProjectFilter('all')} className="text-xs font-extrabold text-indigo-600 uppercase tracking-widest hover:underline">Show all</button>
                    )}
                  </div>

                  {filteredProjects.length === 0 ? (
                    <p className="text-gray-400 italic py-8 text-center bg-gray-50 rounded-2xl">No projects in this category.</p>
                  ) : (
                    <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                      {filteredProjects.map((row, i) => {
                        const st = projectStatusLabel(row);
                        return (
                          <motion.button
                            key={row.projectId}
                            type="button"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: Math.min(i * 0.03, 0.4) }}
                            onClick={() => openProject(String(row.projectId))}
                            className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200/70 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all text-left bg-white"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-gray-900 truncate">{row.title}</p>
                              <p className="text-xs text-gray-500">
                                {row.completedTasks}/{row.totalTasks} tasks · {row.progressPct}%
                                {(row.delayRiskPct ?? 0) >= 55 && (
                                  <span className="text-amber-600 font-bold"> · Delay risk {row.delayRiskPct}%</span>
                                )}
                                {row.methodology ? ` · ${row.methodology}` : ''}
                                {row.deadline ? ` · Due ${new Date(row.deadline).toLocaleDateString()}` : ''}
                              </p>
                            </div>
                            <span className={`text-[10px] font-extrabold px-2 py-1 rounded-full border uppercase ${st.cls}`}>{st.text}</span>
                            <FiChevronRight className="text-gray-400 shrink-0" />
                          </motion.button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <button type="button" onClick={() => navigate('/admin?tab=projects')} className="text-sm font-extrabold text-indigo-600 uppercase tracking-widest hover:underline">
                  Full project oversight →
                </button>
              </div>
            </DetailShell>
          );
        })()}

        {detailView === 'project-detail' && selectedProjectId && (
          <DetailShell
            key="project-detail"
            title={selectedProject?.title ?? 'Project timeline'}
            subtitle={selectedProject
              ? `${selectedProject.milestonesCompleted}/${selectedProject.milestonesTotal} milestones · ${selectedProject.progressPct}% complete`
              : 'Loading project details…'}
            onBack={goProjects}
          >
            {!ganttDetail ? (
              <div className="py-16 flex justify-center">
                <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
              </div>
            ) : (
              <ProjectGantt
                projectId={selectedProjectId}
                projectTitle={selectedProject?.title ?? 'Project'}
                refreshKey={ganttKey}
                milestones={ganttDetail?.milestones ?? ganttDetail?.Milestones ?? []}
                tasks={ganttDetail?.tasks ?? ganttDetail?.Tasks ?? []}
              />
            )}
          </DetailShell>
        )}

        {detailView === 'tasks' && (() => {
          const ts = data.taskStatus;
          const pendingCount = ts.Todo ?? ts.Pending ?? 0;
          const inProgressCount = ts['In Progress'] ?? ts.InProgress ?? 0;
          const completedCount = (ts.Done ?? ts.Completed ?? 0) + (ts.Approved ?? 0);
          const qaPending = ts['Pending QA Review'] ?? 0;
          const rejectedCount = ts.Rejected ?? 0;

          const chartSegments = [
            { label: 'Pending', value: pendingCount, color: STATUS_COLORS.Pending },
            { label: 'In Progress', value: inProgressCount, color: STATUS_COLORS['In Progress'] },
            { label: 'Completed', value: completedCount, color: STATUS_COLORS.Completed },
            ...(qaPending > 0 ? [{ label: 'Pending QA', value: qaPending, color: STATUS_COLORS['Pending QA Review'] }] : []),
            ...(rejectedCount > 0 ? [{ label: 'Rejected', value: rejectedCount, color: STATUS_COLORS.Rejected }] : []),
          ];

          const totalTasks = chartSegments.reduce((sum, s) => sum + s.value, 0);

          const barData = [
            { label: 'Pending', value: pendingCount, color: STATUS_COLORS.Pending },
            { label: 'In Progress', value: inProgressCount, color: STATUS_COLORS['In Progress'] },
            { label: 'Done', value: completedCount, color: STATUS_COLORS.Completed },
          ];

          const filteredTasks = (data.taskRows ?? []).filter((t) =>
            matchesTaskFilter(t.displayStatus, t.status, taskFilter),
          );

          const filterLabel = taskFilter === 'all' ? 'All tasks' : `${taskFilter} tasks`;

          return (
            <DetailShell key="tasks" title="Task Pipeline" subtitle="Organization-wide task analytics" onBack={goHub}>
              <div className="space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <SummaryStatCard
                    label="Pending"
                    value={pendingCount}
                    icon={<FiClock size={28} />}
                    color={STATUS_COLORS.Pending}
                    active={taskFilter === 'Pending'}
                    animKey={chartAnimKey}
                    onClick={() => setTaskFilter(taskFilter === 'Pending' ? 'all' : 'Pending')}
                  />
                  <SummaryStatCard
                    label="In progress"
                    value={inProgressCount}
                    icon={<FiActivity size={28} />}
                    color={STATUS_COLORS['In Progress']}
                    active={taskFilter === 'In Progress'}
                    animKey={chartAnimKey}
                    onClick={() => setTaskFilter(taskFilter === 'In Progress' ? 'all' : 'In Progress')}
                  />
                  <SummaryStatCard
                    label="Completed"
                    value={completedCount}
                    icon={<FiCheckCircle size={28} />}
                    color={STATUS_COLORS.Completed}
                    active={taskFilter === 'Completed'}
                    animKey={chartAnimKey}
                    onClick={() => setTaskFilter(taskFilter === 'Completed' ? 'all' : 'Completed')}
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="p-6 bg-gray-50 rounded-2xl border border-gray-200/70">
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 mb-6">Status distribution</p>
                    <AnimatedDonutChart segments={chartSegments} total={totalTasks} animKey={chartAnimKey} unit="tasks" />
                  </div>
                  <div className="p-6 bg-gray-50 rounded-2xl border border-gray-200/70">
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 mb-6">Task overview</p>
                    <AnimatedTaskBarChart data={barData} animKey={chartAnimKey} />
                  </div>
                </div>

                {o.blockedTasks > 0 && (
                  <p className="text-sm text-amber-700 font-bold">{o.blockedTasks} task(s) blocked &gt; 7 days in progress</p>
                )}

                <div>
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <h3 className="font-extrabold text-gray-800">{filterLabel}</h3>
                    {taskFilter !== 'all' && (
                      <button
                        type="button"
                        onClick={() => setTaskFilter('all')}
                        className="text-xs font-extrabold text-indigo-600 uppercase tracking-widest hover:underline"
                      >
                        Show all
                      </button>
                    )}
                  </div>

                  {filteredTasks.length === 0 ? (
                    <p className="text-gray-400 italic py-8 text-center bg-gray-50 rounded-2xl">
                      No tasks in this category.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                      {filteredTasks.map((task, i) => (
                        <motion.div
                          key={task.taskId}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(i * 0.03, 0.4) }}
                          className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border border-gray-200/70 bg-white hover:border-indigo-200 hover:bg-indigo-50/30 transition-all"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-900 truncate">{task.title}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {task.projectTitle}
                              {task.assigneeName ? ` · ${task.assigneeName}` : ' · Unassigned'}
                              {task.deadline ? ` · Due ${new Date(task.deadline).toLocaleDateString()}` : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {task.priority && (
                              <span className="text-[10px] font-extrabold text-gray-400 uppercase">{task.priority}</span>
                            )}
                            <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border uppercase ${taskStatusTone(task.displayStatus)}`}>
                              {task.displayStatus}
                            </span>
                            <button
                              type="button"
                              onClick={() => openProject(String(task.projectId))}
                              className="text-indigo-600 hover:text-indigo-800 p-1"
                              title="View project timeline"
                            >
                              <FiChevronRight />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </DetailShell>
          );
        })()}

        {detailView === 'approvals' && (
          <DetailShell key="approvals" title="Pending Approvals" subtitle="Items requiring admin action" onBack={goHub}>
            <div className="space-y-3">
              {[
                { label: 'User signups', value: pa.pendingUsers, onClick: () => navigate('/admin?tab=users') },
                { label: 'Timesheets', value: pa.pendingTimesheets, onClick: () => navigate('/admin?tab=all-timesheets') },
                { label: 'QA reviews', value: pa.pendingQaReviews, onClick: () => openDetail('qa') },
                { label: 'Project closures', value: pa.pendingProjectClosures, onClick: () => navigate('/admin?tab=projects') },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.onClick}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-indigo-50 transition-all"
                >
                  <span className="font-bold text-gray-800">{item.label}</span>
                  <span className="font-extrabold text-indigo-600 text-xl">{item.value}</span>
                </button>
              ))}
            </div>
          </DetailShell>
        )}

        {detailView === 'workload' && (() => {
          const roles = ['Employee', 'Manager', 'QA'] as const;
          const grouped = roles.map((role) => ({
            role,
            rows: data.employeeWorkload.filter((r) => (r.role ?? 'Employee') === role),
          })).filter((g) => g.rows.length > 0);

          return (
          <DetailShell key="workload" title="Team Workload" subtitle="Employees, managers, and QA capacity" onBack={goHub}>
            {grouped.length === 0 ? (
              <p className="text-gray-400 italic">No workload data yet.</p>
            ) : (
              <div className="space-y-8">
                {grouped.map(({ role, rows }) => (
                  <div key={role}>
                    <h3 className="text-xs font-extrabold uppercase tracking-widest text-gray-400 mb-3">{role}s</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-[10px] font-extrabold uppercase text-gray-400 border-b">
                            <th className="text-left py-2">Name</th>
                            <th className="text-center py-2">{activeColumnLabel(role)}</th>
                            <th className="text-center py-2">{role === 'Manager' ? 'Completed projects' : role === 'QA' ? 'Reviews done' : 'Completed'}</th>
                            {role !== 'QA' && <th className="text-center py-2">Hours</th>}
                            <th className="text-right py-2">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row) => (
                            <tr key={row.userId} className="border-b border-gray-50">
                              <td className="py-3">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold">{row.fullName}</span>
                                  <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full border uppercase ${roleBadgeTone(role)}`}>{role}</span>
                                </div>
                              </td>
                              <td className="text-center font-semibold">{row.currentTasks}</td>
                              <td className="text-center text-gray-600">{row.completedTasks}</td>
                              {role !== 'QA' && (
                                <td className="text-center">{Number(row.hoursThisWeek).toFixed(1)}h</td>
                              )}
                              <td className="text-right">
                                <span
                                  className={`text-[10px] font-extrabold px-2 py-1 rounded-full border uppercase ${workloadTone(row.workloadStatus)}`}
                                  title={row.workloadReason || undefined}
                                >
                                  {row.workloadStatus}
                                </span>
                                {row.workloadReason && (
                                  <p className="text-[10px] text-gray-400 mt-1 max-w-[220px] ml-auto line-clamp-2" title={row.workloadReason}>
                                    {row.workloadReason}
                                  </p>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button type="button" onClick={() => navigate('/workload')} className="mt-6 text-sm font-extrabold text-indigo-600 uppercase tracking-widest hover:underline">
              Open workload panel →
            </button>
          </DetailShell>
          );
        })()}

        {detailView === 'qa' && (
          <DetailShell key="qa" title="QA Performance" subtitle="Per-reviewer queue and throughput (live from API)" onBack={goHub}>
            {data.qaPerformance.length === 0 ? (
              <p className="text-gray-400 italic">No QA reviewers configured.</p>
            ) : (
              <div className="space-y-4">
                {data.qaPerformance.map((q) => (
                  <div key={q.qaId} className="p-4 bg-gray-50 rounded-xl">
                    <p className="font-extrabold mb-2">{q.fullName}</p>
                    <div className="flex flex-wrap gap-6 text-sm">
                      <span><strong className="text-amber-600">{q.pendingReviews}</strong> pending in scope</span>
                      <span><strong className="text-emerald-600">{q.approved}</strong> approved by them</span>
                      <span><strong className="text-red-600">{q.rejected}</strong> rejected by them</span>
                      {q.averageReviewHours != null && (
                        <span className="text-gray-500">Avg review: <strong>{q.averageReviewHours.toFixed(1)}h</strong></span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DetailShell>
        )}

        {detailView === 'analytics' && (
          <DetailShell key="analytics" title="Analytics" subtitle="Budget, workload, delay prediction, and trends" onBack={goHub}>
            <div className="space-y-10">
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                  <p className="text-[10px] font-extrabold uppercase text-indigo-400 mb-1">Total budget</p>
                  <p className="text-2xl font-black text-indigo-900">${data.budgetOverview.totalBudget.toLocaleString()}</p>
                  <p className="text-xs text-indigo-600 mt-1">{data.budgetOverview.activeProjects} active projects</p>
                </div>
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                  <p className="text-[10px] font-extrabold uppercase text-amber-600 mb-1">Labor cost (est.)</p>
                  <p className="text-2xl font-black text-amber-900">${data.budgetOverview.totalLaborCost.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                  <p className="text-[10px] font-extrabold uppercase text-emerald-600 mb-1">Budget remaining</p>
                  <p className="text-2xl font-black text-emerald-900">${data.budgetOverview.budgetRemaining.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                  <p className="text-[10px] font-extrabold uppercase text-red-500 mb-1">Delay risk</p>
                  <p className="text-2xl font-black text-red-900">{data.aiAnalytics.projectsAtDelayRisk}</p>
                  <p className="text-xs text-red-600 mt-1">Avg risk {data.aiAnalytics.avgDelayRiskPct}%</p>
                </div>
              </div>

              <div>
                <h3 className="font-extrabold text-gray-800 mb-4">Workload heatmap</h3>
                {data.workloadHeatmap.length === 0 ? (
                  <p className="text-gray-400 italic text-sm">No workload data.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                    {data.workloadHeatmap.map((cell) => (
                      <div
                        key={cell.userId}
                        className="p-3 rounded-xl border border-gray-100 text-center"
                        style={{ backgroundColor: `${heatColor(cell.utilizationPct)}18`, borderColor: `${heatColor(cell.utilizationPct)}44` }}
                        title={
                          cell.workloadReason
                            ? `${cell.fullName} — ${Math.round(cell.utilizationPct * 100)}% (${cell.workloadStatus}): ${cell.workloadReason}`
                            : `${cell.fullName} — ${Math.round(cell.utilizationPct * 100)}%`
                        }
                      >
                        <p className="text-[10px] font-bold text-gray-800 truncate">{cell.fullName.split(' ')[0]}</p>
                        <p className="text-lg font-black mt-1" style={{ color: heatColor(cell.utilizationPct) }}>
                          {Math.round(cell.utilizationPct * 100)}%
                        </p>
                        <p className="text-[9px] font-extrabold uppercase text-gray-400">{cell.role}</p>
                        {cell.workloadReason && (
                          <p className="text-[8px] text-gray-500 mt-1 line-clamp-2 px-1">{cell.workloadReason}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-extrabold text-gray-800 mb-4">Tasks approved per week</h3>
                <BarChart data={data.tasksCompletedPerWeek.map((w) => ({ label: w.weekLabel, value: w.completed }))} color="#10B981" />
              </div>
              <div>
                <h3 className="font-extrabold text-gray-800 mb-4">Hours worked per week</h3>
                <BarChart data={data.hoursWorkedPerWeek.map((w) => ({ label: w.weekLabel, value: Number(w.hours) }))} color="#06B6D4" />
              </div>
              <div>
                <h3 className="font-extrabold text-gray-800 mb-4">Manager delivery</h3>
                {data.managerPerformance.length === 0 ? (
                  <p className="text-gray-400 italic text-sm">No data</p>
                ) : (
                  <div className="space-y-2">
                    {data.managerPerformance.map((m) => (
                      <div key={m.managerId} className="flex justify-between p-3 bg-gray-50 rounded-xl text-sm">
                        <span className="font-bold">{m.fullName}</span>
                        <span className="text-gray-500">{m.averageProgress}% · {m.projects} projects</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid sm:grid-cols-3 gap-4 text-sm">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="font-extrabold text-lg">{data.timesheetAnalytics.clockedInNow}</p>
                  <p className="text-gray-500 text-xs uppercase font-bold">Clocked in</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="font-extrabold text-lg">{data.meetingAnalytics.todaysMeetings}</p>
                  <p className="text-gray-500 text-xs uppercase font-bold">Meetings today</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="font-extrabold text-lg">{data.aiAnalytics.aiScoredTasks}</p>
                  <p className="text-gray-500 text-xs uppercase font-bold">AI-scored tasks</p>
                </div>
              </div>
            </div>
          </DetailShell>
        )}

        {detailView === 'activity' && (
          <DetailShell key="activity" title="Recent Activity" subtitle="Latest system events" onBack={goHub}>
            {data.recentActivity.length === 0 ? (
              <p className="text-gray-400 italic">No recent activity.</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {data.recentActivity.map((item, i) => (
                  <div key={i} className="py-4 flex gap-4">
                    <span className="text-[10px] font-extrabold text-indigo-600 w-12 shrink-0">
                      {new Date(item.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <div>
                      <p className="font-bold text-sm">{item.title}</p>
                      <p className="text-xs text-gray-500">{item.body ?? item.type}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DetailShell>
        )}

        {detailView === 'alerts' && (
          <DetailShell key="alerts" title="System Alerts" subtitle="Issues that need attention" onBack={goHub}>
            <div className="space-y-3">
              {data.systemAlerts.map((alert, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    if (alert.actionLink?.includes('users')) navigate('/admin?tab=users');
                    else if (alert.actionLink?.includes('timesheet')) navigate('/admin?tab=all-timesheets');
                    else if (alert.message.toLowerCase().includes('qa')) openDetail('qa');
                    else if (alert.actionLink) navigate(alert.actionLink);
                  }}
                  className={`w-full text-left p-4 rounded-xl border flex items-center gap-3 ${alert.severity === 'warning' ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'}`}
                >
                  <FiAlertTriangle className="shrink-0" />
                  <span className="font-bold text-sm flex-1">{alert.message}</span>
                  <FiChevronRight />
                </button>
              ))}
            </div>
          </DetailShell>
        )}
      </AnimatePresence>
    </div>
  );
};

/** Small bar-chart icon — FiBarChart2 not imported to avoid clash */
const FiBarChart2Icon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

export default AdminDashboard;
