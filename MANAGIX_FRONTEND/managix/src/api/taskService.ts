import api from "./axiosInstance";

/** `TaskCreateDto` */
export interface TaskCreateRequest {
  projectId: string;
  /** Required by backend validation */
  milestoneId: string;
  /** Omit for unassigned tasks (e.g. AI-generated until you assign on the Tasks page). */
  assignedEmployeeId?: string;
  title: string;
  description?: string;
  /** Usually omitted; backend forces new tasks to Todo */
  status?: string;
  estimatedHours?: number;
  priority?: string;
}

/** `TaskUpdateDto` */
export interface TaskUpdateRequest {
  title?: string;
  description?: string;
  /** Todo | InProgress | Done | Approved (QA) */
  status?: string;
  assignedEmployeeId?: string;
  /** Manager/admin: set true to leave task unassigned */
  clearAssignee?: boolean;
}

/** `TaskSubmissionDto` */
export interface TaskSubmissionRequest {
  fileBase64: string;
  fileName: string;
  comment?: string;
}

/** `QAReviewDto` */
export interface QAReviewRequest {
  qaComment: string;
}

export const taskService = {
  create: async (data: TaskCreateRequest) => {
    const response = await api.post("/tasks", data);
    return response.data;
  },

  update: async (taskId: string, data: TaskUpdateRequest) => {
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

  getByProject: async (projectId: string) => {
    const response = await api.get(`/tasks/project/${projectId}`);
    return response.data;
  },

  getById: async (taskId: string) => {
    const response = await api.get(`/tasks/${taskId}`);
    return response.data;
  },

  getAssignedToMe: async () => {
    const response = await api.get("/tasks/assigned-to-me");
    return response.data;
  },

  submit: async (taskId: string, body: TaskSubmissionRequest) => {
    const response = await api.post(`/tasks/${taskId}/submit`, body);
    return response.data;
  },

  getSubmission: async (taskId: string) => {
    const response = await api.get(`/tasks/${taskId}/submission`);
    return response.data;
  },

  getPendingReview: async () => {
    const response = await api.get("/tasks/pending-review");
    return response.data;
  },

  approve: async (taskId: string, qaComment: string = "") => {
    const response = await api.post(`/tasks/${taskId}/approve`, {
      qaComment,
    } satisfies QAReviewRequest);
    return response.data;
  },

  reject: async (taskId: string, qaComment: string) => {
    const response = await api.post(`/tasks/${taskId}/reject`, {
      qaComment,
    } satisfies QAReviewRequest);
    return response.data;
  },
};
