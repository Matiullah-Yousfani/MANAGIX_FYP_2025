import React, { useEffect, useState } from 'react';
import { FiVideo, FiClock, FiAlertCircle } from 'react-icons/fi';
import { meetingService } from '../api/meetingService';
import type { MeetingJoinStatus } from '../types';

interface Props {
  meetingId: string;
  onCanJoin: (status: MeetingJoinStatus) => void;
}

/** Loads join eligibility and shows before/during/after meeting UI. */
const MeetingJoinGate: React.FC<Props> = ({ meetingId, onCanJoin }) => {
  const userId = localStorage.getItem('userId') || '';
  const [status, setStatus] = useState<MeetingJoinStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!userId || !meetingId) return;
    setLoading(true);
    try {
      const s = await meetingService.joinStatus(meetingId, userId);
      setStatus(s);
      if (s.canJoin) onCanJoin(s);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, [meetingId, userId]);

  if (loading) {
    return (
      <div className="mb-6 p-4 bg-white rounded-2xl border border-gray-100 text-gray-500 italic">
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

  if (status.joinState === 'Expired' || status.status === 'Expired') {
    return (
      <div className="mb-6 p-6 bg-gray-100 rounded-2xl border border-gray-200">
        <h2 className="font-black text-gray-800">{status.title}</h2>
        <p className="text-sm text-gray-600 mt-2">This meeting has ended. The join link is no longer available.</p>
        <p className="text-xs text-gray-400 mt-2">Was scheduled: {fmt(status.scheduledAt)} – {fmt(status.endsAt)}</p>
      </div>
    );
  }

  if (status.joinState === 'BeforeStart') {
    return (
      <div className="mb-6 p-6 bg-indigo-50 rounded-2xl border border-indigo-100">
        <h2 className="font-black text-indigo-900">{status.title}</h2>
        <p className="text-sm text-indigo-700 mt-2 flex items-center gap-2">
          <FiClock /> Starts {fmt(status.scheduledAt)} — join enabled during the meeting window.
        </p>
        <button
          type="button"
          disabled
          className="mt-4 px-6 py-3 bg-gray-300 text-gray-600 font-black rounded-xl cursor-not-allowed flex items-center gap-2"
        >
          <FiVideo /> Join (not yet active)
        </button>
      </div>
    );
  }

  if (status.canJoin) {
    return (
      <div className="mb-6 p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
        <h2 className="font-black text-emerald-900">{status.title}</h2>
        <p className="text-sm text-emerald-700 mt-1">Meeting is live — you can join now.</p>
        <p className="text-xs text-emerald-600 mt-1">Until {fmt(status.endsAt)}</p>
      </div>
    );
  }

  return null;
};

export default MeetingJoinGate;
