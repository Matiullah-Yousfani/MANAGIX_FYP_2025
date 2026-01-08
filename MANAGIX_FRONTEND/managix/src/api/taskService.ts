import api from "./axiosInstance";

export const taskService = {

  // ✅ CREATE task
  create: async (data: any) => {
    const response = await api.post("/tasks", data);
    return response.data;
  },

  update: async (taskId: string, data: any) => {
    const response = await api.put(`/tasks/${taskId}`, data);
    return response.data;
  },

  delete: async (taskId: string) => {
    const response = await api.delete(`/tasks/${taskId}`);
    return response.data;
  },

  getByMilestone: async (milestoneId: string) => {
    const response = await api.get(`/tasks/milestone/${milestoneId}`);
    return response.data;
  },

  getById: async (taskId: string) => {
    const response = await api.get(`/tasks/${taskId}`);
    return response.data;
  },
};
