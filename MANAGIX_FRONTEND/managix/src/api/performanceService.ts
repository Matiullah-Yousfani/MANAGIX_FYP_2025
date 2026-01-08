import api from './axiosInstance';

export const performanceService = {
  // We add employeeId here to satisfy your C# [HttpTrigger]
  generatePerformance: async (employeeId: string, projectId: string) => {
    const res = await api.post(`/performance/${employeeId}/${projectId}`, {}); 
    return res.data;
  },

 recalculateProject: async (projectId: string) => {
        const response = await api.post(`/performance/recalculate/${projectId}`);
        return response.data;
    },

    // Matches: [GET] /api/performance/project/{projectId}
    getProjectPerformance: async (projectId: string) => {
        const response = await api.get(`/performance/project/${projectId}`);
        return response.data;
    }

};