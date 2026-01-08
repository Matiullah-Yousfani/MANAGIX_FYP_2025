import api from "./axiosInstance";

export interface Milestone {
  milestoneId: string;
  projectId: string;
  title: string;
  description?: string;
  deadline: string;
  budgetAllocated: number;
  status: string;
  completedAt?: string | null;
}

export const milestoneService = {
  create: async (data: {
    projectId: string;
    title: string;
    description?: string;
    deadline: string;
    budgetAllocated: number;
  }) => {
    const response = await api.post("/milestones", data);
    return response.data;
  },

  update: async (
    milestoneId: string,
    data: {
      title: string;
      description?: string;
      deadline: string;
      budgetAllocated: number;
      status: string;
    }
  ) => {
    const response = await api.put(`/milestones/${milestoneId}`, data);
    return response.data;
  },

  delete: async (milestoneId: string) => {
    const response = await api.delete(`/milestones/${milestoneId}`);
    return response.data;
  },

  close: async (milestoneId: string, data?: { comment?: string }) => {
    const response = await api.post(
      `/milestones/${milestoneId}/close`,
      data ?? {}
    );
    return response.data;
  },

  getByProject: async (projectId: string) => {
    const response = await api.get(`/milestones/project/${projectId}`);
    return response.data as Milestone[];
  },

  getById: async (milestoneId: string) => {
    const response = await api.get(`/milestones/${milestoneId}`);
    return response.data as Milestone;
  }
};
