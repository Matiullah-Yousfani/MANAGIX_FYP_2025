// PHASE 5: Admin monitoring panel.
//
// Layout (mirrors Dashboard.tsx hero + cards pattern):
//   • Hero: "System Monitoring" title + subtitle.
//   • KPI strip: active projects / overdue / avg utilisation / overloaded / blocked tasks.
//   • Top-overloaded employees list.
//   • Methodology distribution.
//   • Project health table — clickable; each row opens a project-detail card with on-time %,
//     workload, milestone progress.
//
// Theme: MANAGIX dark token system — bg-bg, rounded-xl, semantic surfaces, primary accent.
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FiActivity, FiAlertTriangle, FiBriefcase, FiClock, FiUsers, FiZap, FiTrendingUp, FiCheckCircle, FiX,
} from 'react-icons/fi';
import api from '../../api/axiosInstance';
import { monitoringService, type SystemHealth, type ProjectHealth } from '../../api/monitoringService';

const MonitoringPanel: React.FC = () => {
  const [system, setSystem] = useState<SystemHealth | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [healthByProject, setHealthByProject] = useState<Record<string, ProjectHealth>>({});
  const [loading, setLoading] = useState(true);
  const [openProject, setOpenProject] = useState<ProjectHealth | null>(null);

  const role = localStorage.getItem('userRole') || '';

  useEffect(() => {
    (async () => {
      try {
        const [sys, projList] = await Promise.all([
          monitoringService.system(),
          api.get('/projects').then((r) => r.data).catch(() => []),
        ]);
        setSystem(sys);
        const list = Array.isArray(projList) ? projList : [];
        setProjects(list);

        // Lazy-load per-project health, in parallel — non-blocking.
        Promise.all(list.map(async (p: any) => {
          const id = p.projectId || p.ProjectId;
          if (!id) return null;
          try {
            const h = await monitoringService.project(id);
            return { id, h };
          } catch {
            return null;
          }
        })).then((results) => {
          const map: Record<string, ProjectHealth> = {};
          for (const r of results) if (r) map[r.id] = r.h;
          setHealthByProject(map);
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (role !== 'Admin') {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="bg-surface rounded-xl p-12 shadow-e1 border border-line text-center">
          <FiAlertTriangle className="text-warning mx-auto mb-4" size={48} />
          <h2 className="text-2xl font-bold text-fg mb-2">Admin only</h2>
          <p className="text-fg-muted">This panel is restricted to administrators.</p>
        </div>
      </div>
    );
  }

  if (loading || !system) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-line border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-bg pb-20 font-sans">
      {/* HEADER — matches Dashboard.tsx pattern */}
      <div className="bg-surface border-b border-line mb-8 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-2xl font-bold text-fg flex items-center gap-3">
            <FiActivity className="text-primary" /> System Monitoring
          </h1>
          <p className="text-fg-muted mt-1 font-medium">Project health · workload · methodology mix</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 space-y-12">
        {/* KPI STRIP */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          <Kpi icon={<FiBriefcase />} label="Active projects" value={system.activeProjects} accent="indigo" />
          <Kpi icon={<FiAlertTriangle />} label="Overdue" value={system.overdueProjects} accent={system.overdueProjects > 0 ? 'red' : 'emerald'} />
          <Kpi icon={<FiTrendingUp />} label="Avg utilisation" value={`${Math.round(system.avgUtilization * 100)}%`} accent={system.avgUtilization >= 1 ? 'red' : system.avgUtilization >= 0.9 ? 'orange' : 'emerald'} />
          <Kpi icon={<FiUsers />} label="Overloaded" value={system.overloadedCount} accent={system.overloadedCount > 0 ? 'orange' : 'emerald'} />
          <Kpi icon={<FiClock />} label="Blocked tasks" value={system.blockedTaskCount} accent={system.blockedTaskCount > 0 ? 'orange' : 'emerald'} />
        </div>

        {/* TOP OVERLOADED */}
        {system.topOverloaded.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="bg-surface rounded-xl p-8 shadow-e1 border border-warning/25">
            <h2 className="text-2xl font-bold text-warning mb-6 flex items-center gap-3">
              <FiAlertTriangle /> Top overloaded employees
            </h2>
            <div className="space-y-3">
              {system.topOverloaded.map((row) => {
                const pct = Math.round(row.utilizationPct * 100);
                return (
                  <div key={row.userId} className="flex items-center gap-6 p-4 rounded-lg bg-surface-2 border border-line">
                    <div className="w-44 shrink-0">
                      <div className="font-bold text-fg">{row.fullName}</div>
                      <div className="text-[10px] font-bold text-fg-subtle uppercase tracking-widest">{row.totalEstimatedHours.toFixed(1)}h booked</div>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-[10px] font-bold text-fg-subtle uppercase tracking-widest">Utilisation</span>
                        <span className={`text-xs font-bold ${pct >= 100 ? 'text-danger' : 'text-warning'}`}>{pct}%</span>
                      </div>
                      <div className="h-3 bg-surface-3 rounded-full overflow-hidden">
                        <div className={`h-full ${pct >= 100 ? 'bg-danger' : 'bg-warning'}`} style={{ width: `${Math.min(150, pct) / 1.5}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* METHODOLOGY BREAKDOWN */}
        {Object.keys(system.methodologyBreakdown).length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="bg-surface rounded-xl p-8 shadow-e1 border border-line">
            <h2 className="text-2xl font-bold text-fg mb-6 flex items-center gap-3">
              <FiZap className="text-primary" /> Methodology mix
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(system.methodologyBreakdown).map(([m, n]) => (
                <div key={m} className="rounded-lg border border-line p-5 bg-surface-2">
                  <div className="text-[10px] font-bold text-fg-subtle uppercase tracking-widest">{m}</div>
                  <div className="text-3xl font-bold text-fg mt-1">{n}</div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* PROJECT HEALTH TABLE */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-surface rounded-xl p-8 shadow-e1 border border-line">
          <h2 className="text-2xl font-bold text-fg mb-6">Project health</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] font-bold text-fg-subtle uppercase tracking-widest">
                  <th className="text-left p-3">Project</th>
                  <th className="text-left p-3">Methodology</th>
                  <th className="text-left p-3">Tasks</th>
                  <th className="text-left p-3">On-time</th>
                  <th className="text-left p-3">Util</th>
                  <th className="text-left p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => {
                  const id = p.projectId || p.ProjectId;
                  const h = healthByProject[id];
                  return (
                    <tr
                      key={id}
                      onClick={() => h && setOpenProject(h)}
                      className="hover:bg-surface-2 cursor-pointer border-t border-line transition-colors"
                    >
                      <td className="p-3 font-bold text-fg">{p.title || p.Title}</td>
                      <td className="p-3 text-fg-muted">{h?.methodology || '—'}</td>
                      <td className="p-3 text-fg-muted">{h ? `${h.completedTasks}/${h.totalTasks}` : '…'}</td>
                      <td className="p-3 text-fg-muted">{h ? `${Math.round(h.onTimeRatio * 100)}%` : '…'}</td>
                      <td className={`p-3 font-bold ${h && h.avgUtilization >= 1 ? 'text-danger' : h && h.avgUtilization >= 0.9 ? 'text-warning' : 'text-success'}`}>
                        {h ? `${Math.round(h.avgUtilization * 100)}%` : '…'}
                      </td>
                      <td className="p-3">
                        {!h ? <span className="text-fg-subtle">…</span> : h.isOverdue ? (
                          <span className="px-3 py-1 rounded-full bg-danger-soft text-danger border border-danger/25 text-[10px] font-bold uppercase tracking-widest">Overdue</span>
                        ) : (
                          <span className="px-3 py-1 rounded-full bg-success-soft text-success border border-success/25 text-[10px] font-bold uppercase tracking-widest">Healthy</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>

      {/* DETAIL MODAL */}
      {openProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpenProject(null)} />
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative w-full max-w-2xl bg-surface border border-line rounded-xl shadow-e3 p-10"
          >
            <button onClick={() => setOpenProject(null)} className="absolute top-6 right-6 text-fg-subtle hover:text-fg">
              <FiX size={22} />
            </button>
            <h3 className="text-2xl font-bold text-fg mb-2">{openProject.title}</h3>
            <p className="text-fg-muted mb-6">{openProject.methodology || 'Unspecified methodology'}</p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <SmallStat label="Tasks done" value={`${openProject.completedTasks}/${openProject.totalTasks}`} />
              <SmallStat label="On-time ratio" value={`${Math.round(openProject.onTimeRatio * 100)}%`} />
              <SmallStat label="Avg utilisation" value={`${Math.round(openProject.avgUtilization * 100)}%`} />
              <SmallStat label="Overloaded members" value={openProject.overloadedMembers.toString()} />
              <SmallStat label="Milestones" value={`${openProject.milestonesCompleted}/${openProject.milestonesTotal}`} />
              <SmallStat label="Status" value={openProject.isOverdue ? 'Overdue' : 'Healthy'} />
            </div>

            {openProject.aiRiskSummary && (
              <div className="rounded-lg bg-primary-soft border border-primary-border p-5 mb-6">
                <div className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2 flex items-center gap-2">
                  <FiZap /> AI risk summary
                </div>
                <p className="text-sm text-fg">{openProject.aiRiskSummary}</p>
              </div>
            )}

            <button onClick={() => setOpenProject(null)} className="bg-primary text-primary-fg py-3 px-6 rounded-lg font-bold w-full flex items-center justify-center gap-2">
              <FiCheckCircle /> Got it
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

const Kpi: React.FC<{ icon: React.ReactNode; label: string; value: string | number; accent: 'indigo' | 'emerald' | 'orange' | 'red' }> = ({
  icon, label, value, accent,
}) => {
  const map = {
    indigo: 'bg-primary-soft text-primary',
    emerald: 'bg-success-soft text-success',
    orange: 'bg-warning-soft text-warning',
    red: 'bg-danger-soft text-danger',
  } as const;
  return (
    <div className="bg-surface rounded-xl p-6 shadow-e1 border border-line flex items-center gap-4">
      <div className={`size-12 rounded-lg flex items-center justify-center ${map[accent]} text-xl`}>{icon}</div>
      <div>
        <p className="text-[10px] font-bold text-fg-subtle uppercase tracking-widest">{label}</p>
        <h3 className="text-2xl font-bold text-fg">{value}</h3>
      </div>
    </div>
  );
};

const SmallStat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-lg bg-surface-2 border border-line p-4">
    <div className="text-[10px] font-bold text-fg-subtle uppercase tracking-widest">{label}</div>
    <div className="text-xl font-bold text-fg mt-1">{value}</div>
  </div>
);

export default MonitoringPanel;
