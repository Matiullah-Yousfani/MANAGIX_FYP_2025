import api from './axiosInstance';

export const projectService = {
  create: async (data: any) => {
    const response = await api.post("/projects", data);
    return response.data;
  },

  assignTeamToProject: async (teamId: string, projectId: string) => {
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

  getByEmployee: async (userId: string) => {
    const response = await api.get(`/projects/employee/${userId}`);
    return response.data;
  },

  getProjectModels: async () => {
    const response = await api.get("/project-models");
    return response.data;
  },

  getTeamByProjectId: async (projectId: string) => {
    const response = await api.get(`/projects/${projectId}/team`);
    return response.data;
  },

  // ✅ New method: Fetch project + its team info together
  getProjectWithTeam: async (projectId: string) => {
    const [project, team] = await Promise.all([
      api.get(`/projects/${projectId}`),
      api.get(`/projects/${projectId}/team`)
    ]);

    return {
      project: project.data,
      team: team.data
    };
  },
};
