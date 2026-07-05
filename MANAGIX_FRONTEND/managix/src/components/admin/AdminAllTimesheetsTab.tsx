import React, { useEffect, useMemo, useState } from 'react';
import { toast } from '../ui';
import { timesheetService } from '../../api/timesheetService';

const AdminAllTimesheetsTab: React.FC = () => {
  const [sheets, setSheets] = useState<any[]>([]);
  const [policy, setPolicy] = useState({
    standardHoursPerDay: 8,
    overtimeGraceHours: 2,
    dailyMaxHours: 12,
    minimumSubmitHours: 0,
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [pol, allSheets] = await Promise.all([
        timesheetService.getPolicy(),
        timesheetService.listAdmin(),
      ]);
      setPolicy({
        standardHoursPerDay: Number(pol?.standardHoursPerDay ?? pol?.StandardHoursPerDay ?? 8),
        overtimeGraceHours: Number(pol?.overtimeGraceHours ?? pol?.OvertimeGraceHours ?? 2),
        dailyMaxHours: Number(pol?.dailyMaxHours ?? pol?.DailyMaxHours ?? 12),
        minimumSubmitHours: Number(pol?.minimumSubmitHours ?? pol?.MinimumSubmitHours ?? 0),
      });
      setSheets(Array.isArray(allSheets) ? allSheets : []);
    } catch (e: any) {
      setSheets([]);
      const status = e?.response?.status;
      if (status === 503 || status === 500) {
        setLoadError(
          e?.response?.data?.message ||
            'Timesheet schema out of date. Run Documentation/FIX_TIMESHEET_SCHEMA_COMPLETE.sql then restart backend.'
        );
      } else {
        setLoadError(e?.response?.data?.message || 'Could not load timesheets.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filteredSheets = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sheets.filter((s) => {
      const st = String(s.status ?? s.Status ?? '').toLowerCase();
      if (statusFilter !== 'all' && st !== statusFilter) return false;
      if (!q) return true;
      const name = String(s.fullName ?? s.FullName ?? '').toLowerCase();
      const date = String(s.workDate ?? s.WorkDate ?? '').slice(0, 10);
      return name.includes(q) || date.includes(q);
    });
  }, [sheets, search, statusFilter]);

  const savePolicy = async () => {
    try {
      await timesheetService.updatePolicy(policy);
      toast('Policy saved.');
      await load();
    } catch (e: any) {
      toast(e?.response?.data?.message || 'Save policy failed');
    }
  };

  if (loading) {
    return <div className="p-20 text-center text-gray-400 font-extrabold text-[10px] uppercase">Loading…</div>;
  }

  if (loadError) {
    return (
      <div className="bg-white rounded-2xl border border-red-200 p-10">
        <h2 className="text-lg font-extrabold text-red-700 mb-2">Could not load</h2>
        <p className="text-sm mb-4">{loadError}</p>
        <button type="button" onClick={load} className="px-6 py-3 bg-black text-white rounded-xl text-[10px] font-extrabold uppercase">
          Retry
        </button>
      </div>
    );
  }

  const threshold = policy.standardHoursPerDay + policy.overtimeGraceHours;

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-8 shadow-sm">
        <h2 className="text-xl font-extrabold uppercase mb-2">Org timesheet rules</h2>
        <p className="text-sm text-gray-500 mb-4">
          {policy.standardHoursPerDay}h shift + {policy.overtimeGraceHours}h grace (reason after {threshold}h), max{' '}
          {policy.dailyMaxHours}h/day. Submit enabled after{' '}
          <strong>{policy.minimumSubmitHours}h</strong> clocked (0 = no minimum).
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
            Grace (h)
            <input
              type="number"
              className="block border rounded-lg px-3 py-2 mt-1 w-20"
              value={policy.overtimeGraceHours}
              onChange={(e) => setPolicy((p) => ({ ...p, overtimeGraceHours: Number(e.target.value) }))}
            />
          </label>
          <label className="text-xs font-bold">
            Max (h)
            <input
              type="number"
              className="block border rounded-lg px-3 py-2 mt-1 w-20"
              value={policy.dailyMaxHours}
              onChange={(e) => setPolicy((p) => ({ ...p, dailyMaxHours: Number(e.target.value) }))}
            />
          </label>
          <label className="text-xs font-bold">
            Min to submit (h)
            <input
              type="number"
              min={0}
              step={0.5}
              className="block border rounded-lg px-3 py-2 mt-1 w-20"
              value={policy.minimumSubmitHours}
              onChange={(e) => setPolicy((p) => ({ ...p, minimumSubmitHours: Number(e.target.value) }))}
            />
          </label>
          <button type="button" onClick={savePolicy} className="px-6 py-3 bg-black text-white rounded-xl text-[10px] font-extrabold uppercase">
            Save policy
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-8 shadow-sm">
        <h2 className="text-xl font-extrabold uppercase mb-4">All users — daily timesheets</h2>
        <div className="flex flex-wrap gap-3 mb-4">
          <input
            type="search"
            placeholder="Search name or date…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-[160px]"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm font-bold"
          >
            <option value="all">All</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        {filteredSheets.length === 0 ? (
          <p className="text-gray-400 italic text-sm">No submissions match your filters.</p>
        ) : (
          <div className="space-y-3 max-h-[32rem] overflow-y-auto">
            {filteredSheets.map((s) => (
              <div key={s.dailyTimesheetId ?? s.DailyTimesheetId} className="border rounded-xl p-4 text-sm">
                <strong>{s.fullName ?? s.FullName}</strong>
                {(s.submitterRole ?? s.SubmitterRole) && (
                  <span className="text-indigo-600 text-xs ml-2">({s.submitterRole ?? s.SubmitterRole})</span>
                )}
                {' '}— {String(s.workDate ?? s.WorkDate).slice(0, 10)} —{' '}
                {s.totalHours ?? s.TotalHours}h — <span className="uppercase font-bold">{s.status ?? s.Status}</span>
                {s.overtimeReason && (
                  <p className="text-amber-700 mt-1 text-xs">Overtime: {s.overtimeReason}</p>
                )}
                {s.employeeNote && <p className="text-gray-600 mt-1 text-xs">{s.employeeNote}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAllTimesheetsTab;
