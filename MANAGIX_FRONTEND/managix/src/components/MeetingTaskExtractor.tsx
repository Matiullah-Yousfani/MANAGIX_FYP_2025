// PHASE 4: Modal that turns a meeting transcript into reviewable task suggestions.
import { Select } from './ui';
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiCheckCircle, FiZap, FiClock, FiFlag, FiAlertTriangle } from 'react-icons/fi';
import { meetingService } from '../api/meetingService';
import { projectService } from '../api/projectService';
import api from '../api/axiosInstance';
import type { ExtractedTaskSuggestion, SpeedUpAlert } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
  transcript: string;
  meetingTitle?: string;
  jitsiRoomName?: string;
  /** When set, uses the scheduled meeting record instead of creating a duplicate. */
  meetingId?: string | null;
  projectId?: string | null;
}

interface EditableSuggestion extends ExtractedTaskSuggestion {
  keep: boolean;
}

const MeetingTaskExtractor: React.FC<Props> = ({
  open,
  onClose,
  transcript,
  meetingTitle,
  jitsiRoomName,
  meetingId,
  projectId: projectIdProp,
}) => {
  const [projects, setProjects] = useState<any[]>([]);
  const [projectId, setProjectId] = useState<string>('');
  const [phase, setPhase] = useState<'pick' | 'extracting' | 'review' | 'creating' | 'done' | 'error'>('pick');
  const [suggestions, setSuggestions] = useState<EditableSuggestion[]>([]);
  const [speedAlerts, setSpeedAlerts] = useState<SpeedUpAlert[]>([]);
  const [combinedSummary, setCombinedSummary] = useState<string>('');
  const [meetingNotes, setMeetingNotes] = useState<string>('');
  const [backlogItems, setBacklogItems] = useState<Array<{ title: string; description?: string; priority?: string }>>([]);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [createdCount, setCreatedCount] = useState(0);
  const [resolvedMeetingId, setResolvedMeetingId] = useState<string | null>(null);

  const userId = localStorage.getItem('userId') || '';
  const userRole = localStorage.getItem('userRole') || '';

  useEffect(() => {
    if (!open || !userId) return;
    setPhase('pick');
    setSuggestions([]);
    setSpeedAlerts([]);
    setCombinedSummary('');
    setMeetingNotes('');
    setBacklogItems([]);
    setErrorMsg('');
    setResolvedMeetingId(meetingId ?? null);

    if (projectIdProp) {
      setProjectId(projectIdProp);
      return;
    }

    (async () => {
      try {
        let list: any[] = [];
        if (userRole === 'Admin') {
          const r = await api.get('/projects');
          list = r.data;
        } else if (userRole === 'Manager') {
          list = await projectService.getByManager(userId);
        } else {
          list = await projectService.getByEmployee(userId);
        }
        setProjects(Array.isArray(list) ? list : []);
        if (list.length > 0) {
          const first = list[0];
          setProjectId(first.projectId || first.ProjectId);
        }
      } catch (e) {
        console.error('Project load failed', e);
      }
    })();
  }, [open, userId, userRole, meetingId, projectIdProp]);

  const runExtraction = async () => {
    const pid = projectIdProp || projectId;
    if (!pid || !transcript.trim() || !userId) {
      setErrorMsg('Pick a project first.');
      return;
    }
    setPhase('extracting');
    setErrorMsg('');
    try {
      let mid = meetingId ?? resolvedMeetingId;

      if (mid) {
        await meetingService.saveParticipantTranscript(mid, userId, transcript);
      } else {
        const meeting = await meetingService.create({
          projectId: pid,
          title: meetingTitle || 'Meeting',
          scheduledAt: new Date().toISOString(),
          durationMinutes: 10,
          jitsiRoomName: jitsiRoomName || null,
          createdBy: userId,
          participantUserIds: [userId],
        });
        mid = meeting.meetingId ?? (meeting as any).MeetingId;
        await meetingService.saveParticipantTranscript(mid!, userId, transcript);
        setResolvedMeetingId(mid!);
      }

      const analysis = await meetingService.analyzeMeeting(mid!, userId);
      const tasks = analysis?.tasks ?? [];
      setCombinedSummary(analysis?.combinedSummary ?? '');
      setMeetingNotes(analysis?.meetingNotes ?? '');
      setBacklogItems(analysis?.backlogItems ?? []);
      setSpeedAlerts(analysis?.speedUpAlerts ?? []);

      if (tasks.length === 0) {
        setSuggestions([]);
        setPhase('review');
        return;
      }

      setSuggestions(tasks.map((t: ExtractedTaskSuggestion) => ({ ...t, keep: true })));
      setPhase('review');
    } catch (e: any) {
      console.error('Extraction failed', e);
      setErrorMsg(e?.response?.data?.message || e.message || 'Extraction failed.');
      setPhase('error');
    }
  };

  const persistSelected = async () => {
    const keep = suggestions.filter((s) => s.keep);
    if (keep.length === 0) return;
    const pid = projectIdProp || projectId;
    setPhase('creating');
    let created = 0;
    for (const s of keep) {
      try {
        await api.post('/tasks', {
          projectId: pid,
          milestoneId: null,
          assignedEmployeeId: s.suggestedAssigneeUserId || null,
          title: s.title,
          description: s.description ?? '',
          status: 'Todo',
          estimatedHours: s.estimatedHours ?? null,
          priority: s.priority ?? 'Medium',
          requiredSkillsJson: s.requiredSkills && s.requiredSkills.length > 0
            ? JSON.stringify(s.requiredSkills)
            : null,
        });
        created++;
      } catch (e) {
        console.error('Task create failed for suggestion', s.title, e);
      }
    }
    setCreatedCount(created);
    setPhase('done');
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={onClose} />
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.92, opacity: 0 }}
          className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl p-10 overflow-y-auto max-h-[90vh]"
        >
          <button onClick={onClose} className="absolute top-6 right-6 text-gray-300 hover:text-gray-700">
            <FiX size={22} />
          </button>

          <h2 className="text-3xl font-extrabold text-gray-900 mb-2 flex items-center gap-3">
            <FiZap className="text-indigo-600" /> AI Meeting Analysis
          </h2>
          <p className="text-gray-500 italic mb-8">
            Per-participant transcripts are combined, then AI suggests tasks and speed-up notifications.
          </p>

          {phase === 'pick' && (
            <div className="space-y-6">
              {!projectIdProp && (
                <div>
                  <label className="text-xs font-extrabold text-gray-400 uppercase tracking-widest block mb-2">Target project</label>
                  <Select
                    value={projectId}
                    onChange={setProjectId}
                    className="w-full"
                    placeholder={projects.length === 0 ? 'No projects available' : 'Select project'}
                    options={projects.map((p) => ({ value: String(p.projectId || p.ProjectId), label: p.title || p.Title }))}
                  />
                </div>
              )}
              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 text-xs font-bold text-indigo-700">
                Your transcript: {transcript.length.toLocaleString()} characters
                {meetingId && <span className="block mt-1">Linked to scheduled meeting</span>}
              </div>
              {errorMsg && (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-xs font-bold text-red-700">{errorMsg}</div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={runExtraction}
                  disabled={!(projectIdProp || projectId) || !transcript.trim()}
                  className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all disabled:opacity-50"
                >
                  Analyze & suggest tasks
                </button>
                <button onClick={onClose} className="flex-1 bg-gray-100 text-gray-600 py-4 rounded-2xl font-bold">Cancel</button>
              </div>
            </div>
          )}

          {phase === 'extracting' && (
            <div className="py-16 text-center">
              <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-500 font-bold italic">Combining transcripts and analyzing with AI…</p>
            </div>
          )}

          {phase === 'review' && (
            <>
              {combinedSummary && (
                <div className="bg-gray-50 rounded-2xl p-4 mb-4 text-sm text-gray-700 border border-gray-200/70">
                  <p className="text-xs font-extrabold uppercase text-gray-400 mb-1">Meeting summary</p>
                  {combinedSummary}
                </div>
              )}
              {meetingNotes && (
                <div className="bg-amber-50 rounded-2xl p-4 mb-4 text-sm text-gray-700 border border-amber-100">
                  <p className="text-xs font-extrabold uppercase text-amber-600 mb-1">Meeting notes</p>
                  <pre className="whitespace-pre-wrap font-sans">{meetingNotes}</pre>
                </div>
              )}
              {backlogItems.length > 0 && (
                <div className="bg-indigo-50 rounded-2xl p-4 mb-4 border border-indigo-100">
                  <p className="text-xs font-extrabold uppercase text-indigo-500 mb-2">Backlog</p>
                  <ul className="space-y-2 text-sm">
                    {backlogItems.map((b, i) => (
                      <li key={i} className="bg-white rounded-lg px-3 py-2 border border-indigo-50">
                        <span className="font-bold">{b.title}</span>
                        {b.priority && <span className="ml-2 text-xs text-indigo-600">{b.priority}</span>}
                        {b.description && <p className="text-gray-600 mt-1">{b.description}</p>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {speedAlerts.length > 0 && (
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-4 space-y-2">
                  <p className="text-xs font-extrabold uppercase text-amber-700 flex items-center gap-1">
                    <FiAlertTriangle /> Speed-up notifications sent
                  </p>
                  {speedAlerts.map((a, i) => (
                    <p key={i} className="text-sm text-amber-900">
                      <strong>{a.userName ?? 'Team member'}:</strong> {a.message}
                    </p>
                  ))}
                </div>
              )}
              {suggestions.length === 0 ? (
                <div className="bg-gray-50 rounded-2xl p-8 text-center">
                  <p className="text-gray-500 font-bold italic">No clear action items found in the transcript.</p>
                  <button onClick={onClose} className="mt-6 bg-indigo-600 text-white py-3 px-6 rounded-2xl font-bold">Close</button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-xs font-extrabold text-gray-400 uppercase tracking-widest">
                    {suggestions.length} suggestion{suggestions.length === 1 ? '' : 's'} — toggle off any you don't want.
                  </div>
                  {suggestions.map((s, idx) => (
                    <SuggestionCard
                      key={idx}
                      suggestion={s}
                      onToggle={(keep) => {
                        setSuggestions((arr) => arr.map((x, i) => (i === idx ? { ...x, keep } : x)));
                      }}
                      onEdit={(patch) => {
                        setSuggestions((arr) => arr.map((x, i) => (i === idx ? { ...x, ...patch } : x)));
                      }}
                    />
                  ))}
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={persistSelected}
                      disabled={!suggestions.some((s) => s.keep)}
                      className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all disabled:opacity-50"
                    >
                      Create {suggestions.filter((s) => s.keep).length} task{suggestions.filter((s) => s.keep).length === 1 ? '' : 's'}
                    </button>
                    <button onClick={onClose} className="flex-1 bg-gray-100 text-gray-600 py-4 rounded-2xl font-bold">Cancel</button>
                  </div>
                </div>
              )}
            </>
          )}

          {phase === 'creating' && (
            <div className="py-16 text-center">
              <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-500 font-bold italic">Creating tasks…</p>
            </div>
          )}

          {phase === 'done' && (
            <div className="py-16 text-center">
              <FiCheckCircle className="text-emerald-500 mx-auto mb-4" size={48} />
              <p className="text-gray-700 font-bold mb-6">Created {createdCount} task{createdCount === 1 ? '' : 's'} successfully.</p>
              <button onClick={onClose} className="bg-indigo-600 text-white py-3 px-6 rounded-2xl font-bold">Close</button>
            </div>
          )}

          {phase === 'error' && (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-sm font-bold text-red-700">
              {errorMsg}
              <button onClick={() => setPhase('pick')} className="ml-3 underline">Try again</button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

const SuggestionCard: React.FC<{
  suggestion: EditableSuggestion;
  onToggle: (keep: boolean) => void;
  onEdit: (patch: Partial<EditableSuggestion>) => void;
}> = ({ suggestion, onToggle, onEdit }) => {
  return (
    <div className={`rounded-2xl border p-5 transition-colors ${suggestion.keep ? 'border-indigo-200 bg-indigo-50/30' : 'border-gray-200/70 bg-gray-50 opacity-60'}`}>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={suggestion.keep}
          onChange={(e) => onToggle(e.target.checked)}
          className="mt-1 size-5 accent-indigo-600"
        />
        <div className="flex-1 min-w-0 space-y-3">
          <input
            value={suggestion.title}
            onChange={(e) => onEdit({ title: e.target.value })}
            className="w-full bg-transparent font-extrabold text-gray-900 outline-none focus:bg-white focus:px-2 focus:py-1 focus:rounded-lg transition-all"
          />
          <textarea
            value={suggestion.description ?? ''}
            placeholder="(no description)"
            onChange={(e) => onEdit({ description: e.target.value })}
            className="w-full bg-transparent text-sm text-gray-600 outline-none resize-none focus:bg-white focus:px-2 focus:py-1 focus:rounded-lg transition-all"
            rows={2}
          />
          <div className="flex flex-wrap gap-2 text-[10px] font-extrabold uppercase tracking-widest">
            {suggestion.suggestedAssigneeName && (
              <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full">
                Suggested: {suggestion.suggestedAssigneeName}
              </span>
            )}
            <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full inline-flex items-center gap-1">
              <FiFlag /> {suggestion.priority || 'Medium'}
            </span>
            {suggestion.estimatedHours != null && (
              <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full inline-flex items-center gap-1">
                <FiClock /> {suggestion.estimatedHours}h
              </span>
            )}
            {(suggestion.requiredSkills ?? []).map((sk) => (
              <span key={sk} className="bg-gray-200 text-gray-700 px-3 py-1 rounded-full">{sk}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeetingTaskExtractor;
