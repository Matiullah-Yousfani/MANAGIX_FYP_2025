// PHASE 4: Modal that turns a meeting transcript into reviewable task suggestions.
//
// Flow:
//   1. Open modal (transcript already captured in Meeting.tsx).
//   2. User picks a target project.
//   3. Component creates a Meeting record, posts the transcript, calls extract-tasks.
//   4. Suggestions render — user toggles which to keep, can edit fields inline.
//   5. Confirm → each kept suggestion is POSTed via taskService.create.
//
// Theme: matches the MANAGIX modal pattern from Dashboard.tsx (rounded-[2.5rem], gray-900/60 backdrop, indigo CTA).
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiCheckCircle, FiZap, FiClock, FiFlag } from 'react-icons/fi';
import { meetingService } from '../api/meetingService';
import { projectService } from '../api/projectService';
import api from '../api/axiosInstance';
import type { ExtractedTaskSuggestion } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
  transcript: string;
  meetingTitle?: string;
  jitsiRoomName?: string;
}

interface EditableSuggestion extends ExtractedTaskSuggestion {
  keep: boolean;
}

const MeetingTaskExtractor: React.FC<Props> = ({ open, onClose, transcript, meetingTitle, jitsiRoomName }) => {
  const [projects, setProjects] = useState<any[]>([]);
  const [projectId, setProjectId] = useState<string>('');
  const [phase, setPhase] = useState<'pick' | 'extracting' | 'review' | 'creating' | 'done' | 'error'>('pick');
  const [suggestions, setSuggestions] = useState<EditableSuggestion[]>([]);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [createdCount, setCreatedCount] = useState(0);

  const userId = localStorage.getItem('userId') || '';
  const userRole = localStorage.getItem('userRole') || '';

  // Load projects the user can target — manager → own, admin → all, employee → assigned.
  useEffect(() => {
    if (!open || !userId) return;
    setPhase('pick');
    setSuggestions([]);
    setErrorMsg('');
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
  }, [open, userId, userRole]);

  const runExtraction = async () => {
    if (!projectId || !transcript.trim() || !userId) {
      setErrorMsg('Pick a project first.');
      return;
    }
    setPhase('extracting');
    setErrorMsg('');
    try {
      // 1. Create the meeting record.
      const meeting = await meetingService.create({
        projectId,
        title: meetingTitle || 'Meeting',
        scheduledAt: new Date().toISOString(),
        durationMinutes: 30,
        jitsiRoomName: jitsiRoomName || null,
        createdBy: userId,
        participantUserIds: [userId],
      });

      // 2. Persist the transcript + flip status to Completed.
      await meetingService.completeWithTranscript(meeting.meetingId, transcript);

      // 3. Ask the AI to extract action items.
      const result = await meetingService.extractTasks(meeting.meetingId);
      const tasks = result?.tasks ?? [];

      if (tasks.length === 0) {
        setSuggestions([]);
        setPhase('review');
        return;
      }

      setSuggestions(tasks.map((t) => ({ ...t, keep: true })));
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
    setPhase('creating');
    let created = 0;
    for (const s of keep) {
      try {
        await api.post('/tasks', {
          projectId,
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
          className="relative w-full max-w-3xl bg-white rounded-[2.5rem] shadow-2xl p-10 overflow-y-auto max-h-[90vh]"
        >
          <button onClick={onClose} className="absolute top-6 right-6 text-gray-300 hover:text-gray-700">
            <FiX size={22} />
          </button>

          <h2 className="text-3xl font-black text-gray-900 mb-2 flex items-center gap-3">
            <FiZap className="text-indigo-600" /> AI Task Extraction
          </h2>
          <p className="text-gray-500 italic mb-8">
            We'll read the transcript, suggest action-item tasks, and let you confirm before creating any.
          </p>

          {phase === 'pick' && (
            <div className="space-y-6">
              <div>
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-2">Target project</label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full bg-gray-50 border-none p-4 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  {projects.length === 0 && <option value="">No projects available</option>}
                  {projects.map((p) => {
                    const pid = p.projectId || p.ProjectId;
                    return <option key={pid} value={pid}>{p.title || p.Title}</option>;
                  })}
                </select>
              </div>
              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 text-xs font-bold text-indigo-700">
                Transcript length: {transcript.length.toLocaleString()} characters
              </div>
              {errorMsg && (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-xs font-bold text-red-700">{errorMsg}</div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={runExtraction}
                  disabled={!projectId || !transcript.trim()}
                  className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all disabled:opacity-50"
                >
                  Generate suggestions
                </button>
                <button onClick={onClose} className="flex-1 bg-gray-100 text-gray-600 py-4 rounded-2xl font-bold">Cancel</button>
              </div>
            </div>
          )}

          {phase === 'extracting' && (
            <div className="py-16 text-center">
              <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-500 font-bold italic">Reading transcript and drafting tasks…</p>
            </div>
          )}

          {phase === 'review' && (
            <>
              {suggestions.length === 0 ? (
                <div className="bg-gray-50 rounded-2xl p-8 text-center">
                  <p className="text-gray-500 font-bold italic">No clear action items found in the transcript.</p>
                  <button onClick={onClose} className="mt-6 bg-indigo-600 text-white py-3 px-6 rounded-2xl font-bold">Close</button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-xs font-black text-gray-400 uppercase tracking-widest">
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

// Single editable suggestion card.
const SuggestionCard: React.FC<{
  suggestion: EditableSuggestion;
  onToggle: (keep: boolean) => void;
  onEdit: (patch: Partial<EditableSuggestion>) => void;
}> = ({ suggestion, onToggle, onEdit }) => {
  return (
    <div className={`rounded-2xl border p-5 transition-colors ${suggestion.keep ? 'border-indigo-200 bg-indigo-50/30' : 'border-gray-100 bg-gray-50 opacity-60'}`}>
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
            className="w-full bg-transparent font-black text-gray-900 outline-none focus:bg-white focus:px-2 focus:py-1 focus:rounded-lg transition-all"
          />
          <textarea
            value={suggestion.description ?? ''}
            placeholder="(no description)"
            onChange={(e) => onEdit({ description: e.target.value })}
            className="w-full bg-transparent text-sm text-gray-600 outline-none resize-none focus:bg-white focus:px-2 focus:py-1 focus:rounded-lg transition-all"
            rows={2}
          />

          <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-widest">
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
