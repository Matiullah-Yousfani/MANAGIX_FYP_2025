import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiBriefcase,
  FiAlertTriangle,
  FiCalendar,
  FiCheckSquare,
  FiClock,
} from 'react-icons/fi';
import api from '../api/axiosInstance';
import { timesheetService } from '../api/timesheetService';
import { projectService } from '../api/projectService';

const ManagerDashboardWidgets: React.FC<{ userId: string }> = ({ userId }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    activeProjects: 0,
    delayedProjects: 0,
    pendingTimesheets: 0,
    pendingQa: 0,
    upcomingMeetings: 0,
  });

  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const projects = await projectService.getByManager(userId);
        const list = Array.isArray(projects) ? projects : [];
        const now = new Date();
        const active = list.filter((p: any) => !(p.isClosed ?? p.IsClosed));
        const delayed = active.filter((p: any) => {
          const dl = p.deadline ?? p.Deadline;
          return dl && new Date(dl) < now;
        });

        let pendingTs = 0;
        try {
          const sheets = await timesheetService.listManager(userId);
          pendingTs = (sheets || []).filter(
            (r: any) => String(r.status ?? r.Status).toLowerCase() === 'submitted'
          ).length;
        } catch {
          /* ignore */
        }

        let pendingQa = 0;
        await Promise.all(
          active.slice(0, 12).map(async (p: any) => {
            const pid = p.projectId ?? p.ProjectId;
            try {
              const res = await api.get(`/tasks/project/${pid}`);
              pendingQa += (res.data || []).filter((t: any) => {
                const st = String(t.status ?? t.Status ?? '').toLowerCase();
                return st === 'done' || st === 'submitted';
              }).length;
            } catch {
              /* ignore */
            }
          })
        );

        let meetings = 0;
        try {
          const res = await api.get(`/meetings/manager/${userId}/upcoming`);
          meetings = Array.isArray(res.data) ? res.data.length : 0;
        } catch {
          try {
            const res = await api.get('/meetings/my-upcoming');
            meetings = Array.isArray(res.data) ? res.data.length : 0;
          } catch {
            /* ignore */
          }
        }

        setStats({
          activeProjects: active.length,
          delayedProjects: delayed.length,
          pendingTimesheets: pendingTs,
          pendingQa,
          upcomingMeetings: meetings,
        });
      } catch {
        /* ignore */
      }
    })();
  }, [userId]);

  const cards = [
    {
      label: 'Active Projects',
      value: stats.activeProjects,
      icon: FiBriefcase,
      color: 'text-indigo-600 bg-indigo-50',
      action: () => navigate('/dashboard'),
    },
    {
      label: 'Delayed Projects',
      value: stats.delayedProjects,
      icon: FiAlertTriangle,
      color: 'text-red-600 bg-red-50',
      action: () => navigate('/dashboard'),
    },
    {
      label: 'Pending Timesheets',
      value: stats.pendingTimesheets,
      icon: FiClock,
      color: 'text-amber-600 bg-amber-50',
      action: () => navigate('/timesheets'),
    },
    {
      label: 'QA Reviews',
      value: stats.pendingQa,
      icon: FiCheckSquare,
      color: 'text-violet-600 bg-violet-50',
      action: () => navigate('/tasks'),
    },
    {
      label: 'Upcoming Meetings',
      value: stats.upcomingMeetings,
      icon: FiCalendar,
      color: 'text-blue-600 bg-blue-50',
      action: () => navigate('/meeting/schedule'),
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
      {cards.map((c) => (
        <button
          key={c.label}
          type="button"
          onClick={c.action}
          className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-left hover:shadow-md hover:-translate-y-0.5 transition-all"
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${c.color}`}>
            <c.icon size={18} />
          </div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{c.label}</p>
          <p className="text-2xl font-black text-gray-900 mt-1">{c.value}</p>
        </button>
      ))}
    </div>
  );
};

export default ManagerDashboardWidgets;
