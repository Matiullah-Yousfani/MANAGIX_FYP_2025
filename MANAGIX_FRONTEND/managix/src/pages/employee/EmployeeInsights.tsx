import React, { useEffect, useState } from 'react';
import { insightsService } from '../../api/insightsService';
import { timesheetService } from '../../api/timesheetService';
import { normalizeInsights } from '../../api/normalize';
import { FiActivity, FiAward, FiClock, FiTrendingUp } from 'react-icons/fi';

const EmployeeInsights: React.FC = () => {
  const role = localStorage.getItem('roleName') || localStorage.getItem('userRole');
  const isManager = role === 'Manager';
  const isEmployee = role === 'Employee';
  const managerId = localStorage.getItem('userId') || '';
  const [teamMembers, setTeamMembers] = useState<{ userId: string; fullName: string }[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [data, setData] = useState<any>(null);
  const [timesheet, setTimesheet] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isEmployee) {
      setSelectedUserId(managerId);
      return;
    }
    if (isManager && managerId) {
      insightsService
        .getManagerTeamMembers(managerId)
        .then((members) => {
          setTeamMembers(members);
          if (members[0]?.userId) setSelectedUserId(members[0].userId);
        })
        .finally(() => setLoading(false));
      return;
    }
    setLoading(false);
  }, [isEmployee, isManager, managerId]);

  useEffect(() => {
    if (!selectedUserId) {
      setData(null);
      setTimesheet(null);
      if (!isManager) setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      insightsService.getEmployee(selectedUserId),
      timesheetService.summary(selectedUserId).catch(() => null),
    ])
      .then(([ins, ts]) => {
        setData(normalizeInsights(ins));
        setTimesheet(ts);
      })
      .catch(() => {
        setData(null);
        setTimesheet(null);
      })
      .finally(() => setLoading(false));
  }, [selectedUserId]);

  if (loading && !data) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (isManager && teamMembers.length === 0) {
    return (
      <div className="max-w-5xl mx-auto p-12 text-center text-gray-500">
        <p className="font-bold">No team members yet.</p>
        <p className="mt-2 text-sm">Assign teams to your projects in Team Hub, then view insights here.</p>
      </div>
    );
  }

  if (!data && !loading) {
    return <p className="text-gray-500 p-8">No insights available for this selection.</p>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black text-gray-900">
          {isManager ? 'Team insights' : 'My insights'}
        </h1>
        <p className="text-gray-500 mt-1">
          {isManager
            ? 'Performance and workload for employees on your project teams'
            : 'Performance, workload, and utilization on MANAGIX'}
        </p>
      </div>

      {isManager && teamMembers.length > 0 && (
        <select
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
          className="border border-gray-200 rounded-xl px-4 py-3 font-bold w-full max-w-md"
        >
          {teamMembers.map((m) => (
            <option key={m.userId} value={m.userId}>
              {m.fullName}
            </option>
          ))}
        </select>
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Kpi icon={<FiAward />} label="Level" value={data.employeeLevel} />
            <Kpi icon={<FiTrendingUp />} label="Completion" value={`${data.completionRate}%`} />
            <Kpi icon={<FiClock />} label="Logged hours" value={`${data.totalLoggedHours}h`} />
            <Kpi
              icon={<FiActivity />}
              label="Status"
              value={data.isOnline ? 'Online' : 'Offline'}
              online={data.isOnline}
            />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-black text-gray-900 mb-4">Workload</h2>
            <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${data.utilizationPct > 1 ? 'bg-red-500' : 'bg-indigo-600'}`}
                style={{ width: `${Math.min(100, data.utilizationPct * 100)}%` }}
              />
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {data.activeWorkloadHours}h active of {data.weeklyCapacityHours}h capacity
            </p>
          </div>

          {timesheet && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-black text-gray-900 mb-2">Timesheet</h2>
              <p className="text-sm text-gray-600">
                This week: <strong>{timesheet.totalHoursThisWeek}h</strong> · All time:{' '}
                <strong>{timesheet.totalHoursAllTime}h</strong>
              </p>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-black text-gray-900 mb-4">
              {isManager ? 'Your projects (for this employee)' : 'Active projects'}
            </h2>
            <ul className="space-y-2">
              {(data.activeProjects || []).length === 0 ? (
                <li className="text-sm text-gray-400">No active projects.</li>
              ) : (
                (data.activeProjects || []).map((p: any) => (
                  <li
                    key={p.projectId}
                    className="flex justify-between text-sm border-b border-gray-50 py-2"
                  >
                    <span className="font-bold">{p.title}</span>
                    <span className="text-gray-500">
                      {p.completedTasks}/{p.assignedTasks} tasks
                    </span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  );
};

const Kpi: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  online?: boolean;
}> = ({ icon, label, value, online }) => (
  <div className="bg-white rounded-2xl border border-gray-100 p-5">
    <div className="text-indigo-600 mb-2">{icon}</div>
    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
    <p
      className={`text-xl font-black mt-1 ${
        online === true ? 'text-emerald-600' : online === false ? 'text-gray-600' : 'text-gray-900'
      }`}
    >
      {value}
    </p>
  </div>
);

export default EmployeeInsights;
