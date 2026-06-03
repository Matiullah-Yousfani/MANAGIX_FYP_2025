import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiVideo, FiX } from 'react-icons/fi';
import { meetingService } from '../api/meetingService';
import type { Meeting } from '../types';

/** Sticky all-day banner when user has a meeting scheduled today. */
const TodayMeetingBanner: React.FC = () => {
  const navigate = useNavigate();
  const userId = localStorage.getItem('userId');
  const [todayMeeting, setTodayMeeting] = useState<Meeting | null>(null);
  const [joinState, setJoinState] = useState<string>('BeforeStart');
  const [canJoin, setCanJoin] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      try {
        const list = await meetingService.upcomingForUser(userId);
        const today = new Date();
        const match = list.find((m) => {
          const d = new Date(m.scheduledAt);
          return d.getFullYear() === today.getFullYear()
            && d.getMonth() === today.getMonth()
            && d.getDate() === today.getDate();
        });
        if (!match) {
          setTodayMeeting(null);
          return;
        }
        setTodayMeeting(match);
        const status = await meetingService.joinStatus(match.meetingId, userId);
        setJoinState(status.joinState);
        setCanJoin(status.canJoin);
      } catch {
        setTodayMeeting(null);
      }
    };
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [userId]);

  if (!todayMeeting || dismissed || joinState === 'Expired') return null;

  const timeLabel = new Date(todayMeeting.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="mb-6 flex items-center justify-between gap-4 bg-indigo-600 text-white px-6 py-4 rounded-2xl shadow-lg">
      <div className="flex items-center gap-3">
        <FiVideo size={22} />
        <div>
          <p className="font-black text-sm uppercase tracking-wider">Meeting today</p>
          <p className="text-indigo-100 text-sm">
            {todayMeeting.title} at {timeLabel}
            {joinState === 'BeforeStart' ? ' — join opens at start time' : ' — you can join now'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!canJoin}
          onClick={() => navigate(`/meeting?meetingId=${todayMeeting.meetingId}`)}
          className={`px-4 py-2 rounded-xl font-black text-xs uppercase ${
            canJoin ? 'bg-white text-indigo-700 hover:bg-indigo-50' : 'bg-indigo-400 text-indigo-100 cursor-not-allowed'
          }`}
        >
          Join
        </button>
        <button type="button" onClick={() => setDismissed(true)} className="p-2 hover:bg-indigo-500 rounded-lg" aria-label="Dismiss">
          <FiX />
        </button>
      </div>
    </div>
  );
};

export default TodayMeetingBanner;
