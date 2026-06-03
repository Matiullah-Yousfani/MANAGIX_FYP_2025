import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCalendar, FiVideo, FiUsers } from 'react-icons/fi';
import { projectService } from '../../api/projectService';
import { meetingService } from '../../api/meetingService';
import type { Project } from '../../types';

const ScheduleMeeting: React.FC = () => {
  const navigate = useNavigate();
  const role = localStorage.getItem('roleName') || localStorage.getItem('userRole');
  const userId = localStorage.getItem('userId') || '';
  const managerId = localStorage.getItem('userId') || '';

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('10:00');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [participantCount, setParticipantCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
      return;
    }
    meetingService.resolveParticipants(projectId).then((ids) => setParticipantCount(ids.length)).catch(() => setParticipantCount(0));
  }, [projectId]);

  if (role !== 'Manager') {
    return (
      <div className="max-w-lg mx-auto mt-20 p-8 bg-white rounded-2xl border border-gray-100 shadow-sm text-center">
        <p className="text-gray-600 font-bold">Only managers can schedule project meetings.</p>
      </div>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
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
    if (Number.isNaN(scheduledAt.getTime())) {
      setError('Invalid date or time.');
      return;
    }

    setLoading(true);
    try {
      const meeting = await meetingService.create({
        projectId,
        title: title.trim(),
        description: description.trim() || undefined,
        scheduledAt: scheduledAt.toISOString(),
        durationMinutes,
        createdBy: userId,
      });
      const mid = meeting.meetingId ?? (meeting as any).MeetingId;
      const link = meeting.meetingLink ?? (meeting as any).MeetingLink ?? `/meeting?meetingId=${mid}`;
      setSuccess(`Meeting scheduled. Link ready — ${participantCount} participant(s) notified.`);
      setTimeout(() => navigate(link.startsWith('/') ? link : `/meeting?meetingId=${mid}`), 1500);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to schedule meeting.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Schedule Project Meeting</h1>
        <p className="text-gray-500 mt-2">
          Creates a meeting link and sends notifications to the project team and QA.
        </p>
      </div>

      <form onSubmit={onSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 space-y-6">
        <div>
          <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Project</label>
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
          <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Meeting title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-2 w-full border border-gray-200 rounded-xl px-4 py-3 font-bold"
            placeholder="Sprint planning"
            required
          />
        </div>

        <div>
          <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-2 w-full border border-gray-200 rounded-xl px-4 py-3"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
              <FiCalendar /> Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-2 w-full border border-gray-200 rounded-xl px-4 py-3"
              required
            />
          </div>
          <div>
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Start time</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="mt-2 w-full border border-gray-200 rounded-xl px-4 py-3"
              required
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Duration (minutes)</label>
          <input
            type="number"
            min={5}
            max={480}
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(Number(e.target.value))}
            className="mt-2 w-full border border-gray-200 rounded-xl px-4 py-3"
          />
        </div>

        {projectId && (
          <p className="text-sm text-indigo-700 font-bold flex items-center gap-2">
            <FiUsers /> {participantCount} participant(s) will be notified automatically
          </p>
        )}

        {error && <p className="text-red-600 text-sm font-bold">{error}</p>}
        {success && <p className="text-emerald-600 text-sm font-bold">{success}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white font-black py-4 rounded-xl hover:bg-indigo-700 flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <FiVideo />
          {loading ? 'Scheduling…' : 'Schedule & notify team'}
        </button>
      </form>
    </div>
  );
};

export default ScheduleMeeting;
