import React, { useEffect, useState } from 'react';
import { adminPayrollService } from '../../api/adminPayrollService';
import { timesheetService } from '../../api/timesheetService';

const AdminTimesheetPayrollTab: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [sheets, setSheets] = useState<any[]>([]);
  const [policy, setPolicy] = useState({ standardHoursPerDay: 8, overtimeGraceHours: 2, dailyMaxHours: 12 });
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [users, pol, allSheets] = await Promise.all([
        adminPayrollService.listUsers(),
        timesheetService.getPolicy(),
        timesheetService.listAdmin(),
      ]);
      setRows(Array.isArray(users) ? users : []);
      setPolicy({
        standardHoursPerDay: Number(pol?.standardHoursPerDay ?? pol?.StandardHoursPerDay ?? 8),
        overtimeGraceHours: Number(pol?.overtimeGraceHours ?? pol?.OvertimeGraceHours ?? 2),
        dailyMaxHours: Number(pol?.dailyMaxHours ?? pol?.DailyMaxHours ?? 12),
      });
      setSheets(Array.isArray(allSheets) ? allSheets : []);
    } catch (e: any) {
      setRows([]);
      setSheets([]);
      const status = e?.response?.status;
      if (status === 404) {
        setLoadError('API not found — restart backend (dotnet build + func start).');
      } else if (status === 403) {
        setLoadError('Admin role required.');
      } else {
        setLoadError(e?.response?.data?.message || 'Could not load settings.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const savePolicy = async () => {
    try {
      await timesheetService.updatePolicy(policy);
      alert('Org timesheet policy saved (8h shift + 2h overtime grace = 10h threshold, 12h max).');
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Save policy failed');
    }
  };

  const updateField = (userId: string, field: string, value: string) => {
    setRows((prev) =>
      prev.map((r) => (String(r.userId ?? r.UserId) === userId ? { ...r, [field]: value } : r))
    );
  };

  const saveRate = async (row: any) => {
    const userId = String(row.userId ?? row.UserId);
    setSavingId(userId);
    try {
      await adminPayrollService.updateUser(userId, {
        hourlyRate: Number(row.hourlyRate ?? row.HourlyRate) || 0,
      });
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Save failed');
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return <div className="p-20 text-center text-gray-400 font-black text-[10px] uppercase">Loading…</div>;
  }

  if (loadError) {
    return (
      <div className="bg-white rounded-[2.5rem] border border-red-200 p-10">
        <h2 className="text-lg font-black text-red-700 mb-2">Could not load</h2>
        <p className="text-sm mb-4">{loadError}</p>
        <button type="button" onClick={load} className="px-6 py-3 bg-black text-white rounded-xl text-[10px] font-black uppercase">
          Retry
        </button>
      </div>
    );
  }

  const threshold = policy.standardHoursPerDay + policy.overtimeGraceHours;

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-[2.5rem] border border-[#E5E7EB] p-8 shadow-sm">
        <h2 className="text-xl font-black uppercase tracking-tight mb-2">Org timesheet policy</h2>
        <p className="text-sm text-gray-500 mb-6">
          Default for everyone: {policy.standardHoursPerDay}h shift, {policy.overtimeGraceHours}h overtime grace
          (popup/submit reason after {threshold}h), {policy.dailyMaxHours}h max per day.
        </p>
        <div className="flex flex-wrap gap-4 items-end">
          <label className="text-xs font-bold">
            Shift (h)
            <input
              type="number"
              className="block border rounded-lg px-3 py-2 mt-1 w-20"
              value={policy.standardHoursPerDay}
              onChange={(e) => setPolicy((p) => ({ ...p, standardHoursPerDay: Number(e.target.value) }))}
            />
          </label>
          <label className="text-xs font-bold">
            Overtime grace (h)
            <input
              type="number"
              className="block border rounded-lg px-3 py-2 mt-1 w-20"
              value={policy.overtimeGraceHours}
              onChange={(e) => setPolicy((p) => ({ ...p, overtimeGraceHours: Number(e.target.value) }))}
            />
          </label>
          <label className="text-xs font-bold">
            Max day (h)
            <input
              type="number"
              className="block border rounded-lg px-3 py-2 mt-1 w-20"
              value={policy.dailyMaxHours}
              onChange={(e) => setPolicy((p) => ({ ...p, dailyMaxHours: Number(e.target.value) }))}
            />
          </label>
          <button type="button" onClick={savePolicy} className="px-6 py-3 bg-black text-white rounded-xl text-[10px] font-black uppercase">
            Save policy
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-[#E5E7EB] shadow-2xl overflow-hidden">
        <div className="px-10 py-8 border-b">
          <h2 className="text-xl font-black uppercase">Hourly rates</h2>
          <p className="text-sm text-gray-500 mt-1">Per employee / manager (used in payroll).</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-[10px] font-black uppercase text-gray-400">Employee</th>
                <th className="px-4 py-4 text-left text-[10px] font-black uppercase text-gray-400">$/hr</th>
                <th className="px-4 py-4" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => {
                const uid = String(r.userId ?? r.UserId);
                return (
                  <tr key={uid}>
                    <td className="px-6 py-4 font-bold">{r.fullName ?? r.FullName}</td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        className="w-24 border rounded-lg px-2 py-1"
                        value={r.hourlyRate ?? r.HourlyRate ?? ''}
                        onChange={(e) => updateField(uid, 'hourlyRate', e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        disabled={savingId === uid}
                        onClick={() => saveRate(r)}
                        className="px-4 py-2 bg-black text-white rounded-xl text-[10px] font-black uppercase disabled:opacity-50"
                      >
                        Save
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-[#E5E7EB] p-8 shadow-sm">
        <h2 className="text-xl font-black uppercase mb-4">All daily timesheets</h2>
        {sheets.length === 0 ? (
          <p className="text-gray-400 italic text-sm">No submissions yet.</p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {sheets.map((s) => (
              <div key={s.dailyTimesheetId ?? s.DailyTimesheetId} className="border rounded-xl p-4 text-sm">
                <strong>{s.fullName ?? s.FullName}</strong> — {String(s.workDate ?? s.WorkDate).slice(0, 10)} —{' '}
                {s.totalHours ?? s.TotalHours}h — <span className="uppercase font-bold">{s.status ?? s.Status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminTimesheetPayrollTab;
