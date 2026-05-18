// PHASE 4: Frontend wrapper for meeting + AI-extraction endpoints.
import api from './axiosInstance';
import type { Meeting, ExtractedTaskSuggestion } from '../types';

export interface MeetingCreateInput {
  projectId?: string | null;
  title: string;
  scheduledAt: string; // ISO
  durationMinutes?: number;
  jitsiRoomName?: string | null;
  createdBy: string;
  participantUserIds?: string[];
}

export const meetingService = {
  create: async (input: MeetingCreateInput): Promise<Meeting> => {
    const r = await api.post(`/meetings`, input);
    return r.data;
  },

  get: async (meetingId: string): Promise<Meeting> => {
    const r = await api.get(`/meetings/${meetingId}`);
    return r.data;
  },

  byProject: async (projectId: string): Promise<Meeting[]> => {
    const r = await api.get(`/meetings/project/${projectId}`);
    return r.data;
  },

  upcomingForUser: async (userId: string): Promise<Meeting[]> => {
    const r = await api.get(`/meetings/user/${userId}/upcoming`);
    return r.data;
  },

  // Saves transcript + flips status to Completed. Called when AssemblyAI returns.
  completeWithTranscript: async (meetingId: string, transcriptText: string): Promise<boolean> => {
    const r = await api.post(`/meetings/${meetingId}/complete`, { transcriptText });
    return Boolean(r.data?.ok);
  },

  // AI extraction — returns suggestions, manager confirms which to actually persist.
  extractTasks: async (meetingId: string): Promise<{ tasks: ExtractedTaskSuggestion[] }> => {
    const r = await api.post(`/meetings/${meetingId}/extract-tasks`);
    return r.data;
  },
};
