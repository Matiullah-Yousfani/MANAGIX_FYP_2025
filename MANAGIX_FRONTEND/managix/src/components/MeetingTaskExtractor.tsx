// PHASE 4: Modal that turns a meeting transcript into reviewable task suggestions.
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
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.92, opacity: 0 }}
          className="relative w-full max-w-3xl bg-surface rounded-xl shadow-e3 p-10 overflow-y-auto max-h-[90vh]"
        >
          <button onClick={onClose} className="absolute top-6 right-6 text-fg-subtle hover:text-fg">
            <FiX size={22} />
          </button>

          <h2 className="text-2xl font-bold text-fg mb-2 flex items-center gap-3">
            <FiZap className="text-primary" /> AI Meeting Analysis
          </h2>
          <p className="text-fg-muted mb-8">
            Per-participant transcripts are combined, then AI suggests tasks and speed-up notifications.
          </p>

          {phase === 'pick' && (
            <div className="space-y-6">
              {!projectIdProp && (
                <div>
                  <label className="text-xs font-bold text-fg-subtle uppercase tracking-widest block mb-2">Target project</label>
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="w-full bg-surface-2 border border-line p-4 rounded-lg outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary font-medium text-fg"
                  >
                    {projects.length === 0 && <option value="">No projects available</option>}
                    {projects.map((p) => {
                      const pid = p.projectId || p.ProjectId;
                      return <option key={pid} value={pid}>{p.title || p.Title}</option>;
                    })}
                  </select>
                </div>
              )}
              <div className="bg-primary-soft border border-primary-border rounded-lg p-4 text-xs font-bold text-primary">
                Your transcript: {transcript.length.toLocaleString()} characters
                {meetingId && <span className="block mt-1">Linked to scheduled meeting</span>}
              </div>
              {errorMsg && (
                <div className="bg-danger-soft border border-danger/25 rounded-lg p-4 text-xs font-bold text-danger">{errorMsg}</div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={runExtraction}
                  disabled={!(projectIdProp || projectId) || !transcript.trim()}
                  className="flex-1 bg-primary text-primary-fg py-4 rounded-lg font-bold hover:bg-primary-hover transition-all disabled:opacity-50"
                >
                  Analyze & suggest tasks
                </button>
                <button onClick={onClose} className="flex-1 bg-surface-2 text-fg-muted py-4 rounded-lg font-bold">Cancel</button>
              </div>
            </div>
          )}

          {phase === 'extracting' && (
            <div className="py-16 text-center">
              <div className="w-12 h-12 border-4 border-line border-t-primary rounded-full animate-spin mx-auto mb-4" />
              <p className="text-fg-muted font-bold">Combining transcripts and analyzing with AI…</p>
            </div>
          )}

          {phase === 'review' && (
            <>
              {combinedSummary && (
                <div className="bg-surface-2 rounded-lg p-4 mb-4 text-sm text-fg-muted border border-line">
                  <p className="text-xs font-bold uppercase text-fg-subtle mb-1">Meeting summary</p>
                  {combinedSummary}
                </div>
              )}
              {meetingNotes && (
                <div className="bg-warning-soft rounded-lg p-4 mb-4 text-sm text-fg-muted border border-warning/25">
                  <p className="text-xs font-bold uppercase text-warning mb-1">Meeting notes</p>
                  <pre className="whitespace-pre-wrap font-sans">{meetingNotes}</pre>
                </div>
              )}
              {backlogItems.length > 0 && (
                <div className="bg-primary-soft rounded-lg p-4 mb-4 border border-primary-border">
                  <p className="text-xs font-bold uppercase text-primary mb-2">Backlog</p>
                  <ul className="space-y-2 text-sm">
                    {backlogItems.map((b, i) => (
                      <li key={i} className="bg-surface rounded-lg px-3 py-2 border border-primary-border">
                        <span className="font-bold">{b.title}</span>
                        {b.priority && <span className="ml-2 text-xs text-primary">{b.priority}</span>}
                        {b.description && <p className="text-fg-muted mt-1">{b.description}</p>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {speedAlerts.length > 0 && (
                <div className="bg-warning-soft border border-warning/25 rounded-lg p-4 mb-4 space-y-2">
                  <p className="text-xs font-bold uppercase text-warning flex items-center gap-1">
                    <FiAlertTriangle /> Speed-up notifications sent
                  </p>
                  {speedAlerts.map((a, i) => (
                    <p key={i} className="text-sm text-warning">
                      <strong>{a.userName ?? 'Team member'}:</strong> {a.message}
                    </p>
                  ))}
                </div>
              )}
              {suggestions.length === 0 ? (
                <div className="bg-surface-2 rounded-lg p-8 text-center">
                  <p className="text-fg-muted font-bold">No clear action items found in the transcript.</p>
                  <button onClick={onClose} className="mt-6 bg-primary text-primary-fg py-3 px-6 rounded-lg font-bold">Close</button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-xs font-bold text-fg-subtle uppercase tracking-widest">
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
                      className="flex-1 bg-primary text-primary-fg py-4 rounded-lg font-bold hover:bg-primary-hover transition-all disabled:opacity-50"
                    >
                      Create {suggestions.filter((s) => s.keep).length} task{suggestions.filter((s) => s.keep).length === 1 ? '' : 's'}
                    </button>
                    <button onClick={onClose} className="flex-1 bg-surface-2 text-fg-muted py-4 rounded-lg font-bold">Cancel</button>
                  </div>
                </div>
              )}
            </>
          )}

          {phase === 'creating' && (
            <div className="py-16 text-center">
              <div className="w-12 h-12 border-4 border-line border-t-primary rounded-full animate-spin mx-auto mb-4" />
              <p className="text-fg-muted font-bold">Creating tasks…</p>
            </div>
          )}

          {phase === 'done' && (
            <div className="py-16 text-center">
              <FiCheckCircle className="text-success mx-auto mb-4" size={48} />
              <p className="text-fg font-bold mb-6">Created {createdCount} task{createdCount === 1 ? '' : 's'} successfully.</p>
              <button onClick={onClose} className="bg-primary text-primary-fg py-3 px-6 rounded-lg font-bold">Close</button>
            </div>
          )}

          {phase === 'error' && (
            <div className="bg-danger-soft border border-danger/25 rounded-lg p-4 text-sm font-bold text-danger">
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
    <div className={`rounded-xl border p-5 transition-colors ${suggestion.keep ? 'border-primary-border bg-primary-soft' : 'border-line bg-surface-2 opacity-60'}`}>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={suggestion.keep}
          onChange={(e) => onToggle(e.target.checked)}
          className="mt-1 size-5 accent-primary"
        />
        <div className="flex-1 min-w-0 space-y-3">
          <input
            value={suggestion.title}
            onChange={(e) => onEdit({ title: e.target.value })}
            className="w-full bg-transparent font-bold text-fg outline-none focus:bg-surface focus:px-2 focus:py-1 focus:rounded-lg transition-all"
          />
          <textarea
            value={suggestion.description ?? ''}
            placeholder="(no description)"
            onChange={(e) => onEdit({ description: e.target.value })}
            className="w-full bg-transparent text-sm text-fg-muted outline-none resize-none focus:bg-surface focus:px-2 focus:py-1 focus:rounded-lg transition-all"
            rows={2}
          />
          <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-widest">
            {suggestion.suggestedAssigneeName && (
              <span className="bg-success-soft text-success px-3 py-1 rounded-full">
                Suggested: {suggestion.suggestedAssigneeName}
              </span>
            )}
            <span className="bg-warning-soft text-warning px-3 py-1 rounded-full inline-flex items-center gap-1">
              <FiFlag /> {suggestion.priority || 'Medium'}
            </span>
            {suggestion.estimatedHours != null && (
              <span className="bg-info-soft text-info px-3 py-1 rounded-full inline-flex items-center gap-1">
                <FiClock /> {suggestion.estimatedHours}h
              </span>
            )}
            {(suggestion.requiredSkills ?? []).map((sk) => (
              <span key={sk} className="bg-surface-3 text-fg-muted px-3 py-1 rounded-full">{sk}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeetingTaskExtractor;
