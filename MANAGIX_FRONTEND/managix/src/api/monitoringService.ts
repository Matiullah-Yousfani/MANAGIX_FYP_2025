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
  dashboard: async (): Promise<AdminDashboard> => {
    const r = await api.get('/monitoring/dashboard');
    return normalizeAdminDashboard(r.data);
  },
  project: async (projectId: string): Promise<ProjectHealth> => {
    const r = await api.get(`/monitoring/project/${projectId}`);
    return r.data;
  },
};

export interface AdminDashboard {
  overview: {
    totalUsers: number;
    managers: number;
    employees: number;
    qa: number;
    admins: number;
    activeProjects: number;
    completedProjects: number;
    pendingTasks: number;
    todaysMeetings: number;
    overdueProjects: number;
    overloadedEmployees: number;
    blockedTasks: number;
  };
  userDistribution: Record<string, number>;
  projectStatus: Record<string, number>;
  taskStatus: Record<string, number>;
  employeeWorkload: {
    userId: string;
    fullName: string;
    currentTasks: number;
    completedTasks: number;
    hoursThisWeek: number;
    workloadStatus: string;
    utilizationPct: number;
  }[];
  managerPerformance: {
    managerId: string;
    fullName: string;
    projects: number;
    delayed: number;
    completed: number;
    averageProgress: number;
  }[];
  qaPerformance: {
    qaId: string;
    fullName: string;
    pendingReviews: number;
    approved: number;
    rejected: number;
    averageReviewHours: number | null;
  }[];
  meetingAnalytics: {
    todaysMeetings: number;
    upcoming: number;
    completed: number;
    cancelled: number;
    attendanceRate: number;
  };
  timesheetAnalytics: {
    clockedInNow: number;
    submittedToday: number;
    pendingApproval: number;
    averageHoursToday: number;
    weeklyHours: number;
  };
  aiAnalytics: {
    aiAssistedMilestones: number;
    aiScoredTasks: number;
    projectsWithTeams: number;
    assignedAiTasks: number;
  };
  pendingApprovals: {
    pendingUsers: number;
    pendingTimesheets: number;
    pendingQaReviews: number;
    pendingProjectClosures: number;
  };
  recentActivity: { at: string; type: string; title: string; body?: string }[];
  systemAlerts: { severity: string; message: string; actionLink?: string }[];
  tasksCompletedPerWeek: { weekLabel: string; completed: number }[];
  hoursWorkedPerWeek: { weekLabel: string; hours: number }[];
  projectHealthRows: {
    projectId: string;
    title: string;
    isClosed: boolean;
    isOverdue: boolean;
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    pendingTasks: number;
    progressPct: number;
    deadline?: string | null;
    milestonesCompleted: number;
    milestonesTotal: number;
    methodology?: string | null;
  }[];
  taskRows: {
    taskId: string;
    title: string;
    status: string;
    displayStatus: string;
    projectId: string;
    projectTitle: string;
    assigneeName?: string | null;
    deadline?: string | null;
    priority?: string | null;
  }[];
  userRows: {
    userId: string;
    fullName: string;
    email: string;
    role: string;
    status: string;
  }[];
}

function pick<T>(obj: Record<string, unknown> | null | undefined, ...keys: string[]): T | undefined {
  if (!obj) return undefined;
  for (const k of keys) {
    if (obj[k] != null) return obj[k] as T;
  }
  return undefined;
}

function normalizeRecord(raw: Record<string, unknown> | undefined): Record<string, number> {
  if (!raw) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw)) {
    out[k] = Number(v) || 0;
  }
  return out;
}

function normalizeTaskRows(raw: unknown[]): AdminDashboard['taskRows'] {
  return (raw ?? []).map((t: any) => ({
    taskId: String(t.taskId ?? t.TaskId ?? ''),
    title: t.title ?? t.Title ?? '',
    status: t.status ?? t.Status ?? '',
    displayStatus: t.displayStatus ?? t.DisplayStatus ?? t.status ?? t.Status ?? '',
    projectId: String(t.projectId ?? t.ProjectId ?? ''),
    projectTitle: t.projectTitle ?? t.ProjectTitle ?? '',
    assigneeName: t.assigneeName ?? t.AssigneeName ?? null,
    deadline: t.deadline ?? t.Deadline ?? null,
    priority: t.priority ?? t.Priority ?? null,
  }));
}

function normalizeUserRows(raw: unknown[]): AdminDashboard['userRows'] {
  return (raw ?? []).map((u: any) => ({
    userId: String(u.userId ?? u.UserId ?? ''),
    fullName: u.fullName ?? u.FullName ?? '',
    email: u.email ?? u.Email ?? '',
    role: u.role ?? u.Role ?? 'Other',
    status: u.status ?? u.Status ?? 'Active',
  }));
}

function normalizeProjectRows(raw: unknown[]): AdminDashboard['projectHealthRows'] {
  return (raw ?? []).map((p: any) => ({
    projectId: String(p.projectId ?? p.ProjectId ?? ''),
    title: p.title ?? p.Title ?? '',
    isClosed: Boolean(p.isClosed ?? p.IsClosed),
    isOverdue: Boolean(p.isOverdue ?? p.IsOverdue),
    totalTasks: Number(p.totalTasks ?? p.TotalTasks ?? 0),
    completedTasks: Number(p.completedTasks ?? p.CompletedTasks ?? 0),
    inProgressTasks: Number(p.inProgressTasks ?? p.InProgressTasks ?? 0),
    pendingTasks: Number(p.pendingTasks ?? p.PendingTasks ?? 0),
    progressPct: Number(p.progressPct ?? p.ProgressPct ?? 0),
    deadline: p.deadline ?? p.Deadline ?? null,
    milestonesCompleted: Number(p.milestonesCompleted ?? p.MilestonesCompleted ?? 0),
    milestonesTotal: Number(p.milestonesTotal ?? p.MilestonesTotal ?? 0),
    methodology: p.methodology ?? p.Methodology ?? null,
  }));
}

/** Defensive normalizer — handles camelCase API and legacy PascalCase payloads. */
export function normalizeAdminDashboard(raw: any): AdminDashboard {
  const o = pick<Record<string, unknown>>(raw, 'overview', 'Overview') ?? {};
  const pa = pick<Record<string, unknown>>(raw, 'pendingApprovals', 'PendingApprovals') ?? {};
  return {
    overview: {
      totalUsers: Number(o.totalUsers ?? o.TotalUsers ?? 0),
      managers: Number(o.managers ?? o.Managers ?? 0),
      employees: Number(o.employees ?? o.Employees ?? 0),
      qa: Number(o.qa ?? o.Qa ?? 0),
      admins: Number(o.admins ?? o.Admins ?? 0),
      activeProjects: Number(o.activeProjects ?? o.ActiveProjects ?? 0),
      completedProjects: Number(o.completedProjects ?? o.CompletedProjects ?? 0),
      pendingTasks: Number(o.pendingTasks ?? o.PendingTasks ?? 0),
      todaysMeetings: Number(o.todaysMeetings ?? o.TodaysMeetings ?? 0),
      overdueProjects: Number(o.overdueProjects ?? o.OverdueProjects ?? 0),
      overloadedEmployees: Number(o.overloadedEmployees ?? o.OverloadedEmployees ?? 0),
      blockedTasks: Number(o.blockedTasks ?? o.BlockedTasks ?? 0),
    },
    userDistribution: normalizeRecord(pick(raw, 'userDistribution', 'UserDistribution')),
    projectStatus: normalizeRecord(pick(raw, 'projectStatus', 'ProjectStatus')),
    taskStatus: normalizeRecord(pick(raw, 'taskStatus', 'TaskStatus')),
    employeeWorkload: pick(raw, 'employeeWorkload', 'EmployeeWorkload') ?? [],
    managerPerformance: pick(raw, 'managerPerformance', 'ManagerPerformance') ?? [],
    qaPerformance: pick(raw, 'qaPerformance', 'QaPerformance') ?? [],
    meetingAnalytics: pick(raw, 'meetingAnalytics', 'MeetingAnalytics') ?? {
      todaysMeetings: 0, upcoming: 0, completed: 0, cancelled: 0, attendanceRate: 0,
    },
    timesheetAnalytics: pick(raw, 'timesheetAnalytics', 'TimesheetAnalytics') ?? {
      clockedInNow: 0, submittedToday: 0, pendingApproval: 0, averageHoursToday: 0, weeklyHours: 0,
    },
    aiAnalytics: pick(raw, 'aiAnalytics', 'AiAnalytics') ?? {
      aiAssistedMilestones: 0, aiScoredTasks: 0, projectsWithTeams: 0, assignedAiTasks: 0,
    },
    pendingApprovals: {
      pendingUsers: Number(pa.pendingUsers ?? pa.PendingUsers ?? 0),
      pendingTimesheets: Number(pa.pendingTimesheets ?? pa.PendingTimesheets ?? 0),
      pendingQaReviews: Number(pa.pendingQaReviews ?? pa.PendingQaReviews ?? 0),
      pendingProjectClosures: Number(pa.pendingProjectClosures ?? pa.PendingProjectClosures ?? 0),
    },
    recentActivity: pick(raw, 'recentActivity', 'RecentActivity') ?? [],
    systemAlerts: pick(raw, 'systemAlerts', 'SystemAlerts') ?? [],
    tasksCompletedPerWeek: pick(raw, 'tasksCompletedPerWeek', 'TasksCompletedPerWeek') ?? [],
    hoursWorkedPerWeek: pick(raw, 'hoursWorkedPerWeek', 'HoursWorkedPerWeek') ?? [],
    projectHealthRows: normalizeProjectRows(pick(raw, 'projectHealthRows', 'ProjectHealthRows') ?? []),
    taskRows: normalizeTaskRows(pick(raw, 'taskRows', 'TaskRows') ?? []),
    userRows: normalizeUserRows(pick(raw, 'userRows', 'UserRows') ?? []),
  };
}
