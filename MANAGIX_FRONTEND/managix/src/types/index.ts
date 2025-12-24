export type Role = 'Manager' | 'Employee' | 'QA';

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: Role;
}

export interface Project {
  projectId: string; // From your Guid
  title: string;
  description: string;
  deadline: string; // ISO String from DateTime
  budget: number;
  status: string; // "New", "Completed", etc.
  isClosed: boolean;
  createdAt: string;
}

export interface ProjectDashboard {
  projectId: string;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  totalMilestones: number;
  completedMilestones: number;
  progressPercentage: number;
}