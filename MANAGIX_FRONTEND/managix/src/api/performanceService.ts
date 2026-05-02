import api from './axiosInstance';

export const performanceService = {
  recalculateProject: async (projectId: string) => {
    const response = await api.post(`/performance/recalculate/${projectId}`);
    return response.data;
  },

  getProjectPerformance: async (projectId: string) => {
    const response = await api.get(`/performance/project/${projectId}`);
    return response.data;
  },
};
