import React, { useEffect, useMemo, useState } from 'react';
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
      alert('Policy saved.');
      await load();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Save policy failed');
    }
  };

  if (loading) {
    return <div className="p-20 text-center text-fg-subtle font-bold text-[10px] uppercase">Loading…</div>;
  }

  if (loadError) {
    return (
      <div className="bg-surface rounded-xl border border-danger/25 p-10">
        <h2 className="text-lg font-bold text-danger mb-2">Could not load</h2>
        <p className="text-sm mb-4 text-fg-muted">{loadError}</p>
        <button type="button" onClick={load} className="px-6 py-3 bg-primary text-primary-fg rounded-lg text-[10px] font-bold uppercase">
          Retry
        </button>
      </div>
    );
  }

  const threshold = policy.standardHoursPerDay + policy.overtimeGraceHours;

  return (
    <div className="space-y-8">
      <div className="bg-surface rounded-xl border border-line p-8 shadow-e1">
        <h2 className="text-xl font-bold uppercase mb-2 text-fg">Org timesheet rules</h2>
        <p className="text-sm text-fg-muted mb-4">
          {policy.standardHoursPerDay}h shift + {policy.overtimeGraceHours}h grace (reason after {threshold}h), max{' '}
          {policy.dailyMaxHours}h/day. Submit enabled after{' '}
          <strong>{policy.minimumSubmitHours}h</strong> clocked (0 = no minimum).
        </p>
        <div className="flex flex-wrap gap-4 items-end">
          <label className="text-xs font-bold">
            Shift (h)
            <input
              type="number"
              className="block bg-surface-2 text-fg border border-line rounded-lg px-3 py-2 mt-1 w-20 focus:ring-2 focus:ring-primary/25 focus:border-primary outline-none"
              value={policy.standardHoursPerDay}
              onChange={(e) => setPolicy((p) => ({ ...p, standardHoursPerDay: Number(e.target.value) }))}
            />
          </label>
          <label className="text-xs font-bold">
            Grace (h)
            <input
              type="number"
              className="block bg-surface-2 text-fg border border-line rounded-lg px-3 py-2 mt-1 w-20 focus:ring-2 focus:ring-primary/25 focus:border-primary outline-none"
              value={policy.overtimeGraceHours}
              onChange={(e) => setPolicy((p) => ({ ...p, overtimeGraceHours: Number(e.target.value) }))}
            />
          </label>
          <label className="text-xs font-bold">
            Max (h)
            <input
              type="number"
              className="block bg-surface-2 text-fg border border-line rounded-lg px-3 py-2 mt-1 w-20 focus:ring-2 focus:ring-primary/25 focus:border-primary outline-none"
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
              className="block bg-surface-2 text-fg border border-line rounded-lg px-3 py-2 mt-1 w-20 focus:ring-2 focus:ring-primary/25 focus:border-primary outline-none"
              value={policy.minimumSubmitHours}
              onChange={(e) => setPolicy((p) => ({ ...p, minimumSubmitHours: Number(e.target.value) }))}
            />
          </label>
          <button type="button" onClick={savePolicy} className="px-6 py-3 bg-primary text-primary-fg rounded-lg text-[10px] font-bold uppercase">
            Save policy
          </button>
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-line p-8 shadow-e1">
        <h2 className="text-xl font-bold uppercase mb-4 text-fg">All users — daily timesheets</h2>
        <div className="flex flex-wrap gap-3 mb-4">
          <input
            type="search"
            placeholder="Search name or date…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-surface-2 text-fg border border-line rounded-lg px-3 py-2 text-sm flex-1 min-w-[160px] focus:ring-2 focus:ring-primary/25 focus:border-primary outline-none"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-surface-2 text-fg border border-line rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-primary/25 focus:border-primary outline-none"
          >
            <option value="all">All</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        {filteredSheets.length === 0 ? (
          <p className="text-fg-subtle text-sm">No submissions match your filters.</p>
        ) : (
          <div className="space-y-3 max-h-[32rem] overflow-y-auto">
            {filteredSheets.map((s) => (
              <div key={s.dailyTimesheetId ?? s.DailyTimesheetId} className="border border-line rounded-lg p-4 text-sm text-fg">
                <strong>{s.fullName ?? s.FullName}</strong>
                {(s.submitterRole ?? s.SubmitterRole) && (
                  <span className="text-primary text-xs ml-2">({s.submitterRole ?? s.SubmitterRole})</span>
                )}
                {' '}— {String(s.workDate ?? s.WorkDate).slice(0, 10)} —{' '}
                {s.totalHours ?? s.TotalHours}h — <span className="uppercase font-bold">{s.status ?? s.Status}</span>
                {s.overtimeReason && (
                  <p className="text-warning mt-1 text-xs">Overtime: {s.overtimeReason}</p>
                )}
                {s.employeeNote && <p className="text-fg-muted mt-1 text-xs">{s.employeeNote}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAllTimesheetsTab;
