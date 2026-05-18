// PHASE 3: Frontend wrapper for the workload endpoints.
// Mirrors the existing service file pattern (auth/aiService/projectService).
import api from './axiosInstance';
import type { WorkloadEntry } from '../types';

export interface ProjectWorkload {
  projectId: string;
  members: WorkloadEntry[];
  totalProjectHours: number;
  totalProjectCapacity: number;
  projectUtilizationPct: number;
}

export const workloadService = {
  // Single employee's load — used on Profile and dashboards.
  getEmployee: async (userId: string): Promise<WorkloadEntry> => {
    const r = await api.get(`/workload/employee/${userId}`);
    return r.data;
  },

  // Per-project breakdown for the manager view.
  getProject: async (projectId: string): Promise<ProjectWorkload> => {
    const r = await api.get(`/workload/project/${projectId}`);
    return r.data;
  },

  // Anyone over `threshold` (default 0.9 = 90% capacity).
  getOverloaded: async (threshold = 0.9): Promise<WorkloadEntry[]> => {
    const r = await api.get(`/workload/overloaded?threshold=${threshold}`);
    return r.data;
  },
};
