import api from './axiosInstance';

export const managerService = {
  createProject: async (projectData: any) => {
    const res = await api.post('/projects', projectData);
    return res.data;
  },
  
  // This helps 'snow' see their specific projects
  getManagerProjects: async (managerId: string) => {
    const res = await api.get(`/projects/manager/${managerId}`);
    return res.data;
  }
};