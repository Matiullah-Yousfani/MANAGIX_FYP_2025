// PHASE 4: Frontend wrapper for the notification endpoints.
import api from './axiosInstance';
import type { NotificationItem } from '../types';

export const notificationService = {
  // Latest notifications for the bell-icon dropdown.
  list: async (userId: string, limit = 25): Promise<NotificationItem[]> => {
    const r = await api.get(`/notifications`, { params: { userId, limit } });
    return r.data;
  },

  // Unread badge count — polled every 30s by the bell.
  unreadCount: async (userId: string): Promise<number> => {
    const r = await api.get(`/notifications/unread-count`, { params: { userId } });
    return Number(r.data?.unread ?? 0);
  },

  markRead: async (notificationId: string, userId: string) => {
    const r = await api.post(`/notifications/${notificationId}/read`, { userId });
    return Boolean(r.data?.ok);
  },

  markAllRead: async (userId: string) => {
    const r = await api.post(`/notifications/read-all`, { userId });
    return Number(r.data?.markedRead ?? 0);
  },
};
