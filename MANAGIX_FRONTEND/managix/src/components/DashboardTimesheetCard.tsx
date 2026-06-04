import React, { useEffect, useState } from 'react';
import { timesheetService } from '../api/timesheetService';
import { FiPlay, FiSquare, FiSend, FiAlertCircle } from 'react-icons/fi';

/** Clock in/out + daily submit — shown on Dashboard for Employee & Manager only. */
const DashboardTimesheetCard: React.FC = () => {
  const userId = localStorage.getItem('userId') || '';
  const role = (localStorage.getItem('roleName') || localStorage.getItem('userRole') || '').toLowerCase();
  const [today, setToday] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showOvertimeModal, setShowOvertimeModal] = useState(false);
  const [overtimeReason, setOvertimeReason] = useState('');
  const [note, setNote] = useState('');

  const refresh = async () => {
    if (!userId) return;
    setLoadError(null);
    try {
      const t = await timesheetService.today(userId);
      setToday(t);
    } catch (e: any) {
      setToday(null);
      const msg = e?.response?.data?.message || e?.response?.data?.detail;
      if (e?.response?.status === 503 || e?.response?.status === 500) {
        setLoadError(msg || 'Timesheet schema out of date. Run Documentation/FIX_TIMESHEET_SCHEMA_COMPLETE.sql.');
      }
    }
  };

  useEffect(() => {
    if (!userId || role === 'admin' || role === 'qa') return;
    refresh();
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, [userId, role]);

  if (!userId || role === 'admin' || role === 'qa') return null;

  const isClockedIn = Boolean(today?.isClockedIn ?? today?.IsClockedIn);
  const hours = Number(today?.todayHours ?? today?.TodayHours ?? 0);
  const standard = Number(today?.standardHoursPerDay ?? today?.StandardHoursPerDay ?? 8);
  const max = Number(today?.dailyMaxHours ?? today?.DailyMaxHours ?? 12);
  const threshold = Number(today?.overtimeThresholdHours ?? today?.OvertimeThresholdHours ?? 10);
  const status = today?.dailyTimesheetStatus ?? today?.DailyTimesheetStatus ?? 'Draft';
  const minSubmit = Number(today?.minimumSubmitHours ?? today?.MinimumSubmitHours ?? 0);
  const hoursLeft = Number(today?.hoursRemainingToSubmit ?? today?.HoursRemainingToSubmit ?? 0);
  const needsOvertimeReason =
    hours > threshold || hours >= max || Boolean(today?.requiresOvertimeReasonOnSubmit);
  const canSubmit = Boolean(
    today?.canSubmitToday ??
      today?.CanSubmitToday ??
      (status !== 'Submitted' && status !== 'Approved' && hours > 0 && !isClockedIn && (minSubmit <= 0 || hours >= minSubmit))
  );
  const mustSubmitToday = hours > 0 && status !== 'Submitted' && status !== 'Approved';

  const clockIn = async () => {
    setBusy(true);
    try {
      await timesheetService.clockIn({ userId });
      await refresh();
    } catch (e: any) {
      if (e?.response?.status === 409) {
        await refresh();
        alert('You were already clocked in. Use Clock out, or we closed an old session — try Clock in again.');
      } else {
        alert(e?.response?.data?.message || 'Clock in failed');
      }
    } finally {
      setBusy(false);
    }
  };

  const clockOut = async () => {
    setBusy(true);
    try {
      const res = await timesheetService.clockOut(userId);
      await refresh();
      const msg = res?.message ?? res?.Message;
      if (msg) alert(msg);
      if (hours >= max - 0.01) setShowOvertimeModal(true);
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Clock out failed');
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (needsOvertimeReason && !overtimeReason.trim()) {
      setShowOvertimeModal(true);
      return;
    }
    setBusy(true);
    try {
      await timesheetService.submitDaily({
        userId,
        employeeNote: note || undefined,
        overtimeReason: overtimeReason.trim() || undefined,
      });
      setShowOvertimeModal(false);
      setOvertimeReason('');
      setNote('');
      await refresh();
      alert('Daily timesheet submitted for manager approval.');
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Submit failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 mb-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Daily timesheet</p>
          <h3 className="text-2xl font-black text-gray-900">
            Today {hours.toFixed(1)}h <span className="text-gray-400 font-medium text-lg">/ {standard}h shift</span>
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Max {max}h per day · multiple sessions · submit required daily
            {minSubmit > 0 && (
              <>
                {' '}
                · <strong className="text-amber-700">submit after {minSubmit}h</strong>
              </>
            )}
          </p>
          {status !== 'Draft' && (
            <span
              className={`inline-block mt-2 text-[10px] font-black uppercase px-2 py-1 rounded-lg ${
                status === 'Rejected' ? 'bg-red-50 text-red-700' : 'bg-indigo-50 text-indigo-700'
              }`}
            >
              {status}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || isClockedIn || hours >= max}
            onClick={clockIn}
            className="flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white rounded-xl text-xs font-black disabled:opacity-40"
          >
            <FiPlay size={14} /> Clock in
          </button>
          <button
            type="button"
            disabled={busy || !isClockedIn}
            onClick={clockOut}
            className="flex items-center gap-2 px-5 py-3 bg-gray-900 text-white rounded-xl text-xs font-black disabled:opacity-40"
          >
            <FiSquare size={14} /> Clock out
          </button>
          {mustSubmitToday && !canSubmit && !isClockedIn && minSubmit > 0 && hours < minSubmit && (
            <span className="text-[10px] font-black uppercase text-gray-400 px-3 py-2">
              Submit locked
            </span>
          )}
          {canSubmit && (
            <button
              type="button"
              disabled={busy}
              onClick={() => (needsOvertimeReason ? setShowOvertimeModal(true) : submit())}
              className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black"
            >
              <FiSend size={14} /> Submit day
            </button>
          )}
        </div>
      </div>

      {loadError && (
        <p className="mt-4 text-sm text-red-600 flex items-center gap-2">
          <FiAlertCircle /> {loadError}
        </p>
      )}

      {minSubmit > 0 && hours > 0 && hours < minSubmit && !isClockedIn && (
        <p className="mt-4 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
          You can clock in/out freely. Submit unlocks at <strong>{minSubmit}h</strong> —{' '}
          <strong>{hoursLeft.toFixed(1)}h</strong> remaining ({hours.toFixed(1)}h logged).
        </p>
      )}

      {mustSubmitToday && status === 'Draft' && canSubmit && (
        <p className="mt-4 text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
          You have {hours.toFixed(1)}h logged today. Submit your timesheet before end of day.
        </p>
      )}

      {showOvertimeModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-black text-gray-900 mb-2">Overtime / extended hours</h3>
            <p className="text-sm text-gray-600 mb-4">
              You logged <strong>{hours.toFixed(1)}h</strong>. At or above {max}h (or over {threshold}h), explain why
              work ran long. This is required to submit your daily timesheet.
            </p>
            <textarea
              className="w-full border rounded-xl px-3 py-2 text-sm min-h-[80px]"
              placeholder="Reason for overtime / delayed work"
              value={overtimeReason}
              onChange={(e) => setOvertimeReason(e.target.value)}
            />
            <input
              type="text"
              placeholder="Note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full border rounded-xl px-3 py-2 text-sm mt-2"
            />
            <div className="flex gap-2 mt-4 justify-end">
              <button type="button" onClick={() => setShowOvertimeModal(false)} className="text-xs font-bold text-gray-500">
                Cancel
              </button>
              <button
                type="button"
                disabled={busy || !overtimeReason.trim()}
                onClick={submit}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black disabled:opacity-40"
              >
                Submit with reason
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardTimesheetCard;
