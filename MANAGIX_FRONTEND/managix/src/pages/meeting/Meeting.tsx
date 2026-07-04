import React, { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import MeetingJoinGate from '../../components/MeetingJoinGate';
import WebRtcMeetingRoom from '../../components/WebRtcMeetingRoom';
import MeetingTaskExtractor from '../../components/MeetingTaskExtractor';
import { meetingService } from '../../api/meetingService';
import { useActiveMeetings } from '../../hooks/useActiveMeetings';
import type { MeetingJoinStatus } from '../../types';

const Meeting = () => {
  const [searchParams] = useSearchParams();
  const scheduledMeetingId = searchParams.get('meetingId');
  const linkCode = searchParams.get('code');
  const userId = localStorage.getItem('userId') || '';

  const { active, loading: activeLoading, hasActive } = useActiveMeetings(15_000);
  const [canJoin, setCanJoin] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState('MANAGIX Video Meeting');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [showExtractor, setShowExtractor] = useState(false);
  const [transcriptForAi, setTranscriptForAi] = useState('');
  const [gateError, setGateError] = useState<string | null>(null);

  const resolvedMeetingId =
    scheduledMeetingId ||
    (active.length === 1 ? (active[0].meetingId ?? (active[0] as any).MeetingId) : null);

  const roomId = resolvedMeetingId || '';

  const handleJoinAllowed = useCallback((s: MeetingJoinStatus) => {
    setCanJoin(true);
    if (s.title) setMeetingTitle(s.title);
    setGateError(null);
  }, []);

  useEffect(() => {
    setCanJoin(false);
    if (!resolvedMeetingId) return;
    meetingService.get(resolvedMeetingId).then((m) => {
      setMeetingTitle(m.title ?? (m as any).Title ?? 'MANAGIX Video Meeting');
      const pid = m.projectId ?? (m as any).ProjectId;
      if (pid) setProjectId(String(pid));
    }).catch(() => {});
  }, [resolvedMeetingId]);

  useEffect(() => {
    if (!resolvedMeetingId || !userId) return;
    meetingService.joinStatus(resolvedMeetingId, userId).then((s) => {
      if (!s.canJoin && s.joinState !== 'BeforeStart') {
        setGateError(
          s.joinState === 'Expired'
            ? 'This meeting has ended. The room is no longer available.'
            : 'You cannot join this meeting right now.'
        );
      }
    }).catch(() => {});
  }, [resolvedMeetingId, userId]);

  const openTaskExtractor = (text: string) => {
    setTranscriptForAi(text);
    setShowExtractor(true);
  };

  if (!activeLoading && !hasActive && !scheduledMeetingId) {
    return (
      <div className="max-w-lg mx-auto mt-16 p-10 bg-white rounded-2xl border border-gray-100 shadow-sm text-center space-y-4">
        <h1 className="text-xl font-black text-gray-900">No active meeting</h1>
        <p className="text-gray-500 text-sm">
          The meeting room is only available during a scheduled meeting window.
          Check notifications for your join link when a meeting starts.
        </p>
        <Link to="/meeting/transcripts" className="inline-block text-indigo-600 font-bold text-sm hover:underline">
          View past meeting transcripts →
        </Link>
      </div>
    );
  }

  if (active.length > 1 && !scheduledMeetingId) {
    return (
      <div className="max-w-xl mx-auto mt-12 space-y-4">
        <h1 className="text-2xl font-black text-gray-900">Choose active meeting</h1>
        <ul className="space-y-3">
          {active.map((m) => {
            const id = m.meetingId ?? (m as any).MeetingId;
            return (
              <li key={id}>
                <Link
                  to={`/meeting?meetingId=${id}`}
                  className="block bg-white rounded-xl border p-4 hover:border-indigo-300 font-bold text-gray-800"
                >
                  {m.title ?? (m as any).Title}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f4f9] p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-4 px-2">
          <h1 className="text-xl font-semibold text-gray-800">Video meeting</h1>
          <p className="text-sm text-gray-500">Active meeting window only — recording & AI transcript on leave</p>
        </div>

        {gateError && !canJoin && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-100 rounded-xl text-amber-800 font-bold text-sm">
            {gateError}
          </div>
        )}

        {resolvedMeetingId && !canJoin && (
          <MeetingJoinGate meetingId={resolvedMeetingId} initialCode={linkCode} onCanJoin={handleJoinAllowed} />
        )}

        {canJoin && resolvedMeetingId && (
          <WebRtcMeetingRoom
            roomId={roomId}
            meetingTitle={meetingTitle}
            scheduledMeetingId={resolvedMeetingId}
            projectId={projectId}
            onOpenTaskExtractor={openTaskExtractor}
          />
        )}
      </div>

      <MeetingTaskExtractor
        open={showExtractor}
        onClose={() => setShowExtractor(false)}
        transcript={transcriptForAi}
        meetingTitle={meetingTitle}
        meetingId={resolvedMeetingId}
        projectId={projectId}
      />
    </div>
  );
};

export default Meeting;
