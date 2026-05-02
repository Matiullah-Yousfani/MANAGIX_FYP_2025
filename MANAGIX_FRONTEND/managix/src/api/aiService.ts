import api from './axiosInstance';

// Types
export interface TeamSuggestion {
  userId: string;
  name: string;
  role: string;
  reason: string;
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
}

export interface SuggestTeamResponse {
  team: TeamSuggestion[];
}

export interface SuggestEmployeesResponse {
  recommendedEmployees: EmployeeRecommendation[];
}

export interface SuggestTaskAllocationResponse {
  taskAssignments: TaskAssignment[];
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
  suggestEmployees: async (
    projectDescription: string,
    projectId?: string
  ): Promise<SuggestEmployeesResponse> => {
    const body: { projectDescription: string; projectId?: string } = { projectDescription };
    if (projectId) body.projectId = projectId;
    const response = await api.post('/ai/suggest-employees', body);
    return response.data;
  },
  suggestTaskAllocation: async (projectId: string): Promise<SuggestTaskAllocationResponse> => {
    const response = await api.post('/ai/suggest-task-allocation', { projectId });
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
