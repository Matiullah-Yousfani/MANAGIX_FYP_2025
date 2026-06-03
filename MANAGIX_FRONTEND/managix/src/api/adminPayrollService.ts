import api from './axiosInstance';

export const adminPayrollService = {
  listUsers: async () => {
    const r = await api.get('/management/payroll-settings/users');
    return r.data;
  },
  updateUser: async (userId: string, body: Record<string, unknown>) => {
    const r = await api.put(`/management/payroll-settings/users/${userId}`, body);
    return r.data;
  },
};
