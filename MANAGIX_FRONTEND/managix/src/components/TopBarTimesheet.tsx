import React, { useEffect, useState } from 'react';
import { toast } from './ui';
import { timesheetService } from '../api/timesheetService';
import { FiPlay, FiSquare, FiSend } from 'react-icons/fi';

const TopBarTimesheet: React.FC = () => {
  const userId = localStorage.getItem('userId') || '';
  const role = (localStorage.getItem('roleName') || localStorage.getItem('userRole') || '').toLowerCase();
  const [today, setToday] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);
  const [showOvertimeModal, setShowOvertimeModal] = useState(false);
  const [overtimeReason, setOvertimeReason] = useState('');
  const [note, setNote] = useState('');

  const refresh = async () => {
    if (!userId) return;
    try {
      const t = await timesheetService.today(userId);
      setToday(t);
    } catch {
      setToday(null);
    }
  };

  useEffect(() => {
    if (role === 'admin' || role === 'qa') return;
    refresh();
    const id = setInterval(refresh, 45_000);
    return () => clearInterval(id);
  }, [userId, role]);

  if (!userId || role === 'admin' || role === 'qa') return null;

  const isClockedIn = Boolean(today?.isClockedIn ?? today?.IsClockedIn);
  const hours = Number(today?.todayHours ?? today?.TodayHours ?? 0);
  const standard = Number(today?.standardHoursPerDay ?? today?.StandardHoursPerDay ?? 8);
  const max = Number(today?.dailyMaxHours ?? today?.DailyMaxHours ?? 12);
  const threshold = Number(today?.overtimeThresholdHours ?? today?.OvertimeThresholdHours ?? 10);
  const status = today?.dailyTimesheetStatus ?? today?.DailyTimesheetStatus ?? 'Draft';
  const needsOvertimeReason = hours > threshold;
  const canSubmit =
    status !== 'Submitted' && status !== 'Approved' && hours > 0 && !isClockedIn;

  const clockIn = async () => {
    setBusy(true);
    try {
      await timesheetService.clockIn({ userId });
      await refresh();
    } catch (e: any) {
      toast(e?.response?.data?.message || 'Clock in failed');
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
      if (msg) toast(msg);
    } catch (e: any) {
      toast(e?.response?.data?.message || 'Clock out failed');
    } finally {
      setBusy(false);
    }
  };

  const openSubmit = () => {
    if (needsOvertimeReason) {
      setShowOvertimeModal(true);
      return;
    }
    setShowSubmit(true);
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
      setShowSubmit(false);
      setShowOvertimeModal(false);
      setOvertimeReason('');
      setNote('');
      await refresh();
      toast('Timesheet submitted for manager approval.');
    } catch (e: any) {
      toast(e?.response?.data?.message || 'Submit failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 bg-white border border-gray-200 rounded-2xl px-4 py-2 shadow-sm mb-4">
        <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mr-1">Timesheet</span>
        <span className="text-xs font-bold text-gray-700">
          Today {hours.toFixed(1)}h / {standard}h
          <span className="text-gray-400 font-normal"> (max {max}h)</span>
        </span>
        {status !== 'Draft' && (
          <span
            className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-lg ${
              status === 'Rejected' ? 'bg-red-50 text-red-700' : 'bg-indigo-50 text-indigo-700'
            }`}
          >
            {status}
          </span>
        )}
        <button
          type="button"
          disabled={busy || isClockedIn}
          onClick={clockIn}
          className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[10px] font-extrabold disabled:opacity-40"
        >
          <FiPlay size={12} /> Clock in
        </button>
        <button
          type="button"
          disabled={busy || !isClockedIn}
          onClick={clockOut}
          className="flex items-center gap-1 px-3 py-1.5 bg-gray-800 text-white rounded-lg text-[10px] font-extrabold disabled:opacity-40"
        >
          <FiSquare size={12} /> Clock out
        </button>
        {canSubmit && !showSubmit && (
          <button
            type="button"
            disabled={busy}
            onClick={openSubmit}
            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-extrabold"
          >
            <FiSend size={12} /> Submit day
          </button>
        )}
        {showSubmit && !showOvertimeModal && (
          <div className="flex flex-wrap items-center gap-2 w-full mt-2 pt-2 border-t border-gray-200/70">
            <input
              type="text"
              placeholder="Note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="border rounded-lg px-2 py-1 text-xs flex-1 min-w-[120px]"
            />
            <button type="button" onClick={submit} disabled={busy} className="text-[10px] font-extrabold text-indigo-600">
              Confirm submit
            </button>
            <button type="button" onClick={() => setShowSubmit(false)} className="text-[10px] font-bold text-gray-400">
              Cancel
            </button>
          </div>
        )}
      </div>

      {showOvertimeModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-extrabold text-gray-900 mb-2">Overtime threshold exceeded</h3>
            <p className="text-sm text-gray-600 mb-4">
              You logged <strong>{hours.toFixed(1)}h</strong> today. After{' '}
              <strong>{threshold}h</strong> ({standard}h shift + {threshold - standard}h grace), a reason is required
              before submitting (max {max}h/day).
            </p>
            <textarea
              className="w-full border rounded-xl px-3 py-2 text-sm min-h-[80px]"
              placeholder="Why did you work overtime?"
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
              <button
                type="button"
                onClick={() => {
                  setShowOvertimeModal(false);
                  setShowSubmit(false);
                }}
                className="px-4 py-2 text-xs font-bold text-gray-500"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy || !overtimeReason.trim()}
                onClick={submit}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-extrabold disabled:opacity-40"
              >
                Submit timesheet
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TopBarTimesheet;
