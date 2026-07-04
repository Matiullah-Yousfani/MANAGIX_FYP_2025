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
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-line border-t-primary rounded-full animate-spin" />
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
    <div className="min-h-screen bg-bg pb-20 font-sans">
      <div className="bg-surface border-b border-line mb-8 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-fg flex items-center gap-3">
              <FiTrendingUp className="text-primary" /> Workload
            </h1>
            <p className="text-fg-muted mt-1 font-medium">
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
          className="w-full max-w-md bg-surface-2 text-fg border border-line rounded-lg px-4 py-3 font-medium text-sm focus:ring-2 focus:ring-primary/25 focus:border-primary outline-none"
        />

        {isManager && projects.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-surface rounded-xl p-8 shadow-e1 border border-line"
          >
            <h2 className="text-2xl font-bold text-fg mb-1">Project team hours</h2>
            <p className="text-sm text-fg-muted mb-4">
              Active task hours on the selected project only (Todo / In Progress).
            </p>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="mb-6 bg-surface-2 text-fg border border-line rounded-lg px-4 py-3 font-bold w-full max-w-md focus:ring-2 focus:ring-primary/25 focus:border-primary outline-none"
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
              <p className="text-fg-subtle text-sm">
                Assign a team and add tasks with estimated hours to see project workload.
              </p>
            )}
          </motion.div>
        )}

        {isManager && projects.length === 0 && (
          <p className="text-fg-muted font-medium">
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
            className="bg-surface rounded-xl p-8 shadow-e1 border border-warning/25"
          >
            <h2 className="text-2xl font-bold text-warning mb-6 flex items-center gap-3">
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
          className="bg-surface rounded-xl p-8 shadow-e1 border border-line"
        >
          <h2 className="text-2xl font-bold text-fg mb-2">{teamLabel}</h2>
          <p className="text-sm text-fg-muted mb-6">
            Total active workload across all assigned tasks (company-wide for each person).
          </p>
          {filteredTeamLoad.length === 0 ? (
            <p className="text-fg-subtle">
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
    indigo: 'bg-primary-soft text-primary',
    emerald: 'bg-success-soft text-success',
    orange: 'bg-warning-soft text-warning',
    red: 'bg-danger-soft text-danger',
  } as const;
  return (
    <div className="bg-surface rounded-xl p-8 shadow-e1 border border-line flex items-center gap-6">
      <div className={`w-16 h-16 rounded-lg flex items-center justify-center ${map[accent]} text-2xl`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-bold text-fg-subtle uppercase tracking-widest">{label}</p>
        <h3 className="text-3xl font-bold text-fg">{value}</h3>
      </div>
    </div>
  );
};

const UtilizationRow: React.FC<{ entry: WorkloadEntry }> = ({ entry }) => {
  const pct = Math.round(entry.utilizationPct * 100);
  const clamped = Math.min(150, pct);
  const tier = pct >= 100 ? 'red' : pct >= 90 ? 'orange' : pct >= 60 ? 'indigo' : 'emerald';
  const fill = {
    red: 'bg-danger',
    orange: 'bg-warning',
    indigo: 'bg-primary',
    emerald: 'bg-success',
  }[tier];
  const text = {
    red: 'text-danger',
    orange: 'text-warning',
    indigo: 'text-primary',
    emerald: 'text-success',
  }[tier];

  const isFree = (entry.activeTaskCount ?? 0) === 0;

  return (
    <div className={`flex items-center gap-6 p-4 rounded-lg border ${
      isFree ? 'border-success/25 bg-success-soft ring-1 ring-success/25' : 'border-line bg-surface-2'
    }`}>
      <div className="w-44 shrink-0">
        <div className="font-bold text-fg flex items-center gap-2">
          {entry.fullName}
          {isFree && (
            <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-success text-white">Free</span>
          )}
        </div>
        <div className={`text-[10px] font-bold uppercase tracking-widest ${isFree ? 'text-success' : 'text-fg-subtle'}`}>
          {isFree
            ? 'No active tasks — available for assignment'
            : `${entry.assignedTaskCount ?? 0} assigned - ${entry.inProgressTaskCount ?? entry.activeTaskCount ?? 0} active`}
          {entry.usesClockedHours && (
            <span className="block text-primary">
              {entry.clockedHoursThisWeek?.toFixed(1)}h clocked this week
            </span>
          )}
        </div>
      </div>
      <div className="flex-1">
        <div className="flex justify-between mb-1">
          <span className="text-[10px] font-bold text-fg-subtle uppercase tracking-widest">
            {entry.usesClockedHours
              ? `${entry.clockedHoursThisWeek?.toFixed(1) ?? 0}h clocked`
              : `${entry.totalEstimatedHours.toFixed(1)}h est.`}{' '}
            / {entry.capacityHours.toFixed(0)}h
          </span>
          <span className={`text-xs font-bold ${text}`}>{pct}%</span>
        </div>
        <div className="h-3 bg-surface-3 rounded-full overflow-hidden">
          <div className={`h-full ${fill}`} style={{ width: `${(clamped / 150) * 100}%` }} />
        </div>
      </div>
    </div>
  );
};

export default WorkloadPanel;
