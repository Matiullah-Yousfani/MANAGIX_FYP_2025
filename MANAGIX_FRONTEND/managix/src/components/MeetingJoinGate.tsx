import React, { useEffect, useState } from 'react';
import { FiVideo, FiClock, FiAlertCircle, FiLink, FiKey } from 'react-icons/fi';
import { meetingService } from '../api/meetingService';
import type { MeetingJoinStatus } from '../types';

interface Props {
  meetingId: string;
  initialCode?: string | null;
  onCanJoin: (status: MeetingJoinStatus) => void;
}

/** Loads join eligibility and requires the notification join code before entering the room. */
const MeetingJoinGate: React.FC<Props> = ({ meetingId, initialCode, onCanJoin }) => {
  const userId = localStorage.getItem('userId') || '';
  const [status, setStatus] = useState<MeetingJoinStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState((initialCode || '').toUpperCase());
  const [codeError, setCodeError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (initialCode) setJoinCode(initialCode.toUpperCase());
  }, [initialCode]);

  const refresh = async () => {
    if (!userId || !meetingId) return;
    try {
      const s = await meetingService.joinStatus(meetingId, userId);
      setStatus(s);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    const pollMs = status?.joinState === 'BeforeStart' ? 10_000 : 30_000;
    const id = setInterval(refresh, pollMs);
    return () => clearInterval(id);
  }, [meetingId, userId, status?.joinState]);

  const handleVerifyAndJoin = async () => {
    const code = joinCode.trim();
    if (!code) {
      setCodeError('Enter the join code from your meeting notification.');
      return;
    }
    if (!status) return;

    setVerifying(true);
    setCodeError(null);
    try {
      const ok = await meetingService.verifyJoinCode(meetingId, userId, code);
      if (!ok) {
        setCodeError('Invalid join code. Check the code in your notification and try again.');
        return;
      }
      onCanJoin(status);
    } catch {
      setCodeError('Could not verify join code. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="mb-6 p-4 bg-surface rounded-xl border border-line text-fg-muted">
        Checking meeting status…
      </div>
    );
  }

  if (!status) {
    return (
      <div className="mb-6 p-4 bg-danger-soft rounded-xl border border-danger/25 text-danger font-bold flex gap-2">
        <FiAlertCircle /> Meeting not found or you are not invited.
      </div>
    );
  }

  if (!status.isParticipant) {
    return (
      <div className="mb-6 p-4 bg-warning-soft rounded-xl border border-warning/25 text-warning font-bold">
        You are not a participant on this meeting.
      </div>
    );
  }

  const fmt = (iso: string) => new Date(iso).toLocaleString();
  const link = status.meetingLink ?? `/meeting?meetingId=${meetingId}`;

  if (status.joinState === 'Expired' || status.status === 'Expired') {
    return (
      <div className="mb-6 p-6 bg-surface-2 rounded-xl border border-line">
        <h2 className="font-bold text-fg">{status.title}</h2>
        <p className="text-sm text-fg-muted mt-2">This meeting link has expired (past end time).</p>
        <p className="text-xs text-fg-subtle mt-2">Was scheduled: {fmt(status.scheduledAt)}</p>
      </div>
    );
  }

  if (status.joinState === 'BeforeStart') {
    return (
      <div className="mb-6 p-6 bg-primary-soft rounded-xl border border-primary-border">
        <h2 className="font-bold text-fg">{status.title}</h2>
        {status.sprintNumber != null && (
          <p className="text-xs font-bold text-primary uppercase mt-1">Sprint {status.sprintNumber}</p>
        )}
        <p className="text-sm text-primary mt-2 flex items-center gap-2">
          <FiClock /> Starts {fmt(status.scheduledAt)} — ends {fmt(status.endsAt)}
        </p>
        <p className="text-xs text-primary mt-2 flex items-center gap-1">
          <FiLink /> {link}
        </p>
        <p className="text-xs text-primary mt-3 flex items-center gap-1">
          <FiKey /> You will need the join code from your notification when the meeting starts.
        </p>
        <button
          type="button"
          disabled
          className="mt-4 px-6 py-3 bg-surface-3 text-fg-subtle font-bold rounded-lg cursor-not-allowed flex items-center gap-2"
        >
          <FiVideo /> Join (not yet active)
        </button>
      </div>
    );
  }

  if (status.joinState === 'LinkDisabled' || (status.joinState === 'Expired' && status.isParticipant)) {
    return (
      <div className="mb-6 p-6 bg-warning-soft rounded-xl border border-warning/25">
        <h2 className="font-bold text-fg">{status.title}</h2>
        <p className="text-sm text-warning mt-2">
          This meeting has ended. The join link is no longer active.
        </p>
        <p className="text-xs text-warning mt-2">Was scheduled until {fmt(status.endsAt)}</p>
        <button
          type="button"
          disabled
          className="mt-4 px-6 py-3 bg-surface-3 text-fg-subtle font-bold rounded-lg cursor-not-allowed flex items-center gap-2"
        >
          <FiVideo /> Meeting ended
        </button>
      </div>
    );
  }

  if (status.canJoin) {
    return (
      <div className="mb-6 p-6 bg-success-soft rounded-xl border border-success/25">
        <h2 className="font-bold text-fg">{status.title}</h2>
        <p className="text-sm text-success mt-1">
          Meeting is live — enter your join code to enter the room (active until {fmt(status.endsAt)}).
        </p>
        <label className="block mt-4">
          <span className="text-xs font-bold uppercase text-success tracking-widest flex items-center gap-1">
            <FiKey /> Join code
          </span>
          <input
            type="text"
            value={joinCode}
            onChange={(e) => {
              setJoinCode(e.target.value.toUpperCase());
              setCodeError(null);
            }}
            placeholder="e.g. A3K9X2"
            maxLength={8}
            className="mt-2 w-full border border-line rounded-lg px-4 py-3 text-lg font-mono tracking-widest uppercase bg-surface-2 text-fg focus:ring-2 focus:ring-primary/25 focus:border-primary outline-none"
          />
        </label>
        {codeError && (
          <p className="text-sm text-danger font-semibold mt-2 flex items-center gap-1">
            <FiAlertCircle size={14} /> {codeError}
          </p>
        )}
        <button
          type="button"
          onClick={handleVerifyAndJoin}
          disabled={verifying}
          className="mt-4 px-6 py-3 bg-success text-primary-fg font-bold rounded-lg hover:opacity-90 flex items-center gap-2 disabled:opacity-60"
        >
          <FiVideo /> {verifying ? 'Verifying…' : 'Join video meeting'}
        </button>
      </div>
    );
  }

  return null;
};

export default MeetingJoinGate;
