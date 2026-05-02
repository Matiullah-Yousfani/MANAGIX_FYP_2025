import { projectService, ProjectCreateRequest } from './projectService';

/** Thin aliases for manager flows — same routes as `projectService`. */
export const managerService = {
  createProject: async (projectData: ProjectCreateRequest) => {
    return projectService.create(projectData);
  },

  getManagerProjects: async (managerId: string) => {
    return projectService.getByManager(managerId);
  },
};
