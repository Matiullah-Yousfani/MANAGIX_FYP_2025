import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useSpring, useTransform } from 'framer-motion';
import { FiLayers, FiCheckCircle, FiShield, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { projectService } from '../api/projectService';
import { isMilestoneCompleted } from '../api/normalize';

interface MilestoneLike {
  milestoneId?: string;
  MilestoneId?: string;
  title?: string;
  Title?: string;
  status?: string;
  Status?: string;
  deadline?: string;
  Deadline?: string;
}

interface TaskLike {
  taskId?: string;
  TaskId?: string;
  title?: string;
  Title?: string;
  status?: string;
  Status?: string;
  milestoneId?: string;
  MilestoneId?: string;
  assignedEmployeeName?: string;
  AssignedEmployeeName?: string;
  priority?: string;
  Priority?: string;
}

interface Props {
  projectId: string;
  projectTitle?: string;
  refreshKey?: number | string;
  milestones?: MilestoneLike[];
  tasks?: TaskLike[];
}

const PHASE_PALETTE = [
  { track: '#EDE9FE', fill: '#7C3AED' },
  { track: '#DBEAFE', fill: '#2563EB' },
  { track: '#D1FAE5', fill: '#059669' },
  { track: '#FFEDD5', fill: '#EA580C' },
  { track: '#FCE7F3', fill: '#DB2777' },
  { track: '#CFFAFE', fill: '#0891B2' },
  { track: '#FEF3C7', fill: '#CA8A04' },
  { track: '#E0E7FF', fill: '#4F46E5' },
];

function phaseColor(index: number) {
  return PHASE_PALETTE[index % PHASE_PALETTE.length];
}

function normId(value: string) {
  return value.replace(/-/g, '').toLowerCase();
}

function tasksForMilestone(milestoneId: string, tasks: TaskLike[]) {
  const id = normId(String(milestoneId));
  return tasks.filter(
    (t) => normId(String(t.milestoneId ?? t.MilestoneId ?? '')) === id,
  );
}

function taskStatusTone(status: string) {
  const s = status.toLowerCase();
  if (s === 'approved' || s === 'done') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (s === 'in progress') return 'bg-indigo-100 text-indigo-700 border-indigo-200';
  if (s === 'rejected') return 'bg-red-100 text-red-700 border-red-200';
  if (s === 'submitted' || s === 'pending qa review') return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-gray-100 text-gray-600 border-gray-200';
}

function buildFallbackTimeline(
  projectTitle: string | undefined,
  milestones: MilestoneLike[],
  tasks: TaskLike[]
) {
  const norm = (g: string) => g.replace(/-/g, '').toLowerCase();
  const ms = milestones.map((m, i) => {
    const id = String(m.milestoneId ?? m.MilestoneId ?? i);
    const title = m.title ?? m.Title ?? 'Milestone';
    const status = m.status ?? m.Status ?? 'Pending';
    const completed = isMilestoneCompleted(status);
    const related = tasks.filter(
      (t) => norm(String(t.milestoneId ?? t.MilestoneId ?? '')) === norm(id)
    );
    const approved = related.filter(
      (t) => (t.status ?? t.Status ?? '').toLowerCase() === 'approved'
    ).length;
    const awaiting = related.some(
      (t) => (t.status ?? t.Status ?? '').toLowerCase() === 'done'
    );
    const slice = Math.max(100 / Math.max(milestones.length, 1), 8);
    const progressPct = completed
      ? 100
      : related.length > 0
        ? Math.round((approved / related.length) * 1000) / 10
        : 0;
    return {
      milestoneId: id,
      title,
      status,
      progressPct,
      offsetPct: i * slice,
      widthPct: slice,
      totalTasks: related.length,
      completedTasks: completed ? related.length : approved,
      hasPendingReview: !completed && awaiting,
    };
  });

  const approved = tasks.filter(
    (t) => (t.status ?? t.Status ?? '').toLowerCase() === 'approved'
  ).length;
  const overall =
    tasks.length > 0 ? Math.round((approved / tasks.length) * 1000) / 10 : 0;

  return {
    title: projectTitle,
    overallProgressPct: overall,
    milestones: ms,
  };
}

const AnimatedSegmentedDonut: React.FC<{
  milestones: any[];
  overall: number;
  animKey: number;
}> = ({ milestones, overall, animKey }) => {
  const radius = 58;
  const stroke = 14;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, overall));
  const total = milestones.length || 1;

  const spring = useSpring(0, { stiffness: 55, damping: 18, mass: 0.8 });
  const display = useTransform(spring, (v) => Math.round(v * 10) / 10);
  const [label, setLabel] = useState('0');

  useEffect(() => {
    spring.set(0);
    const t = window.setTimeout(() => spring.set(clamped), 50);
    return () => window.clearTimeout(t);
  }, [clamped, animKey, spring]);

  useEffect(() => {
    const unsub = display.on('change', (v) => setLabel(String(v)));
    return unsub;
  }, [display]);

  let cumulative = 0;

  return (
    <div className="relative w-40 h-40 shrink-0">
      <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
        <circle cx="100" cy="100" r={radius} fill="none" stroke="#F3F4F6" strokeWidth={stroke} />
        {milestones.map((m: any, i: number) => {
          const dash = circumference / total;
          const offset = cumulative;
          cumulative += dash;
          const done = isMilestoneCompleted(m.status);
          const pct = Math.min(100, Math.max(0, Number(m.progressPct ?? 0)));
          const { track, fill } = phaseColor(i);
          const fillDash = done ? dash : dash * (pct / 100);
          const showFill = done || pct > 0;

          return (
            <g key={`${animKey}-${m.milestoneId}`}>
              {/* Muted slot — every milestone, incomplete = faded only */}
              <motion.circle
                cx="100"
                cy="100"
                r={radius}
                fill="none"
                stroke={track}
                strokeWidth={stroke}
                strokeLinecap="butt"
                strokeOpacity={0.55}
                initial={{ strokeDasharray: `0 ${circumference}`, strokeDashoffset: -offset }}
                animate={{ strokeDasharray: `${dash} ${circumference - dash}`, strokeDashoffset: -offset }}
                transition={{ duration: 0.7, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              />
              {/* Vibrant fill — only for completed or partially progressed milestones */}
              {showFill && (
                <motion.circle
                  cx="100"
                  cy="100"
                  r={radius}
                  fill="none"
                  stroke={done ? '#10B981' : fill}
                  strokeWidth={stroke}
                  strokeLinecap="butt"
                  initial={{ strokeDasharray: `0 ${circumference}`, strokeDashoffset: -offset }}
                  animate={{
                    strokeDasharray: `${fillDash} ${circumference - fillDash}`,
                    strokeDashoffset: -offset,
                  }}
                  transition={{ duration: 0.85, delay: 0.12 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                />
              )}
            </g>
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <motion.span
          key={`pct-${animKey}`}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.45 }}
          className="text-2xl font-black text-gray-900 tabular-nums"
        >
          {label}%
        </motion.span>
        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">complete</span>
      </div>
    </div>
  );
};

const TimelineStatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  hint?: string;
  accent?: 'indigo' | 'emerald' | 'amber';
  animKey: number;
  delay?: number;
}> = ({ icon, label, value, hint, accent = 'indigo', animKey, delay = 0 }) => {
  const border: Record<string, string> = {
    indigo: 'border-gray-100 hover:border-indigo-200',
    emerald: 'border-gray-100 hover:border-emerald-200',
    amber: 'border-gray-100 hover:border-amber-200',
  };
  const iconColor: Record<string, string> = {
    indigo: 'text-indigo-600',
    emerald: 'text-emerald-600',
    amber: 'text-amber-600',
  };

  return (
    <motion.div
      key={`card-${animKey}-${label}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={`bg-white rounded-2xl border p-4 shadow-sm transition-all ${border[accent]}`}
    >
      <div className={`mb-2 opacity-80 ${iconColor[accent]}`}>{icon}</div>
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</p>
      <motion.p
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: delay + 0.15, type: 'spring', stiffness: 200 }}
        className="text-2xl font-black text-gray-900 mt-1"
      >
        {value}
      </motion.p>
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </motion.div>
  );
};

const ProjectGantt: React.FC<Props> = ({
  projectId,
  projectTitle,
  refreshKey,
  milestones: milestonesProp = [],
  tasks: tasksProp = [],
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [usedFallback, setUsedFallback] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const [expandedMilestoneId, setExpandedMilestoneId] = useState<string | null>(null);

  const projectTasks = useMemo(() => tasksProp ?? [], [tasksProp]);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    setUsedFallback(false);
    projectService
      .getTimeline(projectId)
      .then((tl) => {
        if (tl) {
          setData(tl);
          return;
        }
        if (milestonesProp.length > 0) {
          setData(buildFallbackTimeline(projectTitle, milestonesProp, tasksProp));
          setUsedFallback(true);
        } else {
          setData(null);
        }
      })
      .catch(() => {
        if (milestonesProp.length > 0) {
          setData(buildFallbackTimeline(projectTitle, milestonesProp, tasksProp));
          setUsedFallback(true);
        } else {
          setData(null);
        }
      })
      .finally(() => {
        setLoading(false);
        setAnimKey((k) => k + 1);
      });
  }, [projectId, refreshKey]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200/70 p-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="w-40 h-40 rounded-full bg-gray-100 animate-pulse shrink-0 mx-auto lg:mx-0" />
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <p className="text-gray-400 text-sm">
        Timeline unavailable — ensure milestones have deadlines and restart the backend if this persists.
      </p>
    );
  }

  const milestones = data.milestones || [];
  const overall = Math.min(100, Number(data.overallProgressPct ?? 0));
  const approvedTotal = milestones.reduce((s: number, m: any) => s + (m.completedTasks ?? 0), 0);
  const taskTotal = milestones.reduce((s: number, m: any) => s + (m.totalTasks ?? 0), 0);
  const doneCount = milestones.filter((m: any) => isMilestoneCompleted(m.status)).length;
  const qaCount = milestones.filter(
    (m: any) => m.hasPendingReview && !isMilestoneCompleted(m.status)
  ).length;
  const inProgressCount = milestones.filter((m: any) => {
    if (isMilestoneCompleted(m.status)) return false;
    if (m.hasPendingReview) return false;
    return Number(m.progressPct ?? 0) > 0 || (m.totalTasks ?? 0) > 0;
  }).length;

  const activeHint = [
    inProgressCount > 0 ? `${inProgressCount} in progress` : null,
    qaCount > 0 ? `${qaCount} awaiting QA` : null,
  ].filter(Boolean).join(' · ') || 'No active work';

  return (
    <div className="bg-white rounded-2xl border border-gray-200/70 p-6 shadow-sm">
      <div className="mb-6">
        <h3 className="font-extrabold text-gray-900 uppercase tracking-widest text-sm">Project timeline</h3>
        {data.title && (
          <p className="text-indigo-700 font-bold text-sm mt-1">{data.title}</p>
        )}
        {usedFallback && (
          <p className="text-xs text-amber-600 mt-1 font-medium">
            Simplified timeline (API unavailable). Restart Functions host for full metrics.
          </p>
        )}
      </div>

      {milestones.length > 0 ? (
        <>
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 mb-8 items-center lg:items-start">
            <AnimatedSegmentedDonut milestones={milestones} overall={overall} animKey={animKey} />
            <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-3 gap-3">
              <TimelineStatCard
                icon={<FiLayers size={20} />}
                label="Milestones"
                value={milestones.length}
                hint={`${doneCount} completed`}
                accent="indigo"
                animKey={animKey}
                delay={0.1}
              />
              <TimelineStatCard
                icon={<FiCheckCircle size={20} />}
                label="Tasks approved"
                value={`${approvedTotal}/${taskTotal}`}
                hint={`${overall}% of all tasks`}
                accent="emerald"
                animKey={animKey}
                delay={0.18}
              />
              <TimelineStatCard
                icon={<FiShield size={20} />}
                label="In progress / QA"
                value={inProgressCount + qaCount}
                hint={activeHint}
                accent={qaCount > 0 ? 'amber' : 'indigo'}
                animKey={animKey}
                delay={0.26}
              />
            </div>
          </div>

          <ul className="space-y-3">
            {milestones.map((m: any, i: number) => {
              const pct = Math.min(100, Number(m.progressPct ?? 0));
              const done = isMilestoneCompleted(m.status);
              const pendingReview = Boolean(m.hasPendingReview);
              const { fill, track } = phaseColor(i);
              const barColor = done ? '#10B981' : fill;
              const dotColor = done ? '#10B981' : pct > 0 ? fill : track;
              const dotOpacity = done || pct > 0 ? 1 : 0.55;
              const msId = String(m.milestoneId ?? m.MilestoneId ?? i);
              const expanded = expandedMilestoneId === msId;
              const milestoneTasks = tasksForMilestone(msId, projectTasks);

              return (
                <motion.li
                  key={msId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 + i * 0.06, duration: 0.35 }}
                  className={`rounded-xl border bg-gray-50/80 px-4 py-3 transition-colors ${expanded ? 'border-indigo-200 ring-1 ring-indigo-100' : 'border-gray-100 hover:border-gray-200'}`}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedMilestoneId(expanded ? null : msId)}
                    className="w-full text-left"
                    aria-expanded={expanded}
                  >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <span
                        className="size-3 rounded-full shrink-0 mt-1 ring-2 ring-white shadow-sm"
                        style={{ backgroundColor: dotColor, opacity: dotOpacity }}
                      />
                      <p className="font-bold text-sm text-gray-900 leading-snug">{m.title}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {done && (
                        <span className="text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                          Done
                        </span>
                      )}
                      {pendingReview && !done && (
                        <span className="text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                          QA
                        </span>
                      )}
                      <AnimatedMilestonePct value={pct} animKey={animKey} delay={0.2 + i * 0.08} />
                      {milestoneTasks.length > 0 && (
                        expanded ? <FiChevronUp className="text-gray-400" /> : <FiChevronDown className="text-gray-400" />
                      )}
                    </div>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden ml-5" style={{ backgroundColor: track }}>
                    <motion.div
                      key={`bar-${animKey}-${msId}`}
                      className="h-full rounded-full"
                      style={{ backgroundColor: barColor }}
                      initial={{ width: '0%' }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.75, delay: 0.15 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1.5 ml-5 font-medium">
                    {m.completedTasks}/{m.totalTasks} tasks approved
                    {milestoneTasks.length > 0 && (
                      <span className="text-indigo-600 ml-2">
                        · {expanded ? 'Hide' : 'Show'} {milestoneTasks.length} task{milestoneTasks.length === 1 ? '' : 's'}
                      </span>
                    )}
                  </p>
                  </button>

                  <AnimatePresence initial={false}>
                    {expanded && milestoneTasks.length > 0 && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <ul className="mt-3 ml-5 space-y-2 border-t border-gray-200/80 pt-3">
                          {milestoneTasks.map((t) => {
                            const status = t.status ?? t.Status ?? 'Todo';
                            const title = t.title ?? t.Title ?? 'Untitled task';
                            const assignee = t.assignedEmployeeName ?? t.AssignedEmployeeName;
                            const priority = t.priority ?? t.Priority;
                            const taskId = String(t.taskId ?? t.TaskId ?? title);
                            return (
                              <li
                                key={taskId}
                                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-white rounded-lg border border-gray-100 text-sm"
                              >
                                <div className="min-w-0">
                                  <p className="font-semibold text-gray-900 truncate">{title}</p>
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    {assignee ? `Assignee: ${assignee}` : 'Unassigned'}
                                    {priority ? ` · ${priority}` : ''}
                                  </p>
                                </div>
                                <span className={`self-start sm:self-auto text-[10px] font-extrabold px-2 py-1 rounded-full border uppercase shrink-0 ${taskStatusTone(status)}`}>
                                  {status}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.li>
              );
            })}
          </ul>
        </>
      ) : (
        <p className="text-gray-400 text-sm">No milestones yet.</p>
      )}
    </div>
  );
};

const AnimatedMilestonePct: React.FC<{ value: number; animKey: number; delay: number }> = ({
  value, animKey, delay,
}) => {
  const spring = useSpring(0, { stiffness: 60, damping: 20 });
  const display = useTransform(spring, (v) => Math.round(v * 10) / 10);
  const [label, setLabel] = useState('0');

  useEffect(() => {
    spring.set(0);
    const t = window.setTimeout(() => spring.set(value), 50 + delay * 1000);
    return () => window.clearTimeout(t);
  }, [value, animKey, delay, spring]);

  useEffect(() => {
    const unsub = display.on('change', (v) => setLabel(String(v)));
    return unsub;
  }, [display]);

  return (
    <span className="text-xs font-black text-gray-500 tabular-nums w-10 text-right">{label}%</span>
  );
};

export default ProjectGantt;
