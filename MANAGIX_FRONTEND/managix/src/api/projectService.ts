import api from './axiosInstance';
import { normalizeProject, normalizeProjectList, normalizeTimeline } from './normalize';

/** `ProjectCreateDto` — use camelCase for JSON. deadline as ISO string. */
export interface ProjectCreateRequest {
  title: string;
  description?: string;
  deadline: string;
  managerId: string;
  budget: number;
  modelId: string;
}

export const projectService = {
  create: async (data: ProjectCreateRequest) => {
    const response = await api.post('/projects', data);
    return response.data;
  },

  assignTeamToProject: async (teamId: string, projectId: string) => {
    const response = await api.post(`/projects/${projectId}/assign-team`, { teamId });
    return response.data;
  },

  update: async (projectId: string, data: Partial<ProjectCreateRequest>) => {
    const response = await api.put(`/projects/${projectId}`, data);
    return response.data;
  },

  delete: async (projectId: string) => {
    const response = await api.delete(`/projects/${projectId}`);
    return response.data;
  },

  /** `CloseProjectDto`: optional comment */
  close: async (projectId: string, data?: { comment?: string }) => {
    const response = await api.post(`/projects/${projectId}/close`, data ?? {});
    return response.data;
  },

  getAll: async () => {
    const response = await api.get('/projects');
    return normalizeProjectList(response.data);
  },

  getById: async (projectId: string) => {
    const response = await api.get(`/projects/${projectId}`);
    return normalizeProject(response.data);
  },

  getByManager: async (managerId: string) => {
    const response = await api.get(`/projects/manager/${managerId}`);
    return normalizeProjectList(response.data);
  },

  getProjectDashboard: async (projectId: string) => {
    const response = await api.get(`/projects/${projectId}/dashboard`);
    return response.data;
  },

  getByEmployee: async (userId: string) => {
    const response = await api.get(`/projects/employee/${userId}`);
    return normalizeProjectList(response.data);
  },

  getProjectModels: async () => {
    const response = await api.get('/project-models');
    return response.data;
  },

  getTeamByProjectId: async (projectId: string) => {
    const response = await api.get(`/projects/${projectId}/team`);
    return response.data;
  },

  getProjectWithTeam: async (projectId: string) => {
    const [project, team] = await Promise.all([
      api.get(`/projects/${projectId}`),
      api.get(`/projects/${projectId}/team`).catch(() => ({ data: null })),
    ]);
    return { project: project.data, team: team.data };
  },

  getClosureReport: async (projectId: string) => {
    const response = await api.get(`/projects/${projectId}/closure-report`);
    return response.data;
  },

  getTimeline: async (projectId: string) => {
    const response = await api.get(`/projects/${projectId}/timeline`);
    return normalizeTimeline(response.data);
  },

  getAdminDetail: async (projectId: string) => {
    const response = await api.get(`/projects/admin/${projectId}`);
    return response.data;
  },
};
