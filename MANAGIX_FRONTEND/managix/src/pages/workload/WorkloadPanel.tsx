import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FiTrendingUp, FiAlertTriangle, FiUsers, FiActivity } from 'react-icons/fi';
import { workloadService } from '../../api/workloadService';
import { projectService } from '../../api/projectService';
import type { WorkloadEntry } from '../../types';
import type { ProjectWorkload } from '../../api/workloadService';

const WorkloadPanel: React.FC = () => {
  const role = localStorage.getItem('roleName') || localStorage.getItem('userRole');
  const isAdmin = role === 'Admin';
  const isManager = role === 'Manager';
  const managerId = localStorage.getItem('userId') || '';
  const [teamLoad, setTeamLoad] = useState<WorkloadEntry[]>([]);
  const [overloaded, setOverloaded] = useState<WorkloadEntry[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [projectLoad, setProjectLoad] = useState<ProjectWorkload | null>(null);
  const [loading, setLoading] = useState(true);
  const [memberSearch, setMemberSearch] = useState('');

  useEffect(() => {
    (async () => {
      try {
        if (isAdmin) {
          const [all, alerts] = await Promise.all([
            workloadService.getOverloaded(0),
            workloadService.getOverloaded(0.9),
          ]);
          setTeamLoad(all);
          setOverloaded(alerts);
        } else if (isManager && managerId) {
          const [team, alerts, list] = await Promise.all([
            workloadService.getManagerTeam(managerId),
            workloadService.getOverloaded(0.9, managerId),
            projectService.getByManager(managerId),
          ]);
          setTeamLoad(team);
          setOverloaded(alerts);
          const arr = Array.isArray(list) ? list : [];
          setProjects(arr);
          const first = arr[0];
          if (first?.projectId) setSelectedProjectId(first.projectId);
        }
      } catch (e) {
        console.error('Workload fetch failed', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [isAdmin, isManager, managerId]);

  useEffect(() => {
    if (!selectedProjectId) {
      setProjectLoad(null);
      return;
    }
    workloadService.getProject(selectedProjectId).then(setProjectLoad).catch(() => setProjectLoad(null));
  }, [selectedProjectId]);

  const avg = teamLoad.length
    ? teamLoad.reduce((a, b) => a + b.utilizationPct, 0) / teamLoad.length
    : 0;
  const totalActive = teamLoad.reduce((a, b) => a + b.activeTaskCount, 0);

  if (loading) {
    return (
      <div className="min-h-screen  flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  const teamLabel = isAdmin ? 'All employees' : 'Your project teams';

  const filterMembers = (list: WorkloadEntry[]) => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter((e) => e.fullName.toLowerCase().includes(q));
  };

  const filteredTeamLoad = filterMembers(teamLoad);
  const filteredOverloaded = filterMembers(overloaded);
  const filteredProjectMembers = projectLoad ? filterMembers(projectLoad.members) : [];

  return (
    <div className="min-h-screen  pb-20 font-sans">
      <div className="bg-white border-b border-gray-200/70 mb-8 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-extrabold text-gray-900 flex items-center gap-3">
              <FiTrendingUp className="text-indigo-600" /> Workload
            </h1>
            <p className="text-gray-500 mt-1 font-medium italic">
              {isManager
                ? 'Capacity for employees on your project teams only'
                : 'Organization-wide capacity overview'}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 space-y-12">
        <input
          type="search"
          placeholder="Search team members…"
          value={memberSearch}
          onChange={(e) => setMemberSearch(e.target.value)}
          className="w-full max-w-md border border-gray-200 rounded-xl px-4 py-3 font-medium text-sm"
        />

        {isManager && projects.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200/70"
          >
            <h2 className="text-2xl font-extrabold text-gray-900 mb-1">Project team hours</h2>
            <p className="text-sm text-gray-500 mb-4">
              Active task hours on the selected project only (Todo / In Progress).
            </p>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="mb-6 border border-gray-200 rounded-xl px-4 py-3 font-bold w-full max-w-md"
            >
              {projects.map((p) => (
                <option key={p.projectId} value={p.projectId}>
                  {p.title}
                </option>
              ))}
            </select>
            {projectLoad && filteredProjectMembers.length > 0 ? (
              <div className="space-y-3">
                {filteredProjectMembers.map((e) => (
                  <UtilizationRow key={e.userId} entry={e} />
                ))}
              </div>
            ) : (
              <p className="text-gray-400 italic text-sm">
                Assign a team and add tasks with estimated hours to see project workload.
              </p>
            )}
          </motion.div>
        )}

        {isManager && projects.length === 0 && (
          <p className="text-gray-500 font-medium">
            Create a project, assign a team in Team Hub, then return here.
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Kpi
            icon={<FiUsers />}
            label={isAdmin ? 'Tracked employees' : 'Team members'}
            value={teamLoad.length.toString()}
            accent="indigo"
          />
          <Kpi
            icon={<FiActivity />}
            label="Avg utilisation"
            value={`${Math.round(avg * 100)}%`}
            accent={avg >= 1 ? 'red' : avg >= 0.9 ? 'orange' : 'emerald'}
          />
          <Kpi
            icon={<FiAlertTriangle />}
            label="Over 90%"
            value={filteredOverloaded.length.toString()}
            accent={overloaded.length > 0 ? 'orange' : 'emerald'}
          />
        </div>

        {filteredOverloaded.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-8 shadow-sm border border-orange-100"
          >
            <h2 className="text-2xl font-extrabold text-orange-600 mb-6 flex items-center gap-3">
              <FiAlertTriangle /> Capacity alerts
            </h2>
            <div className="space-y-3">
              {filteredOverloaded.map((e) => (
                <UtilizationRow key={e.userId} entry={e} />
              ))}
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200/70"
        >
          <h2 className="text-2xl font-extrabold text-gray-900 mb-2">{teamLabel}</h2>
          <p className="text-sm text-gray-500 mb-6">
            Total active workload across all assigned tasks (company-wide for each person).
          </p>
          {filteredTeamLoad.length === 0 ? (
            <p className="text-gray-400 italic">
              No team members yet. Assign teams to your projects in Team Hub.
            </p>
          ) : (
            <div className="space-y-3">
              {filteredTeamLoad.map((e) => (
                <UtilizationRow key={e.userId} entry={e} />
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

const Kpi: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: 'indigo' | 'emerald' | 'orange' | 'red';
}> = ({ icon, label, value, accent }) => {
  const map = {
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    orange: 'bg-orange-50 text-orange-600',
    red: 'bg-red-50 text-red-600',
  } as const;
  return (
    <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-200/70 flex items-center gap-6">
      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${map[accent]} text-2xl`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">{label}</p>
        <h3 className="text-3xl font-extrabold text-gray-900">{value}</h3>
      </div>
    </div>
  );
};

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

  const isFree = (entry.activeTaskCount ?? 0) === 0;

  return (
    <div className={`flex items-center gap-6 p-4 rounded-2xl border ${
      isFree ? 'border-emerald-200 bg-emerald-50/80 ring-1 ring-emerald-100' : 'border-gray-200/70 bg-gray-50'
    }`}>
      <div className="w-44 shrink-0">
        <div className="font-bold text-gray-900 flex items-center gap-2">
          {entry.fullName}
          {isFree && (
            <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-600 text-white">Free</span>
          )}
        </div>
        <div className={`text-[10px] font-extrabold uppercase tracking-widest ${isFree ? 'text-emerald-700' : 'text-gray-400'}`}>
          {isFree
            ? 'No active tasks — available for assignment'
            : `${entry.assignedTaskCount ?? 0} assigned - ${entry.inProgressTaskCount ?? entry.activeTaskCount ?? 0} active`}
          {entry.usesClockedHours && (
            <span className="block text-indigo-600">
              {entry.clockedHoursThisWeek?.toFixed(1)}h clocked this week
            </span>
          )}
        </div>
      </div>
      <div className="flex-1">
        <div className="flex justify-between mb-1">
          <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">
            {entry.usesClockedHours
              ? `${entry.clockedHoursThisWeek?.toFixed(1) ?? 0}h clocked`
              : `${entry.totalEstimatedHours.toFixed(1)}h est.`}{' '}
            / {entry.capacityHours.toFixed(0)}h
          </span>
          <span className={`text-xs font-extrabold ${text}`}>{pct}%</span>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div className={`h-full ${fill}`} style={{ width: `${(clamped / 150) * 100}%` }} />
        </div>
      </div>
    </div>
  );
};

export default WorkloadPanel;
