import api from "./axiosInstance";

export const qaService = {
  getPendingTasks: async () => {
    const res = await api.get("/tasks/pending-review");
    return res.data;
  },

  approveTask: async (taskId: string, qaComment: string = "") => {
    const res = await api.post(`/tasks/${taskId}/approve`, { qaComment });
    return res.data;
  },

  rejectTask: async (taskId: string, qaComment: string) => {
    const res = await api.post(`/tasks/${taskId}/reject`, { qaComment });
    return res.data;
  },
};
