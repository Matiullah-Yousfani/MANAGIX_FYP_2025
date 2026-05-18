// PHASE 5: Frontend wrapper for admin-monitoring endpoints.
import api from './axiosInstance';

export interface SystemHealth {
  activeProjects: number;
  overdueProjects: number;
  avgUtilization: number;
  overloadedCount: number;
  blockedTaskCount: number;
  topOverloaded: { userId: string; fullName: string; utilizationPct: number; totalEstimatedHours: number }[];
  methodologyBreakdown: Record<string, number>;
}

export interface ProjectHealth {
  projectId: string;
  title: string;
  methodology?: string | null;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  onTimeRatio: number;
  avgUtilization: number;
  overloadedMembers: number;
  milestonesTotal: number;
  milestonesCompleted: number;
  deadline?: string | null;
  isOverdue: boolean;
  aiRiskSummary?: string | null;
}

export const monitoringService = {
  // Routes don't start with "admin/" — that prefix is reserved by Azure Functions runtime.
  // Role-gating happens client-side in MonitoringPanel.tsx.
  system: async (): Promise<SystemHealth> => {
    const r = await api.get('/monitoring/system');
    return r.data;
  },
  project: async (projectId: string): Promise<ProjectHealth> => {
    const r = await api.get(`/monitoring/project/${projectId}`);
    return r.data;
  },
};
