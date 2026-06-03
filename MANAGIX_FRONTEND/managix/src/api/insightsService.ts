import api from './axiosInstance';

export interface ManagerTeamMember {
  userId: string;
  fullName: string;
}

export const insightsService = {
  getEmployee: async (userId: string) => {
    const r = await api.get(`/insights/employee/${userId}`);
    return r.data;
  },

  getManagerTeamMembers: async (managerId: string): Promise<ManagerTeamMember[]> => {
    const r = await api.get(`/insights/manager/${managerId}/team`);
    const list = Array.isArray(r.data) ? r.data : [];
    return list.map((m: any) => ({
      userId: String(m.userId ?? m.UserId ?? ''),
      fullName: m.fullName ?? m.FullName ?? 'Member',
    }));
  },
};
