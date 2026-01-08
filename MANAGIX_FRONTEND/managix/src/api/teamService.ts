import api from './axiosInstance';

export const teamService = {
  getAllTeams: async () => {
    const res = await api.get('/teams');
    return res.data;
  },
  createTeam: async (name: string) => {
    const res = await api.post('/teams', { name });
    return res.data;
  },
  addEmployeeToTeam: async (teamId: string, employeeId: string) => {
    // Matches: [POST] /api/teams/{teamId}/add-employee
    const res = await api.post(`/teams/${teamId}/add-employee`, { employeeId });
    return res.data;
  },
  

  
assignTeamToProject: async (teamId: string, projectId: string) => {
  // FIXED: Matches [POST] http://localhost:7005/api/projects/{projectId}/assign-team
  // Usually, the TeamId is sent in the request body for this specific route structure
  const res = await api.post(`/projects/${projectId}/assign-team`, { teamId });
  return res.data;
},

removeEmployeeFromTeam: async (teamId: string, employeeId: string) => {
  const res = await api.delete(`/teams/${teamId}/remove-employee`, {
    data: { employeeId } // Axios requires 'data' key for body in DELETE requests
  });
  return res.data;
},

// ADD THIS PROPERLY HERE:
  getTeamMembers: async (teamId: string) => {
    const res = await api.get(`/teams/${teamId}/members`);
    return res.data;
  }


};