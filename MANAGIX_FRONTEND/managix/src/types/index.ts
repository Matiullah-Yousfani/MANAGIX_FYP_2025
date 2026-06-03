export type Role = 'Manager' | 'Employee' | 'QA' | 'Admin';

// PHASE 2: methodology classification — drives the dashboard variant chosen at render time.
export type Methodology = 'Agile' | 'Scrum' | 'Kanban' | 'Waterfall' | 'Hybrid' | string;

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: Role;
}

export interface ProjectModelRef {
  modelId: string;
  modelName: string;
  methodology?: Methodology | null;
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
  // PHASE 2: optional because legacy responses may not include it.
  modelId?: string;
  projectModel?: ProjectModelRef | null;
  ProjectModel?: ProjectModelRef | null; // tolerate PascalCase from older endpoints
}

// PHASE 0 / PHASE 4: notifications shown in the bell-icon dropdown.
export interface NotificationItem {
  notificationId: string;
  userId: string;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

// PHASE 3: per-employee workload payload used by the workload panel + dashboards.
export interface WorkloadEntry {
  userId: string;
  fullName?: string;
  activeTaskCount: number;
  totalEstimatedHours: number;
  capacityHours: number;
  utilizationPct: number; // 0..1+ — values > 1 mean over capacity
  projectsAssigned: number;
  clockedHoursThisWeek?: number;
  usesClockedHours?: boolean;
}

// PHASE 4: meeting record (also used to drive the AI task-extraction modal).
export interface Meeting {
  meetingId: string;
  projectId?: string | null;
  title: string;
  description?: string | null;
  scheduledAt: string;
  endsAt?: string;
  durationMinutes: number;
  meetingLink?: string | null;
  jitsiRoomName?: string | null;
  createdBy: string;
  status: 'Scheduled' | 'Live' | 'Completed' | 'Cancelled' | 'Expired' | string;
  transcriptText?: string | null;
  participants?: string[];
  joinState?: 'BeforeStart' | 'Active' | 'Expired' | string;
  canJoin?: boolean;
}

export interface MeetingJoinStatus {
  meetingId: string;
  title: string;
  scheduledAt: string;
  endsAt: string;
  status: string;
  joinState: 'BeforeStart' | 'Active' | 'Expired' | string;
  canJoin: boolean;
  isParticipant: boolean;
  meetingLink?: string | null;
  jitsiRoomName?: string | null;
}

// PHASE 4: shape returned by the meeting-task-extraction endpoint (one row per suggested task).
export interface ExtractedTaskSuggestion {
  title: string;
  description?: string;
  suggestedAssigneeUserId?: string;
  suggestedAssigneeName?: string;
  estimatedHours?: number;
  priority?: 'Low' | 'Medium' | 'High' | 'Critical' | string;
  requiredSkills?: string[];
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

// PHASE 2: helper to resolve methodology from any project shape.
// Tolerant of casing on BOTH the wrapper key (projectModel vs ProjectModel) AND the leaf
// (methodology vs Methodology). The Azure Functions `WriteAsJsonAsync` returns PascalCase,
// the bare /properties returns camelCase — handle both rather than fight either.
export function getMethodology(p?: any): Methodology {
  const wrapper = p?.projectModel ?? p?.ProjectModel ?? null;
  if (!wrapper) return 'Hybrid';
  const m = wrapper.methodology ?? wrapper.Methodology ?? wrapper.modelName ?? wrapper.ModelName ?? null;
  if (!m) return 'Hybrid';
  const norm = String(m).toLowerCase();
  if (norm.includes('scrum')) return 'Scrum';
  if (norm.includes('kanban')) return 'Kanban';
  if (norm.includes('waterfall')) return 'Waterfall';
  if (norm.includes('agile')) return 'Agile';
  return 'Hybrid';
}