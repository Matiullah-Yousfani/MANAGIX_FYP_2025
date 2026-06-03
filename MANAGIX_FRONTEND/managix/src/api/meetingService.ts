import api from './axiosInstance';
import type { Meeting, ExtractedTaskSuggestion, MeetingJoinStatus } from '../types';

export interface MeetingCreateInput {
  projectId: string;
  title: string;
  description?: string;
  scheduledAt: string;
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

  joinStatus: async (meetingId: string, userId: string): Promise<MeetingJoinStatus> => {
    const r = await api.get(`/meetings/${meetingId}/join-status/${userId}`);
    return r.data;
  },

  resolveParticipants: async (projectId: string): Promise<string[]> => {
    const r = await api.get(`/meetings/project/${projectId}/participants`);
    return r.data?.participantUserIds ?? [];
  },

  byProject: async (projectId: string): Promise<Meeting[]> => {
    const r = await api.get(`/meetings/project/${projectId}`);
    return r.data;
  },

  upcomingForUser: async (userId: string): Promise<Meeting[]> => {
    const r = await api.get(`/meetings/user/${userId}/upcoming`);
    return r.data;
  },

  completeWithTranscript: async (meetingId: string, transcriptText: string): Promise<boolean> => {
    const r = await api.post(`/meetings/${meetingId}/complete`, { transcriptText });
    return Boolean(r.data?.ok);
  },

  extractTasks: async (meetingId: string): Promise<{ tasks: ExtractedTaskSuggestion[] }> => {
    const r = await api.post(`/meetings/${meetingId}/extract-tasks`);
    return r.data;
  },
};
