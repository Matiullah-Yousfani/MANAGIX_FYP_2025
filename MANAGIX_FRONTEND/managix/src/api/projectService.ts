import api from './axiosInstance';


export const projectService = {
  create: async (data: any) => {
    const response = await api.post("/projects", data);
    return response.data;
  },

  // Add this inside the projectService object in projectService.ts
assignTeamToProject: async (teamId: string, projectId: string) => {
    // This matches the route handleAssignToProject is calling
    const response = await api.post(`/projects/${projectId}/assign-team`, { teamId });
    return response.data;
},

  update: async (projectId: string, data: any) => {
    const response = await api.put(`/projects/${projectId}`, data);
    return response.data;
  },

  delete: async (projectId: string) => {
    const response = await api.delete(`/projects/${projectId}`);
    return response.data;
  },

  close: async (projectId: string, data: any) => {
    const response = await api.post(`/projects/${projectId}/close`, data);
    return response.data;
  },

  getAll: async () => {
    const response = await api.get("/projects");
    return response.data;
  },

  getById: async (projectId: string) => {
    const response = await api.get(`/projects/${projectId}`);
    return response.data;
  },

  getByManager: async (managerId: string) => {
    const response = await api.get(`/projects/manager/${managerId}`);
    return response.data;
  },

  
  getProjectDashboard: async (projectId: string) => {
    const response = await api.get(`/projects/${projectId}/dashboard`);
    return response.data;
  },

  getProjectsByTeam: async (teamId: string) => {
        const response = await api.get(`/projects/team/${teamId}`);
        return response.data;
    },
};
