import React, { useEffect, useState } from 'react';
import { FiFileText, FiCalendar, FiVideo } from 'react-icons/fi';
import { meetingService } from '../../api/meetingService';
import type { Meeting } from '../../types';

const MeetingTranscripts: React.FC = () => {
  const userId = localStorage.getItem('userId') || '';
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [myTranscript, setMyTranscript] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    meetingService
      .historyForUser(userId)
      .then((list) => setMeetings(Array.isArray(list) ? list : []))
      .catch(() => setMeetings([]))
      .finally(() => setLoading(false));
  }, [userId]);

  const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleString() : '—');

  const loadMine = async (meetingId: string) => {
    if (myTranscript[meetingId]) return;
    try {
      const rows = await meetingService.getParticipantTranscripts(meetingId);
      const mine = (rows ?? []).find(
        (r: any) => String(r.userId ?? r.UserId) === userId
      );
      setMyTranscript((p) => ({
        ...p,
        [meetingId]: mine?.transcriptText ?? mine?.TranscriptText ?? 'No transcript saved for your session.',
      }));
    } catch {
      setMyTranscript((p) => ({ ...p, [meetingId]: 'Could not load transcript.' }));
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-fg tracking-tight flex items-center gap-3">
          <FiFileText className="text-primary" /> My Meeting Transcripts
        </h1>
        <p className="text-fg-muted mt-2">
          Transcripts from meetings you attended, with timestamps and your speaker name.
        </p>
      </div>

      {loading ? (
        <p className="text-fg-subtle">Loading…</p>
      ) : meetings.length === 0 ? (
        <div className="bg-surface rounded-xl border border-line p-8 text-center text-fg-muted">
          No meeting transcripts yet.
        </div>
      ) : (
        <ul className="space-y-3">
          {meetings.map((m) => {
            const id = m.meetingId ?? (m as any).MeetingId;
            const open = expandedId === id;
            return (
              <li key={id} className="bg-surface rounded-xl border border-line p-5">
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => {
                    setExpandedId(open ? null : id);
                    if (!open) loadMine(id);
                  }}
                >
                  <p className="font-bold text-fg flex items-center gap-2">
                    <FiVideo className="text-primary" />
                    {m.title ?? (m as any).Title}
                  </p>
                  <p className="text-xs text-fg-muted mt-1 flex items-center gap-1">
                    <FiCalendar size={12} />
                    {fmt(m.scheduledAt ?? (m as any).ScheduledAt)}
                  </p>
                </button>
                {open && (
                  <pre className="mt-4 text-xs bg-surface-2 rounded-xl p-4 whitespace-pre-wrap max-h-64 overflow-y-auto border border-line text-fg-muted">
                    {myTranscript[id] ?? 'Loading…'}
                  </pre>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default MeetingTranscripts;
