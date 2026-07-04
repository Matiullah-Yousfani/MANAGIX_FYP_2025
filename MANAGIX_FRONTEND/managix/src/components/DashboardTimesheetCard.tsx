import React, { useEffect, useState } from 'react';
import { timesheetService } from '../api/timesheetService';
import { formatHoursHms, formatSecondsHms } from '../utils/timeFormat';
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
  const [showSubmitReminder, setShowSubmitReminder] = useState(false);
  const [liveTick, setLiveTick] = useState(0);
  const [fetchedAt, setFetchedAt] = useState(Date.now());

  const refresh = async () => {
    if (!userId) return;
    setLoadError(null);
    try {
      const t = await timesheetService.today(userId);
      setToday(t);
      setFetchedAt(Date.now());
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

  useEffect(() => {
    const id = setInterval(() => setLiveTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!userId || role === 'admin' || role === 'qa' || !today) return;
    const check = () => {
      const h = new Date().getHours();
      const clocked = Boolean(today?.isClockedIn ?? today?.IsClockedIn);
      const hrs = Number(today?.todayHours ?? today?.TodayHours ?? 0);
      const st = today?.dailyTimesheetStatus ?? today?.DailyTimesheetStatus ?? 'Draft';
      const min = Number(today?.minimumSubmitHours ?? today?.MinimumSubmitHours ?? 0);
      const can =
        today?.canSubmitToday ??
        today?.CanSubmitToday ??
        (st !== 'Submitted' && st !== 'Approved' && hrs > 0 && !clocked && (min <= 0 || hrs >= min));
      const must = hrs > 0 && st !== 'Submitted' && st !== 'Approved';
      if (h >= 17 && must && can) setShowSubmitReminder(true);
    };
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, [userId, role, today]);

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

  const openStart = today?.openSessionStartedAt ?? today?.OpenSessionStartedAt;
  const displaySeconds = (() => {
    void liveTick;
    if (isClockedIn && openStart) {
      const openMs = new Date(openStart).getTime();
      const elapsedAtFetch = Math.max(0, (fetchedAt - openMs) / 1000);
      const closedSec = Math.max(0, Math.round(hours * 3600) - elapsedAtFetch);
      return closedSec + (Date.now() - openMs) / 1000;
    }
    return hours * 3600;
  })();
  const displayTime = formatSecondsHms(displaySeconds);

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
    <div className="bg-surface rounded-xl p-8 shadow-e1 border border-line mb-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Daily timesheet</p>
          <h3 className="text-2xl font-bold text-fg">
            Today <span className="tabular-nums">{displayTime}</span>{' '}
            <span className="text-fg-subtle font-medium text-lg">/ {standard}h shift</span>
          </h3>
          <p className="text-xs text-fg-muted mt-1">
            Max {max}h per day · multiple sessions · submit required daily
            {minSubmit > 0 && (
              <>
                {' '}
                · <strong className="text-warning">submit after {minSubmit}h</strong>
              </>
            )}
          </p>
          {status !== 'Draft' && (
            <span
              className={`inline-block mt-2 text-[10px] font-bold uppercase px-2 py-1 rounded-lg ${
                status === 'Rejected' ? 'bg-danger-soft text-danger' : 'bg-primary-soft text-primary'
              }`}
            >
              {status}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || isClockedIn || hours >= max || status === 'Submitted' || status === 'Approved'}
            onClick={clockIn}
            className="flex items-center gap-2 px-5 py-3 bg-success text-white rounded-lg text-xs font-bold disabled:opacity-40"
          >
            <FiPlay size={14} /> Clock in
          </button>
          <button
            type="button"
            disabled={busy || !isClockedIn}
            onClick={clockOut}
            className="flex items-center gap-2 px-5 py-3 bg-surface-3 text-fg rounded-lg text-xs font-bold disabled:opacity-40"
          >
            <FiSquare size={14} /> Clock out
          </button>
          {mustSubmitToday && !canSubmit && !isClockedIn && minSubmit > 0 && hours < minSubmit && (
            <span className="text-[10px] font-bold uppercase text-fg-subtle px-3 py-2">
              Submit locked
            </span>
          )}
          {canSubmit && (
            <button
              type="button"
              disabled={busy}
              onClick={() => (needsOvertimeReason ? setShowOvertimeModal(true) : submit())}
              className="flex items-center gap-2 px-5 py-3 bg-primary text-primary-fg rounded-lg text-xs font-bold"
            >
              <FiSend size={14} /> Submit day
            </button>
          )}
        </div>
      </div>

      {loadError && (
        <p className="mt-4 text-sm text-danger flex items-center gap-2">
          <FiAlertCircle /> {loadError}
        </p>
      )}

      {minSubmit > 0 && hours > 0 && hours < minSubmit && !isClockedIn && (
        <p className="mt-4 text-sm text-fg-muted bg-surface-2 border border-line rounded-xl px-4 py-3">
          You can clock in/out freely. Submit unlocks at <strong>{minSubmit}h</strong> —{' '}
          <strong>{hoursLeft.toFixed(1)}h</strong> remaining ({hours.toFixed(1)}h logged).
        </p>
      )}

      {mustSubmitToday && status === 'Draft' && canSubmit && (
        <p className="mt-4 text-sm text-warning bg-warning-soft border border-warning/25 rounded-xl px-4 py-3">
          You have {hours.toFixed(1)}h logged today. Submit your timesheet before end of day.
        </p>
      )}

      {showSubmitReminder && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-surface border border-line rounded-xl shadow-e2 max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-fg mb-2">Submit your timesheet</h3>
            <p className="text-sm text-fg-muted mb-4">
              You have <strong>{formatHoursHms(hours)}</strong> logged today and have not submitted yet.
              Submit before end of day so your manager can approve it.
            </p>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowSubmitReminder(false)} className="text-xs font-bold text-fg-muted">
                Later
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setShowSubmitReminder(false);
                  if (needsOvertimeReason) setShowOvertimeModal(true);
                  else submit();
                }}
                className="px-4 py-2 bg-primary text-primary-fg rounded-lg text-xs font-bold"
              >
                Submit now
              </button>
            </div>
          </div>
        </div>
      )}

      {showOvertimeModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-surface border border-line rounded-xl shadow-e2 max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-fg mb-2">Overtime / extended hours</h3>
            <p className="text-sm text-fg-muted mb-4">
              You logged <strong>{hours.toFixed(1)}h</strong>. At or above {max}h (or over {threshold}h), explain why
              work ran long. This is required to submit your daily timesheet.
            </p>
            <textarea
              className="w-full bg-surface-2 text-fg border border-line rounded-lg px-3 py-2 text-sm min-h-[80px]"
              placeholder="Reason for overtime / delayed work"
              value={overtimeReason}
              onChange={(e) => setOvertimeReason(e.target.value)}
            />
            <input
              type="text"
              placeholder="Note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-surface-2 text-fg border border-line rounded-lg px-3 py-2 text-sm mt-2"
            />
            <div className="flex gap-2 mt-4 justify-end">
              <button type="button" onClick={() => setShowOvertimeModal(false)} className="text-xs font-bold text-fg-muted">
                Cancel
              </button>
              <button
                type="button"
                disabled={busy || !overtimeReason.trim()}
                onClick={submit}
                className="px-4 py-2 bg-primary text-primary-fg rounded-lg text-xs font-bold disabled:opacity-40"
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
