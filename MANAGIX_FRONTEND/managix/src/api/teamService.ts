import api from './axiosInstance';

/** `TeamCreateDto`: name, createdBy (manager user id). */
export interface TeamCreateRequest {
  name: string;
  createdBy: string;
}

export const teamService = {
  getAllTeams: async (managerId?: string) => {
    const res = await api.get('/teams', {
      params: managerId ? { managerId } : undefined,
    });
    return res.data;
  },

  createTeam: async (payload: TeamCreateRequest) => {
    const res = await api.post('/teams', payload);
    return res.data;
  },

  addEmployeeToTeam: async (teamId: string, employeeId: string) => {
    const res = await api.post(`/teams/${teamId}/add-employee`, { employeeId });
    return res.data;
  },

  assignTeamToProject: async (teamId: string, projectId: string) => {
    const res = await api.post(`/projects/${projectId}/assign-team`, { teamId });
    return res.data;
  },

  removeEmployeeFromTeam: async (teamId: string, employeeId: string) => {
    const res = await api.delete(`/teams/${teamId}/remove-employee`, {
      data: { employeeId },
    });
    return res.data;
  },

  getTeamMembers: async (teamId: string) => {
    const res = await api.get(`/teams/${teamId}/members`);
    return res.data;
  },

  deleteTeam: async (teamId: string) => {
    const res = await api.delete(`/teams/${teamId}`);
    return res.data;
  },
};
