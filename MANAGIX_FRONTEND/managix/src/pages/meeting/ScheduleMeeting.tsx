import React, { useEffect, useState } from 'react';
import { FiCalendar, FiVideo, FiUsers, FiFlag, FiCopy, FiLink, FiClock } from 'react-icons/fi';
import { projectService } from '../../api/projectService';
import { meetingService } from '../../api/meetingService';
import type { Meeting, Project } from '../../types';
import { minDateToday } from '../../utils/dateInput';
import { DatePicker } from '../../components/ui';

const ScheduleMeeting: React.FC = () => {
  const role = localStorage.getItem('roleName') || localStorage.getItem('userRole');
  const userId = localStorage.getItem('userId') || '';
  const managerId = localStorage.getItem('userId') || '';

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:00');
  const [sprintNumber, setSprintNumber] = useState<number | null>(null);
  const [participantCount, setParticipantCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdMeeting, setCreatedMeeting] = useState<Meeting | null>(null);
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  useEffect(() => {
    if (role !== 'Manager') return;
    (async () => {
      try {
        const list = await projectService.getByManager(managerId);
        setProjects(Array.isArray(list) ? list : []);
      } catch {
        setProjects([]);
      }
    })();
  }, [role, managerId]);

  useEffect(() => {
    if (!projectId) {
      setParticipantCount(0);
      setSprintNumber(null);
      return;
    }
    meetingService.resolveParticipants(projectId).then((ids) => setParticipantCount(ids.length)).catch(() => setParticipantCount(0));
  }, [projectId]);

  useEffect(() => {
    if (!projectId || !date) {
      setSprintNumber(null);
      return;
    }
    const scheduledAt = new Date(`${date}T${startTime}:00`);
    if (Number.isNaN(scheduledAt.getTime())) {
      setSprintNumber(null);
      return;
    }
    meetingService
      .sprintPreview(projectId, scheduledAt.toISOString())
      .then((p) => setSprintNumber(p.sprintNumber ?? p.projectWeek ?? 1))
      .catch(() => setSprintNumber(1));
  }, [projectId, date, startTime]);

  if (role !== 'Manager') {
    return (
      <div className="max-w-lg mx-auto mt-20 p-8 bg-white rounded-2xl border border-gray-200/70 shadow-sm text-center">
        <p className="text-gray-600 font-bold">Only managers can schedule project meetings.</p>
      </div>
    );
  }

  const buildShareUrl = (link?: string | null, meetingId?: string, code?: string) => {
    let path = link || (meetingId ? `/meeting?meetingId=${meetingId}` : '');
    if (code && !path.toLowerCase().includes('code=')) {
      path += path.includes('?') ? `&code=${encodeURIComponent(code)}` : `?code=${encodeURIComponent(code)}`;
    }
    return `${window.location.origin}${path.startsWith('/') ? path : `/${path}`}`;
  };

  const copyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy link — select and copy manually.');
    }
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      setError('Could not copy code — select and copy manually.');
    }
  };

  const copyLinkAndCode = async (url: string, code: string) => {
    const text = `Meeting link: ${url}\nJoin code: ${code}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy — select and copy manually.');
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCreatedMeeting(null);
    if (!projectId) {
      setError('Select a project first.');
      return;
    }
    if (participantCount === 0) {
      setError('This project has no team yet. Assign a team in Team Setup before scheduling a meeting.');
      return;
    }
    if (!title.trim() || !date) {
      setError('Meeting title and date are required.');
      return;
    }

    const scheduledAt = new Date(`${date}T${startTime}:00`);
    const endsAt = new Date(`${date}T${endTime}:00`);
    if (Number.isNaN(scheduledAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      setError('Invalid date or time.');
      return;
    }
    if (endsAt <= scheduledAt) {
      setError('End time must be after start time.');
      return;
    }

    setLoading(true);
    try {
      const meeting = await meetingService.create({
        projectId,
        title: title.trim(),
        description: description.trim() || undefined,
        scheduledAt: scheduledAt.toISOString(),
        endsAt: endsAt.toISOString(),
        createdBy: userId,
      });
      setCreatedMeeting(meeting);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const msg = err?.response?.data?.message || err?.message || 'Failed to schedule meeting.';
      setError(detail ? `${msg} (${detail})` : msg);
    } finally {
      setLoading(false);
    }
  };

  const mid = createdMeeting?.meetingId ?? (createdMeeting as any)?.MeetingId;
  const sprint = createdMeeting?.sprintNumber ?? (createdMeeting as any)?.SprintNumber ?? sprintNumber;
  const joinCode = createdMeeting?.joinCode ?? (createdMeeting as any)?.JoinCode ?? '';
  const shareUrl = createdMeeting ? buildShareUrl(createdMeeting.meetingLink, mid, joinCode) : '';

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Schedule Project Meeting</h1>
        <p className="text-gray-500 mt-2">
          Select project, sprint window, and description. A join link is generated for your project team only
          (manager, developers, QA). The link works from start time until end time.
        </p>
      </div>

      {createdMeeting ? (
        <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-8 space-y-6">
          <div className="flex items-center gap-3 text-emerald-700">
            <FiVideo size={28} />
            <div>
              <h2 className="text-xl font-extrabold text-gray-900">Meeting link created</h2>
              <p className="text-sm">Sprint {sprint} — {participantCount} team member(s) notified</p>
            </div>
          </div>

          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
            <p className="text-xs font-extrabold uppercase text-indigo-400 tracking-widest">Join code</p>
            <p className="text-xs text-indigo-600 mt-1">Team members need this code to enter the meeting room (also sent in notifications).</p>
            <div className="flex items-center gap-2 mt-2">
              <p className="text-2xl font-mono font-extrabold text-indigo-900 flex-1">{joinCode || '—'}</p>
              {joinCode && (
                <button
                  type="button"
                  onClick={() => copyCode(joinCode)}
                  className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 flex items-center gap-2 text-sm"
                >
                  <FiCopy /> {codeCopied ? 'Copied!' : 'Copy code'}
                </button>
              )}
            </div>
          </div>

          <div>
            <p className="text-xs font-extrabold uppercase text-gray-400 tracking-widest mb-2 flex items-center gap-1">
              <FiLink /> Share link (includes join code)
            </p>
            <div className="flex gap-2">
              <input
                readOnly
                value={shareUrl}
                className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono bg-gray-50"
              />
              <button
                type="button"
                onClick={() => copyLink(shareUrl)}
                className="px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 flex items-center gap-2"
              >
                <FiCopy /> {copied ? 'Copied!' : 'Copy link'}
              </button>
            </div>
            {joinCode && (
              <button
                type="button"
                onClick={() => copyLinkAndCode(shareUrl, joinCode)}
                className="mt-2 text-sm font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
              >
                Copy link + code together
              </button>
            )}
          </div>

          <div className="text-sm text-gray-600 space-y-1">
            <p className="flex items-center gap-2"><FiClock /> Active: {date} {startTime} → {endTime}</p>
            <p>After end time the link expires automatically.</p>
          </div>

          <a
            href={shareUrl}
            className="block w-full text-center bg-emerald-600 text-white font-extrabold py-4 rounded-xl hover:bg-emerald-700"
          >
            Open meeting room
          </a>

          <button
            type="button"
            onClick={() => setCreatedMeeting(null)}
            className="w-full text-gray-500 font-bold py-2 hover:text-gray-800"
          >
            Schedule another meeting
          </button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="bg-white rounded-2xl border border-gray-200/70 shadow-sm p-8 space-y-6">
          <div>
            <label className="text-xs font-extrabold text-gray-400 uppercase tracking-widest">Project</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="mt-2 w-full border border-gray-200 rounded-xl px-4 py-3 font-bold text-gray-800"
              required
            >
              <option value="">Select project…</option>
              {projects.map((p) => (
                <option key={p.projectId} value={p.projectId}>
                  {p.title || 'Untitled project'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-extrabold text-gray-400 uppercase tracking-widest">Meeting title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-2 w-full border border-gray-200 rounded-xl px-4 py-3 font-bold"
              placeholder="Sprint standup"
              required
            />
          </div>

          <div>
            <label className="text-xs font-extrabold text-gray-400 uppercase tracking-widest">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-2 w-full border border-gray-200 rounded-xl px-4 py-3"
              rows={3}
              placeholder="Agenda, goals, topics to cover…"
            />
          </div>

          {projectId && date && sprintNumber != null && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-center gap-3">
              <FiFlag className="text-indigo-600 shrink-0" size={20} />
              <div>
                <p className="text-xs font-extrabold uppercase text-indigo-400 tracking-widest">Sprint (auto)</p>
                <p className="text-lg font-extrabold text-indigo-900">Sprint {sprintNumber}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-extrabold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                <FiCalendar /> Date
              </label>
              <DatePicker
                className="mt-2"
                min={minDateToday()}
                value={date}
                onChange={setDate}
              />
            </div>
            <div>
              <label className="text-xs font-extrabold text-gray-400 uppercase tracking-widest">Start time</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="mt-2 w-full border border-gray-200 rounded-xl px-4 py-3"
                required
              />
            </div>
            <div>
              <label className="text-xs font-extrabold text-gray-400 uppercase tracking-widest">End time</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="mt-2 w-full border border-gray-200 rounded-xl px-4 py-3"
                required
              />
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-xs text-amber-800 font-medium space-y-1">
            <p><strong>Access:</strong> Only invited project team members can join.</p>
            <p><strong>Active window:</strong> Link works from start time until end time.</p>
            <p><strong>After end:</strong> Link expires; transcripts are combined and analyzed by AI.</p>
          </div>

          {projectId && (
            <p className="text-sm text-indigo-700 font-bold flex items-center gap-2">
              <FiUsers /> {participantCount} team member(s) will receive the link via notification
            </p>
          )}

          {error && <p className="text-red-600 text-sm font-bold">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white font-extrabold py-4 rounded-xl hover:bg-indigo-700 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <FiLink />
            {loading ? 'Creating link…' : 'Create meeting link'}
          </button>
        </form>
      )}
    </div>
  );
};

export default ScheduleMeeting;
