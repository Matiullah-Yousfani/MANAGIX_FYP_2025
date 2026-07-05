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
      <div className="mb-6 p-4 bg-white rounded-2xl border border-gray-200/70 text-gray-500 italic">
        Checking meeting status…
      </div>
    );
  }

  if (!status) {
    return (
      <div className="mb-6 p-4 bg-red-50 rounded-2xl border border-red-100 text-red-700 font-bold flex gap-2">
        <FiAlertCircle /> Meeting not found or you are not invited.
      </div>
    );
  }

  if (!status.isParticipant) {
    return (
      <div className="mb-6 p-4 bg-amber-50 rounded-2xl border border-amber-100 text-amber-800 font-bold">
        You are not a participant on this meeting.
      </div>
    );
  }

  const fmt = (iso: string) => new Date(iso).toLocaleString();
  const link = status.meetingLink ?? `/meeting?meetingId=${meetingId}`;

  if (status.joinState === 'Expired' || status.status === 'Expired') {
    return (
      <div className="mb-6 p-6 bg-gray-100 rounded-2xl border border-gray-200">
        <h2 className="font-extrabold text-gray-800">{status.title}</h2>
        <p className="text-sm text-gray-600 mt-2">This meeting link has expired (past end time).</p>
        <p className="text-xs text-gray-400 mt-2">Was scheduled: {fmt(status.scheduledAt)}</p>
      </div>
    );
  }

  if (status.joinState === 'BeforeStart') {
    return (
      <div className="mb-6 p-6 bg-indigo-50 rounded-2xl border border-indigo-100">
        <h2 className="font-extrabold text-indigo-900">{status.title}</h2>
        {status.sprintNumber != null && (
          <p className="text-xs font-extrabold text-indigo-500 uppercase mt-1">Sprint {status.sprintNumber}</p>
        )}
        <p className="text-sm text-indigo-700 mt-2 flex items-center gap-2">
          <FiClock /> Starts {fmt(status.scheduledAt)} — ends {fmt(status.endsAt)}
        </p>
        <p className="text-xs text-indigo-500 mt-2 flex items-center gap-1">
          <FiLink /> {link}
        </p>
        <p className="text-xs text-indigo-600 mt-3 flex items-center gap-1">
          <FiKey /> You will need the join code from your notification when the meeting starts.
        </p>
        <button
          type="button"
          disabled
          className="mt-4 px-6 py-3 bg-gray-300 text-gray-600 font-extrabold rounded-xl cursor-not-allowed flex items-center gap-2"
        >
          <FiVideo /> Join (not yet active)
        </button>
      </div>
    );
  }

  if (status.joinState === 'LinkDisabled' || (status.joinState === 'Expired' && status.isParticipant)) {
    return (
      <div className="mb-6 p-6 bg-amber-50 rounded-2xl border border-amber-100">
        <h2 className="font-extrabold text-amber-900">{status.title}</h2>
        <p className="text-sm text-amber-800 mt-2">
          This meeting has ended. The join link is no longer active.
        </p>
        <p className="text-xs text-amber-600 mt-2">Was scheduled until {fmt(status.endsAt)}</p>
        <button
          type="button"
          disabled
          className="mt-4 px-6 py-3 bg-gray-300 text-gray-600 font-extrabold rounded-xl cursor-not-allowed flex items-center gap-2"
        >
          <FiVideo /> Meeting ended
        </button>
      </div>
    );
  }

  if (status.canJoin) {
    return (
      <div className="mb-6 p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
        <h2 className="font-extrabold text-emerald-900">{status.title}</h2>
        <p className="text-sm text-emerald-700 mt-1">
          Meeting is live — enter your join code to enter the room (active until {fmt(status.endsAt)}).
        </p>
        <label className="block mt-4">
          <span className="text-xs font-extrabold uppercase text-emerald-600 tracking-widest flex items-center gap-1">
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
            className="mt-2 w-full border border-emerald-200 rounded-xl px-4 py-3 text-lg font-mono tracking-widest uppercase bg-white focus:ring-2 focus:ring-emerald-400 outline-none"
          />
        </label>
        {codeError && (
          <p className="text-sm text-red-600 font-semibold mt-2 flex items-center gap-1">
            <FiAlertCircle size={14} /> {codeError}
          </p>
        )}
        <button
          type="button"
          onClick={handleVerifyAndJoin}
          disabled={verifying}
          className="mt-4 px-6 py-3 bg-emerald-600 text-white font-extrabold rounded-xl hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-60"
        >
          <FiVideo /> {verifying ? 'Verifying…' : 'Join video meeting'}
        </button>
      </div>
    );
  }

  return null;
};

export default MeetingJoinGate;
