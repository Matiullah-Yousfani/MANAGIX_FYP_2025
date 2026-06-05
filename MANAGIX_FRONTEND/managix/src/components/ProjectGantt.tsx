import React, { useEffect, useState } from 'react';
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
  status?: string;
  Status?: string;
  milestoneId?: string;
  MilestoneId?: string;
}

interface Props {
  projectId: string;
  projectTitle?: string;
  /** Bump to force reload (e.g. after milestone completed). */
  refreshKey?: number | string;
  /** Used when the timeline API fails but milestones are already loaded on the page. */
  milestones?: MilestoneLike[];
  tasks?: TaskLike[];
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
      .finally(() => setLoading(false));
  }, [projectId, refreshKey]);

  if (loading) return <p className="text-gray-400 italic text-sm">Loading timeline…</p>;
  if (!data) {
    return (
      <p className="text-gray-400 text-sm">
        Timeline unavailable — ensure milestones have deadlines and restart the backend if this persists.
      </p>
    );
  }

  const milestones = data.milestones || [];
  const totalFlex = milestones.reduce((s: number, m: any) => s + Math.max(m.widthPct || 8, 8), 0) || 1;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex justify-between items-start mb-4 gap-4">
        <div>
          <h3 className="font-black text-gray-900 uppercase tracking-widest text-sm">Project timeline</h3>
          {data.title && (
            <p className="text-indigo-700 font-bold text-sm mt-1">{data.title}</p>
          )}
          {usedFallback && (
            <p className="text-xs text-amber-600 mt-1 font-medium">
              Showing simplified timeline (API unavailable). Restart Functions host for full Gantt dates.
            </p>
          )}
        </div>
        <span className="text-indigo-600 font-bold text-sm shrink-0">{data.overallProgressPct}% complete</span>
      </div>
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-6">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            data.overallProgressPct >= 100
              ? 'bg-emerald-500'
              : data.overallProgressPct >= 50
                ? 'bg-indigo-500'
                : 'bg-indigo-400'
          }`}
          style={{ width: `${Math.min(100, data.overallProgressPct)}%` }}
        />
      </div>
      {milestones.length > 0 ? (
        <div className="flex h-20 gap-1 mb-4 rounded-xl overflow-hidden border border-gray-100">
          {milestones.map((m: any) => {
            const done = isMilestoneCompleted(m.status);
            const pendingReview = Boolean(m.hasPendingReview);
            const flexGrow = Math.max(m.widthPct || 8, 8) / totalFlex;
            const pct = Math.min(100, Number(m.progressPct ?? 0));
            const fillColor = done
              ? 'bg-emerald-500'
              : pendingReview
                ? 'bg-amber-400'
                : pct >= 50
                  ? 'bg-indigo-500'
                  : 'bg-indigo-400';
            const trackColor = done ? 'bg-emerald-100' : pendingReview ? 'bg-amber-100' : 'bg-indigo-100';
            return (
              <div
                key={m.milestoneId}
                className={`relative flex items-center justify-center px-1 min-w-0 text-[10px] font-bold overflow-hidden ${trackColor}`}
                style={{ flex: flexGrow }}
                title={`${m.title} (${pct}%)`}
              >
                <div
                  className={`absolute inset-y-0 left-0 transition-all duration-500 ${fillColor}`}
                  style={{ width: `${pct}%` }}
                />
                <span className={`relative z-10 truncate px-1 ${pct > 40 ? 'text-white' : 'text-gray-700'}`}>
                  {m.title}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-gray-400 text-sm mb-4">No milestones yet.</p>
      )}
      <ul className="space-y-2">
        {milestones.map((m: any) => (
          <li key={m.milestoneId} className="flex justify-between text-xs text-gray-600">
            <span className="font-bold">{m.title}</span>
            <span>
              {m.completedTasks}/{m.totalTasks} tasks · {m.progressPct}%
              {isMilestoneCompleted(m.status) && (
                <span className="ml-2 text-emerald-600 font-black">Completed</span>
              )}
              {m.hasPendingReview && !isMilestoneCompleted(m.status) && (
                <span className="ml-2 text-amber-600 font-black">Awaiting QA</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ProjectGantt;
