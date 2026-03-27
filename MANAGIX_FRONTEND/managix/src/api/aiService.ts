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

export const aiService = {
  suggestTeam: async (projectId: string): Promise<SuggestTeamResponse> => {
    const response = await api.post('/ai/suggest-team', { projectId });
    return response.data;
  },
  suggestEmployees: async (projectDescription: string): Promise<SuggestEmployeesResponse> => {
    const response = await api.post('/ai/suggest-employees', { projectDescription });
    return response.data;
  },
  suggestTaskAllocation: async (projectId: string): Promise<SuggestTaskAllocationResponse> => {
    const response = await api.post('/ai/suggest-task-allocation', { projectId });
    return response.data;
  },
};
