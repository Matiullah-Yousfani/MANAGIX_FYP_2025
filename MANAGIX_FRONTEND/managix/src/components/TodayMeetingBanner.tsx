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
    const id = setInterval(load, joinState === 'BeforeStart' || joinState === 'Active' ? 10_000 : 60_000);
    return () => clearInterval(id);
  }, [userId, joinState]);

  if (!todayMeeting || dismissed || joinState === 'Expired' || joinState === 'LinkDisabled') return null;

  const timeLabel = new Date(todayMeeting.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="mb-6 flex items-center justify-between gap-4 bg-primary text-primary-fg px-6 py-4 rounded-xl shadow-e2">
      <div className="flex items-center gap-3">
        <FiVideo size={22} />
        <div>
          <p className="font-bold text-sm uppercase tracking-wider">Meeting today</p>
          <p className="text-primary-fg/80 text-sm">
            {todayMeeting.title} at {timeLabel}
            {joinState === 'BeforeStart'
              ? ' — join opens exactly at start time (10 min window)'
              : ' — you can join now'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!canJoin}
          onClick={() => navigate(`/meeting?meetingId=${todayMeeting.meetingId}`)}
          className={`px-4 py-2 rounded-lg font-bold text-xs uppercase ${
            canJoin ? 'bg-surface text-primary hover:bg-surface-2' : 'bg-primary-hover text-primary-fg/60 cursor-not-allowed'
          }`}
        >
          Join
        </button>
        <button type="button" onClick={() => setDismissed(true)} className="p-2 hover:bg-primary-hover rounded-lg" aria-label="Dismiss">
          <FiX />
        </button>
      </div>
    </div>
  );
};

export default TodayMeetingBanner;
