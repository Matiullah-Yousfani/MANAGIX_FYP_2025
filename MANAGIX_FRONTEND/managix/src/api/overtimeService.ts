import api from './axiosInstance';

export const overtimeService = {
  get: async (requestId: string) => {
    const r = await api.get(`/overtime/${requestId}`);
    return r.data;
  },
  submitReason: async (requestId: string, reason: string) => {
    const r = await api.post(`/overtime/${requestId}/reason`, { reason });
    return r.data;
  },
  resolve: async (
    requestId: string,
    body: {
      action: 'ExtendDeadline' | 'Reassign';
      newDeadline?: string;
      newAssigneeId?: string;
      additionalEstimatedHours?: number;
    }
  ) => {
    const r = await api.post(`/overtime/${requestId}/resolve`, body);
    return r.data;
  },
};
