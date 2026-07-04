import React, { useEffect, useState } from 'react';
import { FiVideo, FiCalendar, FiUsers, FiFileText } from 'react-icons/fi';
import { meetingService } from '../api/meetingService';
import type { Meeting } from '../types';

interface Props {
  projectId: string;
}

const ProjectMeetingHistory: React.FC<Props> = ({ projectId }) => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    meetingService
      .byProject(projectId)
      .then((list) => setMeetings(Array.isArray(list) ? list : []))
      .catch(() => setMeetings([]))
      .finally(() => setLoading(false));
  }, [projectId]);

  const fmt = (iso: string) => new Date(iso).toLocaleString();

  return (
    <div className="bg-surface rounded-xl border border-line p-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-fg flex items-center gap-2">
          <FiVideo className="text-primary" />
          Project meetings
        </h2>
        <span className="text-sm font-bold text-primary bg-primary-soft px-3 py-1 rounded-full">
          {meetings.length} total
        </span>
      </div>

      {loading ? (
        <p className="text-sm text-fg-subtle">Loading meeting history…</p>
      ) : meetings.length === 0 ? (
        <p className="text-sm text-fg-muted bg-surface-2 rounded-xl p-4">
          No meetings scheduled for this project yet.
        </p>
      ) : (
        <ul className="space-y-3 max-h-96 overflow-y-auto">
          {meetings.map((m) => {
            const id = m.meetingId ?? (m as any).MeetingId;
            const sprint = m.sprintNumber ?? (m as any).SprintNumber ?? 1;
            const status = m.status ?? (m as any).Status ?? 'Scheduled';
            const transcripts = m.participantTranscriptCount ?? (m as any).ParticipantTranscriptCount ?? 0;
            const summary = m.summaryText ?? (m as any).SummaryText;
            const endsAt = m.endsAt ?? (m as any).EndsAt;
            const expanded = expandedId === id;

            return (
              <li
                key={id}
                className="bg-surface-2 rounded-xl px-4 py-3 border border-line"
              >
                <div className="flex flex-wrap justify-between items-start gap-2">
                  <div>
                    <p className="font-bold text-fg">{m.title ?? (m as any).Title}</p>
                    <p className="text-xs text-fg-muted flex items-center gap-1 mt-1">
                      <FiCalendar size={12} />
                      {fmt(m.scheduledAt ?? (m as any).ScheduledAt)}
                      {endsAt && <span> → {fmt(endsAt)}</span>}
                    </p>
                    <p className="text-xs text-primary font-bold mt-1">Sprint {sprint}</p>
                  </div>
                  <div className="text-right text-xs">
                    <span className="font-bold uppercase tracking-widest text-fg-subtle">{status}</span>
                    {transcripts > 0 && (
                      <p className="text-fg-muted mt-1 flex items-center justify-end gap-1">
                        <FiUsers size={12} />
                        {transcripts} transcript{transcripts === 1 ? '' : 's'}
                      </p>
                    )}
                  </div>
                </div>
                {(summary || m.transcriptText) && (
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : id)}
                    className="mt-2 text-xs font-bold text-primary flex items-center gap-1 hover:underline"
                  >
                    <FiFileText size={12} />
                    {expanded ? 'Hide details' : 'View summary & transcript'}
                  </button>
                )}
                {expanded && (
                  <div className="mt-3 space-y-2 text-sm">
                    {summary && (
                      <p className="bg-surface rounded-lg p-3 border border-line text-fg-muted">{summary}</p>
                    )}
                    {m.meetingNotesText && (
                      <pre className="bg-warning-soft rounded-lg p-3 text-xs whitespace-pre-wrap border border-warning/25 text-fg">
                        {(m as any).meetingNotesText ?? m.meetingNotesText}
                      </pre>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default ProjectMeetingHistory;
