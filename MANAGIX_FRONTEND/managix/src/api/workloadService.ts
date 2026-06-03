import api from './axiosInstance';
import type { WorkloadEntry } from '../types';
import { normalizeProjectWorkload, normalizeWorkloadEntry } from './normalize';

export interface ProjectWorkload {
  projectId: string;
  members: WorkloadEntry[];
  totalProjectHours: number;
  totalProjectCapacity: number;
  projectUtilizationPct: number;
}

export const workloadService = {
  getEmployee: async (userId: string): Promise<WorkloadEntry> => {
    const r = await api.get(`/workload/employee/${userId}`);
    return normalizeWorkloadEntry(r.data);
  },

  getProject: async (projectId: string): Promise<ProjectWorkload> => {
    const r = await api.get(`/workload/project/${projectId}`);
    return normalizeProjectWorkload(r.data);
  },

  getManagerTeam: async (managerId: string): Promise<WorkloadEntry[]> => {
    const r = await api.get(`/workload/manager/${managerId}`);
    const list = Array.isArray(r.data) ? r.data : [];
    return list.map(normalizeWorkloadEntry);
  },

  getOverloaded: async (threshold = 0.9, managerId?: string): Promise<WorkloadEntry[]> => {
    const params = new URLSearchParams({ threshold: String(threshold) });
    if (managerId) params.set('managerId', managerId);
    const r = await api.get(`/workload/overloaded?${params.toString()}`);
    const list = Array.isArray(r.data) ? r.data : [];
    return list.map(normalizeWorkloadEntry);
  },
};
