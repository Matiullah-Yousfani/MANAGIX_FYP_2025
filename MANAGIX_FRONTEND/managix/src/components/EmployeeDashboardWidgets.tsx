import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiClock, FiCheckCircle, FiList, FiCalendar, FiArrowRight, FiVideo } from 'react-icons/fi';
import { taskService } from '../api/taskService';
import { timesheetService } from '../api/timesheetService';
import { useActiveMeetings } from '../hooks/useActiveMeetings';

type Props = {
  userId: string;
};

const EmployeeDashboardWidgets: React.FC<Props> = ({ userId }) => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [todayHours, setTodayHours] = useState(0);
  const [isClockedIn, setIsClockedIn] = useState(false);
  const { active, hasActive } = useActiveMeetings(30_000);

  useEffect(() => {
    if (!userId) return;
    taskService.getAssignedToMe().then((list) => setTasks(Array.isArray(list) ? list : [])).catch(() => setTasks([]));
    timesheetService.today(userId).then((t) => {
      setTodayHours(Number(t?.todayHours ?? t?.TodayHours ?? 0));
      setIsClockedIn(Boolean(t?.isClockedIn ?? t?.IsClockedIn));
    }).catch(() => {});
  }, [userId]);

  const norm = (s?: string) => {
    const v = (s || '').toLowerCase();
    if (v === 'pending') return 'todo';
    if (v === 'in progress' || v === 'inprogress') return 'inprogress';
    if (v === 'done' || v === 'submitted' || v === 'approved') return 'done';
    return v || 'todo';
  };

  const activeTasks = tasks.filter((t) => {
    const s = norm(t.status ?? t.Status);
    return s === 'todo' || s === 'inprogress';
  }).length;

  const completedToday = tasks.filter((t) => {
    const s = norm(t.status ?? t.Status);
    if (s !== 'done') return false;
    const updated = t.updatedAt ?? t.UpdatedAt ?? t.createdAt ?? t.CreatedAt;
    if (!updated) return false;
    const d = new Date(updated);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;

  const pendingReview = tasks.filter((t) => {
    const s = norm(t.status ?? t.Status);
    return s === 'done';
  }).length;

  const upcoming = tasks
    .filter((t) => t.deadline ?? t.Deadline)
    .map((t) => ({
      title: t.title ?? t.Title ?? 'Task',
      deadline: new Date(t.deadline ?? t.Deadline),
      status: t.status ?? t.Status ?? 'Todo',
    }))
    .sort((a, b) => a.deadline.getTime() - b.deadline.getTime())
    .slice(0, 5);

  const recent = tasks
    .slice()
    .sort((a, b) => new Date(b.updatedAt ?? b.UpdatedAt ?? b.createdAt ?? b.CreatedAt ?? 0).getTime()
      - new Date(a.updatedAt ?? a.UpdatedAt ?? a.createdAt ?? a.CreatedAt ?? 0).getTime())
    .slice(0, 4)
    .map((t) => ({
      title: t.title ?? t.Title ?? 'Task',
      status: t.status ?? t.Status ?? 'Updated',
    }));

  const daysUntil = (d: Date) => {
    const diff = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return 'Overdue';
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    return `${diff} days left`;
  };

  return (
    <div className="space-y-8 mb-10">
      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Link to="/task-hub" className="px-5 py-3 bg-white border border-gray-200/70 rounded-2xl text-xs font-extrabold uppercase tracking-widest text-indigo-600 hover:bg-indigo-50 flex items-center gap-2">
          <FiList /> Open Kanban
        </Link>
        <Link to="/my-timesheet" className="px-5 py-3 bg-white border border-gray-200/70 rounded-2xl text-xs font-extrabold uppercase tracking-widest text-indigo-600 hover:bg-indigo-50 flex items-center gap-2">
          <FiClock /> My Timesheet
        </Link>
        {hasActive && (
          <Link to="/meeting" className="px-5 py-3 bg-emerald-600 text-white rounded-2xl text-xs font-extrabold uppercase tracking-widest hover:bg-emerald-700 flex items-center gap-2">
            <FiVideo /> Join Meeting
          </Link>
        )}
      </div>

      {/* Workload widget */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Tasks', value: activeTasks, icon: FiList },
          { label: 'Completed Today', value: completedToday, icon: FiCheckCircle },
          { label: 'Hours Today', value: `${todayHours.toFixed(1)}h`, icon: FiClock },
          { label: 'Pending Reviews', value: pendingReview, icon: FiCalendar },
        ].map((w) => (
          <div key={w.label} className="card p-5">
            <w.icon className="text-indigo-500 mb-2" size={18} />
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">{w.label}</p>
            <p className="text-2xl font-extrabold text-gray-900 mt-1">{w.value}</p>
            {w.label === 'Hours Today' && isClockedIn && (
              <span className="text-[10px] font-extrabold text-emerald-600 uppercase">Clocked in</span>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming deadlines */}
        <div className="card p-6">
          <h3 className="text-sm font-extrabold uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2">
            <FiCalendar /> Upcoming Deadlines
          </h3>
          {upcoming.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No upcoming due dates on your tasks.</p>
          ) : (
            <ul className="space-y-3">
              {upcoming.map((t, i) => (
                <li key={i} className="flex items-center justify-between text-sm bg-gray-50 rounded-xl px-4 py-3">
                  <span className="font-bold text-gray-800 truncate pr-2">{t.title}</span>
                  <span className={`text-[10px] font-extrabold uppercase shrink-0 ${
                    daysUntil(t.deadline) === 'Overdue' ? 'text-red-600' : 'text-indigo-600'
                  }`}>
                    {daysUntil(t.deadline)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent activity */}
        <div className="card p-6">
          <h3 className="text-sm font-extrabold uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2">
            <FiArrowRight /> Recent Activity
          </h3>
          {recent.length === 0 ? (
            <p className="text-sm text-gray-400 italic">You don't have any assigned tasks yet.</p>
          ) : (
            <ul className="space-y-3">
              {recent.map((r, i) => (
                <li key={i} className="text-sm bg-gray-50 rounded-xl px-4 py-3">
                  <span className="font-bold text-gray-800">{r.title}</span>
                  <span className="text-gray-500"> — {r.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboardWidgets;
