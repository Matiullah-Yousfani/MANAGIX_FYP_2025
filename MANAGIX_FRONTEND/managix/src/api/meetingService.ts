import api from './axiosInstance';
import type { Meeting, ExtractedTaskSuggestion, MeetingJoinStatus } from '../types';

export interface MeetingCreateInput {
  projectId: string;
  title: string;
  description?: string;
  scheduledAt: string;
  endsAt?: string;
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

  activeForUser: async (userId: string): Promise<Meeting[]> => {
    const r = await api.get(`/meetings/user/${userId}/active`);
    return r.data;
  },

  historyForUser: async (userId: string): Promise<Meeting[]> => {
    const r = await api.get(`/meetings/user/${userId}/history`);
    return r.data;
  },

  conductedForManager: async (managerId: string): Promise<Meeting[]> => {
    const r = await api.get(`/meetings/manager/${managerId}/conducted`);
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

  sprintPreview: async (projectId: string, scheduledAtIso: string): Promise<{ sprintNumber: number; projectWeek: number }> => {
    const r = await api.get(`/meetings/project/${projectId}/sprint-preview`, {
      params: { at: scheduledAtIso },
    });
    return r.data;
  },

  saveParticipantTranscript: async (meetingId: string, userId: string, transcriptText: string): Promise<boolean> => {
    const r = await api.post(`/meetings/${meetingId}/participant-transcript`, { userId, transcriptText });
    return Boolean(r.data?.ok);
  },

  getParticipantTranscripts: async (meetingId: string) => {
    const r = await api.get(`/meetings/${meetingId}/participant-transcripts`);
    return r.data;
  },

  analyzeMeeting: async (meetingId: string, requestedBy?: string) => {
    const r = await api.post(`/meetings/${meetingId}/analyze`, { requestedBy });
    return r.data;
  },

  verifyJoinCode: async (meetingId: string, userId: string, joinCode: string): Promise<boolean> => {
    const r = await api.post(`/meetings/${meetingId}/verify-code`, { userId, joinCode });
    return Boolean(r.data?.ok);
  },

  getParticipantRoster: async (meetingId: string): Promise<Array<{ userId: string; userName: string; role?: string }>> => {
    const r = await api.get(`/meetings/${meetingId}/participant-roster`);
    return r.data ?? [];
  },

  tryFinalize: async (meetingId: string, requestedBy?: string) => {
    const r = await api.post(`/meetings/${meetingId}/finalize`, { requestedBy });
    return r.status === 204 ? null : r.data;
  },
};
