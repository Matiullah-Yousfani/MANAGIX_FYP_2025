// PHASE 3: Workload management panel (manager / admin).
// Visual: KPI strip + capacity heatmap row per employee.
// Reuses MANAGIX patterns: bg-[#F8FAFC] page, white rounded-[2.5rem] cards, indigo accent,
// uppercase tracking-widest labels, framer-motion entrance.
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FiTrendingUp, FiAlertTriangle, FiUsers, FiActivity } from 'react-icons/fi';
import { workloadService } from '../../api/workloadService';
import type { WorkloadEntry } from '../../types';

const WorkloadPanel: React.FC = () => {
  const [overloaded, setOverloaded] = useState<WorkloadEntry[]>([]);
  const [allLoad, setAllLoad] = useState<WorkloadEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // Threshold 0 returns *everyone* — we use it as "show all" so the heatmap is complete.
        // The same endpoint with threshold=0.9 gives us the alert list.
        const [all, alerts] = await Promise.all([
          workloadService.getOverloaded(0),
          workloadService.getOverloaded(0.9),
        ]);
        setAllLoad(all);
        setOverloaded(alerts);
      } catch (e) {
        console.error('Workload fetch failed', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const avg = allLoad.length
    ? allLoad.reduce((a, b) => a + b.utilizationPct, 0) / allLoad.length
    : 0;
  const totalActive = allLoad.reduce((a, b) => a + b.activeTaskCount, 0);

  if (loading) return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20 font-sans">
      {/* HEADER — matches the Dashboard.tsx hero block */}
      <div className="bg-white border-b border-gray-100 mb-8 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black text-gray-900 flex items-center gap-3">
              <FiTrendingUp className="text-indigo-600" /> Workload
            </h1>
            <p className="text-gray-500 mt-1 font-medium italic">Capacity & utilisation overview</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 space-y-12">
        {/* KPI STRIP */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Kpi icon={<FiUsers />} label="Tracked employees" value={allLoad.length.toString()} accent="indigo" />
          <Kpi icon={<FiActivity />} label="Avg utilisation" value={`${Math.round(avg * 100)}%`} accent={avg >= 1 ? 'red' : avg >= 0.9 ? 'orange' : 'emerald'} />
          <Kpi icon={<FiAlertTriangle />} label="Over 90%" value={overloaded.length.toString()} accent={overloaded.length > 0 ? 'orange' : 'emerald'} />
        </div>

        {/* OVER-LOAD ALERTS */}
        {overloaded.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-orange-100">
            <h2 className="text-2xl font-black text-orange-600 mb-6 flex items-center gap-3">
              <FiAlertTriangle /> Capacity alerts
            </h2>
            <div className="space-y-3">
              {overloaded.map((e) => (
                <UtilizationRow key={e.userId} entry={e} />
              ))}
            </div>
          </motion.div>
        )}

        {/* FULL HEATMAP */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
          <h2 className="text-2xl font-black text-gray-900 mb-6">All employees</h2>
          {allLoad.length === 0 ? (
            <p className="text-gray-400 italic">No tracked employees yet. Once tasks have estimated hours, this view fills in automatically.</p>
          ) : (
            <div className="space-y-3">
              {allLoad.map((e) => (
                <UtilizationRow key={e.userId} entry={e} />
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

// PHASE 3: Reusable KPI tile — same shape as the Dashboard top metrics.
const Kpi: React.FC<{ icon: React.ReactNode; label: string; value: string; accent: 'indigo' | 'emerald' | 'orange' | 'red' }> = ({
  icon, label, value, accent,
}) => {
  const map = {
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    orange: 'bg-orange-50 text-orange-600',
    red: 'bg-red-50 text-red-600',
  } as const;
  return (
    <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex items-center gap-6">
      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${map[accent]} text-2xl`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
        <h3 className="text-3xl font-black text-gray-900">{value}</h3>
      </div>
    </div>
  );
};

// PHASE 3: One row in the heatmap. Color band indicates utilisation tier.
const UtilizationRow: React.FC<{ entry: WorkloadEntry }> = ({ entry }) => {
  const pct = Math.round(entry.utilizationPct * 100);
  const clamped = Math.min(150, pct);
  const tier = pct >= 100 ? 'red' : pct >= 90 ? 'orange' : pct >= 60 ? 'indigo' : 'emerald';
  const fill = {
    red: 'bg-red-500',
    orange: 'bg-orange-500',
    indigo: 'bg-indigo-500',
    emerald: 'bg-emerald-500',
  }[tier];
  const text = {
    red: 'text-red-600',
    orange: 'text-orange-600',
    indigo: 'text-indigo-600',
    emerald: 'text-emerald-600',
  }[tier];

  return (
    <div className="flex items-center gap-6 p-4 rounded-2xl border border-gray-100 bg-gray-50">
      <div className="w-44 shrink-0">
        <div className="font-bold text-gray-900">{entry.fullName}</div>
        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
          {entry.activeTaskCount} active · {entry.projectsAssigned} projects
        </div>
      </div>
      <div className="flex-1">
        <div className="flex justify-between mb-1">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
            {entry.totalEstimatedHours.toFixed(1)}h / {entry.capacityHours.toFixed(0)}h
          </span>
          <span className={`text-xs font-black ${text}`}>{pct}%</span>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div className={`h-full ${fill}`} style={{ width: `${(clamped / 150) * 100}%` }} />
        </div>
      </div>
    </div>
  );
};

export default WorkloadPanel;
