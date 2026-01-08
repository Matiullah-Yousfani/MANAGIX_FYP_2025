import api from "./axiosInstance";

export const qaService = {
  getPendingTasks: async () => {
    const res = await api.get("/tasks/pending-review");
    return res.data;
  },

  approveTask: async (taskId: string) => {
    const res = await api.post(`/tasks/${taskId}/approve`);
    return res.data;
  },

  rejectTask: async (taskId: string, comment: string) => {
    const res = await api.post(`/tasks/${taskId}/reject`, { comment });
    return res.data;
  }
};
