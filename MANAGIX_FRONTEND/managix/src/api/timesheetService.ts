import api from './axiosInstance';
import { normalizeTimesheetSummary } from './normalize';

export const timesheetService = {
  heartbeat: async (userId: string) => {
    const r = await api.post(`/timesheet/heartbeat/${userId}`);
    return r.data;
  },
  clockIn: async (body: { userId: string; projectId?: string; taskId?: string }) => {
    const r = await api.post('/timesheet/clock-in', {
      userId: body.userId,
      projectId: body.projectId || undefined,
      taskId: body.taskId || undefined,
    });
    return r.data;
  },
  clockOut: async (userId: string) => {
    const r = await api.post(`/timesheet/clock-out/${userId}`);
    return r.data;
  },
  summary: async (userId: string) => {
    const r = await api.get(`/timesheet/summary/${userId}`);
    return normalizeTimesheetSummary(r.data);
  },
  today: async (userId: string) => {
    const r = await api.get(`/timesheet/today/${userId}`);
    return r.data;
  },
  getPolicy: async () => {
    const r = await api.get('/timesheet/policy');
    return r.data;
  },
  updatePolicy: async (body: {
    standardHoursPerDay: number;
    overtimeGraceHours: number;
    dailyMaxHours: number;
  }) => {
    const r = await api.put('/timesheet/policy', body);
    return r.data;
  },
  submitDaily: async (body: {
    userId: string;
    employeeNote?: string;
    overtimeReason?: string;
    workDate?: string;
  }) => {
    const r = await api.post('/timesheet/submit', body);
    return r.data;
  },
  reviewDaily: async (dailyTimesheetId: string, body: { approve: boolean; managerComment?: string }) => {
    const r = await api.post(`/timesheet/review/${dailyTimesheetId}`, body);
    return r.data;
  },
  listAdmin: async () => {
    const r = await api.get('/timesheet/admin/all');
    return r.data;
  },
  listManager: async (managerId: string) => {
    const r = await api.get(`/timesheet/manager/${managerId}`);
    return r.data;
  },
};
