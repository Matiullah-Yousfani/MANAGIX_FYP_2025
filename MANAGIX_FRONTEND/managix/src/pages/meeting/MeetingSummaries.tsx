import React, { useEffect, useState } from 'react';
import { FiVideo, FiCalendar, FiFileText, FiZap, FiList, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { meetingService } from '../../api/meetingService';
import MeetingTaskExtractor from '../../components/MeetingTaskExtractor';
import type { Meeting } from '../../types';

const MeetingSummaries: React.FC = () => {
  const role = localStorage.getItem('roleName') || localStorage.getItem('userRole');
  const userId = localStorage.getItem('userId') || '';
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [participantTexts, setParticipantTexts] = useState<Record<string, string>>({});
  const [extractorOpen, setExtractorOpen] = useState(false);
  const [extractorMeeting, setExtractorMeeting] = useState<Meeting | null>(null);

  useEffect(() => {
    if (role !== 'Manager' || !userId) return;
    setLoading(true);
    meetingService
      .conductedForManager(userId)
      .then((list) => setMeetings(Array.isArray(list) ? list : []))
      .catch(() => setMeetings([]))
      .finally(() => setLoading(false));
  }, [role, userId]);

  const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleString() : '—');

  const loadParticipants = async (meetingId: string) => {
    if (participantTexts[meetingId]) return;
    try {
      const rows = await meetingService.getParticipantTranscripts(meetingId);
      const block = (rows ?? [])
        .map((r: any) => `=== ${r.userName ?? r.UserName ?? 'Participant'} ===\n${r.transcriptText ?? r.TranscriptText ?? ''}`)
        .join('\n\n');
      setParticipantTexts((p) => ({ ...p, [meetingId]: block }));
    } catch {
      setParticipantTexts((p) => ({ ...p, [meetingId]: '' }));
    }
  };

  const toggle = (id: string) => {
    setExpandedId((cur) => (cur === id ? null : id));
    if (expandedId !== id) loadParticipants(id);
  };

  const openAllocate = (m: Meeting) => {
    setExtractorMeeting(m);
    setExtractorOpen(true);
  };

  if (role !== 'Manager') {
    return (
      <div className="max-w-lg mx-auto mt-20 p-8 bg-white rounded-2xl border text-center">
        <p className="font-bold text-gray-600">Only managers can view project meeting summaries.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
          <FiFileText className="text-indigo-600" /> Meeting Summaries & Backlog
        </h1>
        <p className="text-gray-500 mt-2">
          After meetings end, AI combines transcripts and generates summaries, notes, backlog items, and task suggestions.
          Allocate tasks to your project from here.
        </p>
      </div>

      {loading ? (
        <p className="text-gray-400 italic">Loading conducted meetings…</p>
      ) : meetings.length === 0 ? (
        <div className="bg-white rounded-2xl border p-8 text-center text-gray-500">
          No completed meetings yet. Schedule a meeting and conduct it during the active window.
        </div>
      ) : (
        <ul className="space-y-4">
          {meetings.map((m) => {
            const id = m.meetingId ?? (m as any).MeetingId;
            const expanded = expandedId === id;
            const backlog = m.backlogItems ?? (m as any).BacklogItems ?? [];
            const summary = m.summaryText ?? (m as any).SummaryText;
            const notes = m.meetingNotesText ?? (m as any).MeetingNotesText;
            const transcript = m.transcriptText ?? (m as any).TranscriptText;

            return (
              <li key={id} className="bg-white rounded-2xl border border-gray-200/70 shadow-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggle(id)}
                  className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-gray-50"
                >
                  <div>
                    <p className="font-extrabold text-gray-900 flex items-center gap-2">
                      <FiVideo className="text-indigo-600" />
                      {m.title ?? (m as any).Title}
                    </p>
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <FiCalendar size={12} />
                      {fmt(m.scheduledAt ?? (m as any).ScheduledAt)}
                      {(m.endsAt ?? (m as any).EndsAt) && ` → ${fmt(m.endsAt ?? (m as any).EndsAt)}`}
                    </p>
                    {(m.sprintNumber ?? (m as any).SprintNumber) != null && (
                      <p className="text-xs text-indigo-600 font-bold mt-1">
                        Sprint {m.sprintNumber ?? (m as any).SprintNumber}
                      </p>
                    )}
                  </div>
                  {expanded ? <FiChevronUp /> : <FiChevronDown />}
                </button>

                {expanded && (
                  <div className="px-5 pb-5 space-y-4 border-t border-gray-200/70 pt-4">
                    {summary && (
                      <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                        <p className="text-xs font-extrabold uppercase text-indigo-500 mb-2">AI Summary</p>
                        <p className="text-sm text-gray-800">{summary}</p>
                      </div>
                    )}
                    {notes && (
                      <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                        <p className="text-xs font-extrabold uppercase text-amber-600 mb-2">Meeting Notes</p>
                        <pre className="text-sm whitespace-pre-wrap font-sans text-gray-700">{notes}</pre>
                      </div>
                    )}
                    {backlog.length > 0 && (
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200/70">
                        <p className="text-xs font-extrabold uppercase text-gray-500 mb-3 flex items-center gap-1">
                          <FiList /> Backlog
                        </p>
                        <ul className="space-y-2">
                          {backlog.map((b: any, i: number) => (
                            <li key={i} className="bg-white rounded-lg px-3 py-2 border text-sm">
                              <span className="font-bold">{b.title}</span>
                              {b.priority && <span className="ml-2 text-xs text-indigo-600">{b.priority}</span>}
                              {b.description && <p className="text-gray-600 mt-1">{b.description}</p>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {(transcript || participantTexts[id]) && (
                      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200/70">
                        <p className="text-xs font-extrabold uppercase text-gray-500 mb-2">Combined Transcript</p>
                        <pre className="text-xs whitespace-pre-wrap max-h-48 overflow-y-auto text-gray-700">
                          {transcript || participantTexts[id]}
                        </pre>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => openAllocate(m)}
                      className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold text-sm"
                    >
                      <FiZap /> Allocate tasks to project
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <MeetingTaskExtractor
        open={extractorOpen}
        onClose={() => {
          setExtractorOpen(false);
          setExtractorMeeting(null);
        }}
        transcript={
          extractorMeeting?.transcriptText ??
          (extractorMeeting as any)?.TranscriptText ??
          ''
        }
        meetingTitle={extractorMeeting?.title ?? (extractorMeeting as any)?.Title}
        meetingId={extractorMeeting?.meetingId ?? (extractorMeeting as any)?.MeetingId}
        projectId={
          extractorMeeting?.projectId
            ? String(extractorMeeting.projectId)
            : (extractorMeeting as any)?.ProjectId
              ? String((extractorMeeting as any).ProjectId)
              : null
        }
      />
    </div>
  );
};

export default MeetingSummaries;
