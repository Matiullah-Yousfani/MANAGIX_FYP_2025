/** Normalize API payloads that may use PascalCase or camelCase. */
export function pick<T = string>(obj: any, ...keys: string[]): T | undefined {
  if (!obj) return undefined;
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k] as T;
  }
  return undefined;
}

export function normalizeProject(raw: any) {
  if (!raw) return null;
  return {
    projectId: String(pick(raw, 'projectId', 'ProjectId') ?? ''),
    title: String(pick(raw, 'title', 'Title') ?? 'Untitled project'),
    description: pick(raw, 'description', 'Description') ?? '',
    deadline: pick(raw, 'deadline', 'Deadline'),
    budget: Number(pick(raw, 'budget', 'Budget') ?? 0),
    managerId: String(pick(raw, 'managerId', 'ManagerId') ?? ''),
    status: pick(raw, 'status', 'Status') ?? 'Active',
    isClosed: Boolean(pick(raw, 'isClosed', 'IsClosed')),
    modelId: pick(raw, 'modelId', 'ModelId'),
  };
}

export function normalizeProjectList(raw: unknown) {
  const arr = Array.isArray(raw) ? raw : [];
  return arr.map(normalizeProject).filter(Boolean) as NonNullable<ReturnType<typeof normalizeProject>>[];
}

export function isMilestoneCompleted(status: string | undefined | null): boolean {
  return String(status ?? '').trim().toLowerCase() === 'completed';
}

export function normalizeWorkloadEntry(raw: any) {
  return {
    userId: String(pick(raw, 'userId', 'UserId') ?? ''),
    fullName: pick(raw, 'fullName', 'FullName') ?? 'Unknown',
    activeTaskCount: Number(pick(raw, 'activeTaskCount', 'ActiveTaskCount') ?? 0),
    assignedTaskCount: Number(pick(raw, 'assignedTaskCount', 'AssignedTaskCount') ?? 0),
    inProgressTaskCount: Number(pick(raw, 'inProgressTaskCount', 'InProgressTaskCount') ?? 0),
    totalEstimatedHours: Number(pick(raw, 'totalEstimatedHours', 'TotalEstimatedHours') ?? 0),
    capacityHours: Number(pick(raw, 'capacityHours', 'CapacityHours') ?? 40),
    utilizationPct: Number(pick(raw, 'utilizationPct', 'UtilizationPct') ?? 0),
    projectsAssigned: Number(pick(raw, 'projectsAssigned', 'ProjectsAssigned') ?? 0),
    clockedHoursThisWeek: Number(pick(raw, 'clockedHoursThisWeek', 'ClockedHoursThisWeek') ?? 0),
    usesClockedHours: Boolean(pick(raw, 'usesClockedHours', 'UsesClockedHours')),
  };
}

export function normalizeTimesheetSummary(raw: any) {
  if (!raw) return null;
  const open = raw.openEntry ?? raw.OpenEntry;
  return {
    totalHoursThisWeek: Number(pick(raw, 'totalHoursThisWeek', 'TotalHoursThisWeek') ?? 0),
    totalHoursAllTime: Number(pick(raw, 'totalHoursAllTime', 'TotalHoursAllTime') ?? 0),
    todayHours: Number(pick(raw, 'todayHours', 'TodayHours') ?? 0),
    standardHoursPerDay: Number(pick(raw, 'standardHoursPerDay', 'StandardHoursPerDay') ?? 8),
    dailyLimitHours: Number(pick(raw, 'dailyLimitHours', 'DailyLimitHours') ?? 10),
    isOnline: Boolean(pick(raw, 'isOnline', 'IsOnline')),
    pendingOvertimeRequestId: pick(raw, 'pendingOvertimeRequestId', 'PendingOvertimeRequestId') ?? null,
    openEntry: open
      ? {
          timeEntryId: pick(open, 'timeEntryId', 'TimeEntryId'),
          projectId: pick(open, 'projectId', 'ProjectId'),
          taskId: pick(open, 'taskId', 'TaskId'),
          startedAt: pick(open, 'startedAt', 'StartedAt'),
        }
      : null,
  };
}

export function normalizeInsights(raw: any) {
  if (!raw) return null;
  const projects = (raw.activeProjects ?? raw.ActiveProjects ?? []).map((p: any) => ({
    projectId: pick(p, 'projectId', 'ProjectId'),
    title: pick(p, 'title', 'Title'),
    assignedTasks: Number(pick(p, 'assignedTasks', 'AssignedTasks') ?? 0),
    completedTasks: Number(pick(p, 'completedTasks', 'CompletedTasks') ?? 0),
  }));
  return {
    employeeLevel: pick(raw, 'employeeLevel', 'EmployeeLevel') ?? 'Junior',
    completionRate: Number(pick(raw, 'completionRate', 'CompletionRate') ?? 0),
    totalLoggedHours: Number(pick(raw, 'totalLoggedHours', 'TotalLoggedHours') ?? 0),
    isOnline: Boolean(pick(raw, 'isOnline', 'IsOnline')),
    utilizationPct: Number(pick(raw, 'utilizationPct', 'UtilizationPct') ?? 0),
    activeWorkloadHours: Number(pick(raw, 'activeWorkloadHours', 'ActiveWorkloadHours') ?? 0),
    weeklyCapacityHours: Number(pick(raw, 'weeklyCapacityHours', 'WeeklyCapacityHours') ?? 40),
    activeProjects: projects,
    tasksCompleted: Number(pick(raw, 'tasksCompleted', 'TasksCompleted') ?? 0),
    tasksInProgress: Number(pick(raw, 'tasksInProgress', 'TasksInProgress') ?? 0),
    tasksPending: Number(pick(raw, 'tasksPending', 'TasksPending') ?? 0),
    totalTasksAssigned: Number(pick(raw, 'totalTasksAssigned', 'TotalTasksAssigned') ?? 0),
    fullName: pick(raw, 'fullName', 'FullName') ?? '',
    teams: (raw.teams ?? raw.Teams ?? []).map((t: any) => ({
      teamId: pick(t, 'teamId', 'TeamId'),
      teamName: pick(t, 'teamName', 'TeamName') ?? '',
      projectTitle: pick(t, 'projectTitle', 'ProjectTitle'),
      createdByName: pick(t, 'createdByName', 'CreatedByName'),
      members: (t.members ?? t.Members ?? []).map((m: any) => ({
        userId: pick(m, 'userId', 'UserId'),
        fullName: pick(m, 'fullName', 'FullName') ?? '',
        roleName: pick(m, 'roleName', 'RoleName') ?? 'Employee',
      })),
    })),
    taskDetails: (raw.taskDetails ?? raw.TaskDetails ?? []).map((t: any) => ({
      taskId: pick(t, 'taskId', 'TaskId'),
      title: pick(t, 'title', 'Title') ?? '',
      status: pick(t, 'status', 'Status') ?? '',
      priority: pick(t, 'priority', 'Priority'),
      projectTitle: pick(t, 'projectTitle', 'ProjectTitle'),
      milestoneTitle: pick(t, 'milestoneTitle', 'MilestoneTitle'),
    })),
    milestones: (raw.milestones ?? raw.Milestones ?? []).map((m: any) => ({
      milestoneId: pick(m, 'milestoneId', 'MilestoneId'),
      title: pick(m, 'title', 'Title') ?? '',
      status: pick(m, 'status', 'Status') ?? '',
      deadline: pick(m, 'deadline', 'Deadline'),
      totalTasks: Number(pick(m, 'totalTasks', 'TotalTasks') ?? 0),
      completedTasks: Number(pick(m, 'completedTasks', 'CompletedTasks') ?? 0),
    })),
  };
}

export function normalizeTimeline(raw: any) {
  if (!raw) return null;
  const milestones = (raw.milestones ?? raw.Milestones ?? []).map((m: any) => ({
    milestoneId: pick(m, 'milestoneId', 'MilestoneId'),
    title: pick(m, 'title', 'Title'),
    status: pick(m, 'status', 'Status'),
    progressPct: Number(pick(m, 'progressPct', 'ProgressPct') ?? 0),
    offsetPct: Number(pick(m, 'offsetPct', 'OffsetPct') ?? 0),
    widthPct: Number(pick(m, 'widthPct', 'WidthPct') ?? 0),
    totalTasks: Number(pick(m, 'totalTasks', 'TotalTasks') ?? 0),
    completedTasks: Number(pick(m, 'completedTasks', 'CompletedTasks') ?? 0),
    hasPendingReview: Boolean(pick(m, 'hasPendingReview', 'HasPendingReview')),
  }));
  return {
    projectId: pick(raw, 'projectId', 'ProjectId'),
    title: pick(raw, 'title', 'Title'),
    overallProgressPct: Number(pick(raw, 'overallProgressPct', 'OverallProgressPct') ?? 0),
    milestones,
  };
}

export function normalizeProjectWorkload(raw: any) {
  const members = (raw?.members ?? raw?.Members ?? []).map(normalizeWorkloadEntry);
  return {
    projectId: String(pick(raw, 'projectId', 'ProjectId') ?? ''),
    members,
    totalProjectHours: Number(pick(raw, 'totalProjectHours', 'TotalProjectHours') ?? 0),
    totalProjectCapacity: Number(pick(raw, 'totalProjectCapacity', 'TotalProjectCapacity') ?? 0),
    projectUtilizationPct: Number(pick(raw, 'projectUtilizationPct', 'ProjectUtilizationPct') ?? 0),
  };
}

export function normalizePayrollSummary(raw: any) {
  if (!raw) return null;
  const employees = (raw.employees ?? raw.Employees ?? []).map((e: any) => ({
    userId: pick(e, 'userId', 'UserId'),
    fullName: pick(e, 'fullName', 'FullName'),
    employeeLevel: pick(e, 'employeeLevel', 'EmployeeLevel'),
    loggedHours: Number(pick(e, 'loggedHours', 'LoggedHours') ?? 0),
    clockedHours: Number(pick(e, 'clockedHours', 'ClockedHours') ?? 0),
    hoursSource: pick(e, 'hoursSource', 'HoursSource') ?? 'Estimated',
    hourlyRate: Number(pick(e, 'hourlyRate', 'HourlyRate') ?? 0),
    estimatedCost: Number(pick(e, 'estimatedCost', 'EstimatedCost') ?? 0),
  }));
  return {
    projectTitle: pick(raw, 'projectTitle', 'ProjectTitle'),
    totalBudget: Number(pick(raw, 'totalBudget', 'TotalBudget') ?? 0),
    totalEstimatedLaborCost: Number(pick(raw, 'totalEstimatedLaborCost', 'TotalEstimatedLaborCost') ?? 0),
    budgetRemaining: Number(pick(raw, 'budgetRemaining', 'BudgetRemaining') ?? 0),
    employees,
  };
}
