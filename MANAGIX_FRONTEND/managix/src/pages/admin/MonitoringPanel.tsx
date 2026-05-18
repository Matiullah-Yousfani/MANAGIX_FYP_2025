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
// Theme: same colours and shapes used elsewhere — bg-[#F8FAFC], rounded-[2.5rem], font-black,
// indigo accent.
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
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="bg-white rounded-[2.5rem] p-12 shadow-sm border border-gray-100 text-center">
          <FiAlertTriangle className="text-orange-500 mx-auto mb-4" size={48} />
          <h2 className="text-2xl font-black text-gray-900 mb-2">Admin only</h2>
          <p className="text-gray-500 italic">This panel is restricted to administrators.</p>
        </div>
      </div>
    );
  }

  if (loading || !system) return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20 font-sans">
      {/* HEADER — matches Dashboard.tsx pattern */}
      <div className="bg-white border-b border-gray-100 mb-8 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-4xl font-black text-gray-900 flex items-center gap-3">
            <FiActivity className="text-indigo-600" /> System Monitoring
          </h1>
          <p className="text-gray-500 mt-1 font-medium italic">Project health · workload · methodology mix</p>
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
            className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-orange-100">
            <h2 className="text-2xl font-black text-orange-600 mb-6 flex items-center gap-3">
              <FiAlertTriangle /> Top overloaded employees
            </h2>
            <div className="space-y-3">
              {system.topOverloaded.map((row) => {
                const pct = Math.round(row.utilizationPct * 100);
                return (
                  <div key={row.userId} className="flex items-center gap-6 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                    <div className="w-44 shrink-0">
                      <div className="font-bold text-gray-900">{row.fullName}</div>
                      <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{row.totalEstimatedHours.toFixed(1)}h booked</div>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Utilisation</span>
                        <span className={`text-xs font-black ${pct >= 100 ? 'text-red-600' : 'text-orange-600'}`}>{pct}%</span>
                      </div>
                      <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div className={`h-full ${pct >= 100 ? 'bg-red-500' : 'bg-orange-500'}`} style={{ width: `${Math.min(150, pct) / 1.5}%` }} />
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
            className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
            <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-3">
              <FiZap className="text-indigo-600" /> Methodology mix
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(system.methodologyBreakdown).map(([m, n]) => (
                <div key={m} className="rounded-2xl border border-gray-100 p-5 bg-gray-50">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{m}</div>
                  <div className="text-3xl font-black text-gray-900 mt-1">{n}</div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* PROJECT HEALTH TABLE */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
          <h2 className="text-2xl font-black text-gray-900 mb-6">Project health</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
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
                      className="hover:bg-gray-50 cursor-pointer border-t border-gray-50 transition-colors"
                    >
                      <td className="p-3 font-bold text-gray-900">{p.title || p.Title}</td>
                      <td className="p-3 text-gray-600">{h?.methodology || '—'}</td>
                      <td className="p-3 text-gray-600">{h ? `${h.completedTasks}/${h.totalTasks}` : '…'}</td>
                      <td className="p-3 text-gray-600">{h ? `${Math.round(h.onTimeRatio * 100)}%` : '…'}</td>
                      <td className={`p-3 font-bold ${h && h.avgUtilization >= 1 ? 'text-red-600' : h && h.avgUtilization >= 0.9 ? 'text-orange-600' : 'text-emerald-600'}`}>
                        {h ? `${Math.round(h.avgUtilization * 100)}%` : '…'}
                      </td>
                      <td className="p-3">
                        {!h ? <span className="text-gray-400">…</span> : h.isOverdue ? (
                          <span className="px-3 py-1 rounded-full bg-red-100 text-red-700 text-[10px] font-black uppercase tracking-widest">Overdue</span>
                        ) : (
                          <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest">Healthy</span>
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
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={() => setOpenProject(null)} />
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl p-10"
          >
            <button onClick={() => setOpenProject(null)} className="absolute top-6 right-6 text-gray-300 hover:text-gray-700">
              <FiX size={22} />
            </button>
            <h3 className="text-3xl font-black text-gray-900 mb-2">{openProject.title}</h3>
            <p className="text-gray-500 italic mb-6">{openProject.methodology || 'Unspecified methodology'}</p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <SmallStat label="Tasks done" value={`${openProject.completedTasks}/${openProject.totalTasks}`} />
              <SmallStat label="On-time ratio" value={`${Math.round(openProject.onTimeRatio * 100)}%`} />
              <SmallStat label="Avg utilisation" value={`${Math.round(openProject.avgUtilization * 100)}%`} />
              <SmallStat label="Overloaded members" value={openProject.overloadedMembers.toString()} />
              <SmallStat label="Milestones" value={`${openProject.milestonesCompleted}/${openProject.milestonesTotal}`} />
              <SmallStat label="Status" value={openProject.isOverdue ? 'Overdue' : 'Healthy'} />
            </div>

            {openProject.aiRiskSummary && (
              <div className="rounded-2xl bg-indigo-50 border border-indigo-100 p-5 mb-6">
                <div className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <FiZap /> AI risk summary
                </div>
                <p className="text-sm text-indigo-900">{openProject.aiRiskSummary}</p>
              </div>
            )}

            <button onClick={() => setOpenProject(null)} className="bg-indigo-600 text-white py-3 px-6 rounded-2xl font-bold w-full flex items-center justify-center gap-2">
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
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    orange: 'bg-orange-50 text-orange-600',
    red: 'bg-red-50 text-red-600',
  } as const;
  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
      <div className={`size-12 rounded-2xl flex items-center justify-center ${map[accent]} text-xl`}>{icon}</div>
      <div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
        <h3 className="text-2xl font-black text-gray-900">{value}</h3>
      </div>
    </div>
  );
};

const SmallStat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4">
    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</div>
    <div className="text-xl font-black text-gray-900 mt-1">{value}</div>
  </div>
);

export default MonitoringPanel;
