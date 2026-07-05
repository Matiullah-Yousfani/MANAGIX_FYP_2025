import React, { useEffect, useState } from 'react';
import { toast } from './ui';
import { timesheetService } from '../api/timesheetService';
import { FiPlay, FiSquare } from 'react-icons/fi';

type Props = {
  projectId?: string;
  taskId?: string;
  onOvertimeTriggered?: (requestId: string) => void;
};

const TimesheetWidget: React.FC<Props> = ({ projectId, taskId, onOvertimeTriggered }) => {
  const userId = localStorage.getItem('userId') || '';
  const [summary, setSummary] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    if (!userId) return;
    try {
      const s = await timesheetService.summary(userId);
      setSummary(s);
    } catch {
      setSummary(null);
    }
  };

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 60_000);
    return () => clearInterval(id);
  }, [userId]);

  const clockIn = async () => {
    setBusy(true);
    setError(null);
    try {
      await timesheetService.clockIn({ userId, projectId, taskId });
      await refresh();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Clock in failed');
    } finally {
      setBusy(false);
    }
  };

  const clockOut = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await timesheetService.clockOut(userId);
      const reqId = result?.overtimeRequestId ?? result?.OvertimeRequestId;
      const triggered = result?.overtimeTriggered ?? result?.OvertimeTriggered;
      if (triggered && reqId && onOvertimeTriggered) onOvertimeTriggered(String(reqId));
      await refresh();
      if (triggered && !onOvertimeTriggered) {
        toast(result?.message || 'Daily limit exceeded. Check notifications.');
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Clock out failed');
    } finally {
      setBusy(false);
    }
  };

  if (!userId) return null;
  const isClockedIn = Boolean(summary?.openEntry);
  const today = summary?.todayHours ?? 0;
  const limit = summary?.dailyLimitHours ?? 10;
  const standard = summary?.standardHoursPerDay ?? 8;

  return (
    <div className="bg-white rounded-2xl border border-gray-200/70 p-5 mb-6">
      <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-3">Timesheet</h3>
      <p className="text-sm text-gray-600 mb-1">
        Today: <strong>{today.toFixed(1)}h</strong> / {standard}h standard
        <span className="text-gray-400"> (limit {limit}h)</span>
      </p>
      <p className="text-sm text-gray-600 mb-3">
        Week: <strong>{summary?.totalHoursThisWeek ?? 0}h</strong>
        {summary?.isOnline && <span className="ml-2 text-emerald-600 font-bold">● Online</span>}
        {isClockedIn && <span className="ml-2 text-amber-600 font-bold">● Clocked in</span>}
      </p>
      {summary?.pendingOvertimeRequestId && (
        <p className="text-xs text-amber-700 font-bold mb-2">Overtime explanation required.</p>
      )}
      {error && <p className="text-xs text-red-600 mb-2 font-bold">{error}</p>}
      <div className="flex gap-2">
        <button type="button" disabled={busy || isClockedIn} onClick={clockIn}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-extrabold disabled:opacity-40">
          <FiPlay size={14} /> Clock in
        </button>
        <button type="button" disabled={busy || !isClockedIn} onClick={clockOut}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-xl text-xs font-extrabold disabled:opacity-40">
          <FiSquare size={14} /> Clock out
        </button>
      </div>
    </div>
  );
};

export default TimesheetWidget;
