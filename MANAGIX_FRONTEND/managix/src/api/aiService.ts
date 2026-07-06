import api from './axiosInstance';

// Types
export interface TeamSuggestion {
  userId: string;
  name: string;
  role: string;
  reason: string;
  confidenceScore?: number;
  matchingSkills?: string[];
  activeTasks?: number;
  currentLoadHours?: number;
  experienceSummary?: string;
  isRecommendedForRole?: boolean;
}

export interface EmployeeRecommendation {
  userId: string;
  name: string;
  matchScore: number;
  reason: string;
}

export interface TaskAssignment {
  taskId: string;
  userId: string;
  taskTitle: string;
  employeeName: string;
  reason: string;
  confidence: number;
  taskDeadline?: string;
  suggestedDueDate?: string;
}

export interface SuggestTeamResponse {
  team: TeamSuggestion[];
}

export interface TeamPoolMember {
  userId: string;
  name: string;
  skills?: string[];
}

export interface TeamOption {
  label: string;
  suggestedTeamName?: string;
  team: TeamSuggestion[];
  isRecommended?: boolean;
  fitScore?: number;
}

export interface SuggestTeamOptionsResponse {
  options: TeamOption[];
  suggestedDeveloperCount?: number;
  availableQa?: TeamPoolMember[];
  availableEmployees?: TeamPoolMember[];
  availabilityMessage?: string;
}

export interface SuggestEmployeesResponse {
  recommendedEmployees: EmployeeRecommendation[];
}

export interface SuggestTaskAllocationResponse {
  taskAssignments: TaskAssignment[];
}

export interface TaskAllocationProject {
  projectId: string;
  title: string;
  unassignedTaskCount: number;
  hasTeam?: boolean;
}

export interface AiPlannerTask {
  title: string;
  description: string;
}

export interface AiPlannerMilestone {
  title: string;
  description: string;
  deadlineOffsetDays: number;
  budgetPercentage: number;
  tasks: AiPlannerTask[];
}

export interface GenerateProjectPlanResponse {
  suggestedMethodology?: string;
  methodologyRationale?: string;
  suggestedModelId?: string;
  milestones: AiPlannerMilestone[];
}

export const aiService = {
  suggestTeam: async (projectId: string): Promise<SuggestTeamResponse> => {
    const response = await api.post('/ai/suggest-team', { projectId });
    return response.data;
  },
  suggestTeamOptions: async (projectId: string): Promise<SuggestTeamOptionsResponse> => {
    const response = await api.post('/ai/suggest-team-options', { projectId });
    const data = response.data;
    const opts = data.options ?? data.Options ?? [];
    const mapPool = (list: any[] | undefined) =>
      (list ?? []).map((m: any) => ({
        userId: String(m.userId ?? m.UserId ?? ''),
        name: m.name ?? m.Name ?? '',
        skills: m.skills ?? m.Skills ?? [],
      }));

    return {
      suggestedDeveloperCount:
        data.suggestedDeveloperCount ?? data.SuggestedDeveloperCount,
      availableQa: mapPool(data.availableQa ?? data.AvailableQa),
      availableEmployees: mapPool(
        data.availableEmployees ?? data.AvailableEmployees
      ),
      options: opts.map((opt: any) => ({
        label: opt.label ?? opt.Label ?? 'Team option',
        suggestedTeamName: opt.suggestedTeamName ?? opt.SuggestedTeamName ?? opt.label ?? 'New Team',
        isRecommended: Boolean(opt.isRecommended ?? opt.IsRecommended),
        fitScore: opt.fitScore ?? opt.FitScore,
        team: (opt.team ?? opt.Team ?? []).map((m: any) => ({
          userId: String(m.userId ?? m.UserId ?? ''),
          name: m.name ?? m.Name ?? '',
          role: m.role ?? m.Role ?? 'Member',
          reason: m.reason ?? m.Reason ?? '',
        })),
      })),
    };
  },
  suggestEmployees: async (
    projectDescription: string,
    projectId?: string
  ): Promise<SuggestEmployeesResponse> => {
    const body: { projectDescription: string; projectId?: string } = { projectDescription };
    if (projectId) body.projectId = projectId;
    const response = await api.post('/ai/suggest-employees', body);
    return response.data;
  },
  getTaskAllocationProjects: async (managerId?: string): Promise<TaskAllocationProject[]> => {
    const response = await api.get('/ai/task-allocation-projects', {
      params: managerId ? { managerId } : undefined,
    });
    const data = Array.isArray(response.data) ? response.data : [];
    return data.map((p: any) => ({
      projectId: String(p.projectId ?? p.ProjectId ?? ''),
      title: p.title ?? p.Title ?? 'Untitled project',
      unassignedTaskCount: p.unassignedTaskCount ?? p.UnassignedTaskCount ?? 0,
      hasTeam: p.hasTeam ?? p.HasTeam ?? true,
    }));
  },

  suggestTaskAllocation: async (
    projectId: string,
    taskId?: string
  ): Promise<SuggestTaskAllocationResponse> => {
    const body: { projectId: string; taskId?: string } = { projectId };
    if (taskId) body.taskId = taskId;
    const response = await api.post('/ai/suggest-task-allocation', body);
    const data = response.data;
    const list = data.taskAssignments ?? data.TaskAssignments ?? [];
    return {
      taskAssignments: list.map((a: any) => ({
        taskId: String(a.taskId ?? a.TaskId ?? ''),
        userId: String(a.userId ?? a.UserId ?? ''),
        taskTitle: a.taskTitle ?? a.TaskTitle ?? '',
        employeeName: a.employeeName ?? a.EmployeeName ?? '',
        reason: a.reason ?? a.Reason ?? '',
        confidence: a.confidence ?? a.Confidence ?? 0,
      })),
    };
  },

  applyTaskAssignments: async (projectId: string, taskAssignments: TaskAssignment[]) => {
    const response = await api.post('/ai/apply-task-assignments', {
      projectId,
      taskAssignments,
    });
    return response.data;
  },

  generateProjectPlan: async (body: {
    projectName: string;
    projectDescription: string;
    deadline: string;
    budget: number;
  }): Promise<GenerateProjectPlanResponse> => {
    const response = await api.post('/ai/generate-project-plan', body);
    return response.data;
  },
};
