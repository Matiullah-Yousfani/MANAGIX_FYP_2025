using MANAGIX.DataAccess.Repositories.IRepositories;
using MANAGIX.Models.DTO;
using MANAGIX.Utility;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace MANAGIX.Services
{
    // PHASE 5: Aggregation only — no new SQL. Uses existing repos + WorkloadService.
    //
    // Definitions:
    //   • Active project   = !IsClosed
    //   • Overdue project  = !IsClosed AND Deadline < UtcNow AND not all tasks done
    //   • Blocked task     = Status == "InProgress" AND CreatedAt < UtcNow.AddDays(-7)
    //                        (heuristic: stuck > 1 week without moving to Done)
    //   • Overloaded       = utilisation >= 0.9
    public class MonitoringService : IMonitoringService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IWorkloadService _workload;

        public MonitoringService(IUnitOfWork unitOfWork, IWorkloadService workload)
        {
            _unitOfWork = unitOfWork;
            _workload = workload;
        }

        public async Task<SystemHealthDto> GetSystemHealthAsync()
        {
            var projects = await _unitOfWork.Projects.GetAllAsync();
            var active = projects.Where(p => !p.IsClosed).ToList();
            var now = DateTime.UtcNow;
            var overdue = active.Where(p => p.Deadline < now).ToList();

            var workload = await _workload.GetOverloadedEmployeesAsync(0.0); // everyone
            var overloaded = workload.Where(w => w.UtilizationPct >= 0.9).ToList();
            var avgUtil = workload.Count == 0 ? 0 : workload.Average(w => w.UtilizationPct);

            // Count blocked tasks across the system.
            int blocked = 0;
            foreach (var p in active)
            {
                var tasks = await _unitOfWork.Tasks.GetActiveTasksByProjectAsync(p.ProjectId);
                blocked += tasks.Count(t => t.Status == "InProgress" && t.CreatedAt < now.AddDays(-7));
            }

            // Methodology breakdown — count active projects per methodology label.
            var methodologyBreakdown = active
                .GroupBy(p => string.IsNullOrWhiteSpace(p.ProjectModel?.Methodology)
                    ? (p.ProjectModel?.ModelName ?? "Unspecified")
                    : p.ProjectModel.Methodology)
                .ToDictionary(g => g.Key, g => g.Count());

            var allUsers = (await _unitOfWork.Users.GetAllAsync()).ToList();
            var pending = await _unitOfWork.UserRequests.GetPendingRequestsAsync();

            return new SystemHealthDto
            {
                ActiveProjects = active.Count,
                OverdueProjects = overdue.Count,
                AvgUtilization = avgUtil,
                OverloadedCount = overloaded.Count,
                BlockedTaskCount = blocked,
                TotalUsers = allUsers.Count,
                PendingUsers = pending.Count(),
                ActiveUsers = allUsers.Count,
                TopOverloaded = overloaded
                    .OrderByDescending(w => w.UtilizationPct)
                    .Take(5)
                    .Select(w => new TopOverloadedDto
                    {
                        UserId = w.UserId,
                        FullName = w.FullName,
                        UtilizationPct = w.UtilizationPct,
                        TotalEstimatedHours = w.TotalEstimatedHours,
                    })
                    .ToList(),
                MethodologyBreakdown = methodologyBreakdown,
            };
        }

        public async Task<ProjectHealthDto> GetProjectHealthAsync(Guid projectId)
        {
            var project = await _unitOfWork.Projects.GetByIdAsync(projectId);
            if (project == null)
                return new ProjectHealthDto { ProjectId = projectId, Title = "(not found)" };

            var tasks = await _unitOfWork.Tasks.GetByProjectIdAsync(projectId);
            var completed = tasks.Where(t => t.Status == "Done").ToList();
            var inProgress = tasks.Where(t => t.Status == "InProgress").ToList();
            var pending = tasks.Where(t => t.Status == "Todo" || t.Status == "Pending").ToList();

            var milestones = await _unitOfWork.Milestones.GetByProjectIdAsync(projectId);
            var doneMilestones = milestones.Count(m => m.Status?.Equals("Completed", StringComparison.OrdinalIgnoreCase) == true);

            // OnTimeRatio = completed tasks completed by their milestone deadline / completed total.
            // We don't track per-task completion timestamps yet — use milestone-deadline proxy.
            double onTime = 0;
            if (completed.Count > 0)
            {
                int onTimeCount = 0;
                foreach (var t in completed)
                {
                    if (!t.MilestoneId.HasValue) { onTimeCount++; continue; }
                    var m = milestones.FirstOrDefault(x => x.MilestoneId == t.MilestoneId.Value);
                    if (m == null || m.CompletedAt == null || m.CompletedAt <= m.Deadline) onTimeCount++;
                }
                onTime = (double)onTimeCount / completed.Count;
            }

            var workload = await _workload.GetProjectWorkloadAsync(projectId);
            var overloadedMembers = workload.Members.Count(m => m.UtilizationPct >= 0.9);
            var avgProjUtil = workload.Members.Count == 0 ? 0 : workload.Members.Average(m => m.UtilizationPct);

            return new ProjectHealthDto
            {
                ProjectId = projectId,
                Title = project.Title,
                Methodology = project.ProjectModel?.Methodology ?? project.ProjectModel?.ModelName,
                TotalTasks = tasks.Count,
                CompletedTasks = completed.Count,
                PendingTasks = pending.Count,
                InProgressTasks = inProgress.Count,
                OnTimeRatio = onTime,
                AvgUtilization = avgProjUtil,
                OverloadedMembers = overloadedMembers,
                MilestonesTotal = milestones.Count,
                MilestonesCompleted = doneMilestones,
                Deadline = project.Deadline,
                IsOverdue = !project.IsClosed && project.Deadline < DateTime.UtcNow && completed.Count < tasks.Count,
                // AI risk summary intentionally null here — populated by an optional Phase-5b
                // pass when the planner Python service is up. Keeps the panel responsive
                // even if the AI is offline.
                AiRiskSummary = null,
            };
        }

        public async Task<AdminDashboardDto> GetAdminDashboardAsync()
        {
            var now = DateTime.UtcNow;
            var today = now.Date;
            var weekStart = today.AddDays(-(int)today.DayOfWeek);

            var system = await GetSystemHealthAsync();
            var users = await _unitOfWork.Users.GetAllWithRolesAndProfileAsync();
            var projects = (await _unitOfWork.Projects.GetAllAsync()).ToList();
            var allTasks = await _unitOfWork.Tasks.GetAllAsync();
            var submissions = await _unitOfWork.TaskSubmissions.GetReviewHistoryAsync();
            var meetings = await _unitOfWork.Meetings.GetAllAsync();
            var timesheets = await _unitOfWork.DailyTimesheets.GetAllAsync(from: today.AddDays(-60), limit: 500);
            var notifications = await _unitOfWork.Notifications.GetRecentOrgAsync(40);
            var pendingUsers = (await _unitOfWork.UserRequests.GetPendingRequestsAsync()).Count();
            var workloadAll = await _workload.GetOverloadedEmployeesAsync(0.0);

            static string BucketRole(string? roleName)
            {
                if (AppRoles.IsQualityAssurance(roleName)) return "QA";
                if (AppRoles.Matches(roleName, AppRoles.Manager)) return "Managers";
                if (AppRoles.Matches(roleName, AppRoles.Employee)) return "Employees";
                if (AppRoles.Matches(roleName, AppRoles.Admin)) return "Admins";
                return "Other";
            }

            var userDistribution = new Dictionary<string, int>();
            int managers = 0, employees = 0, qa = 0, admins = 0;
            foreach (var u in users)
            {
                var rn = u.UserRoles?.FirstOrDefault()?.Role?.RoleName;
                var bucket = BucketRole(rn);
                userDistribution[bucket] = userDistribution.GetValueOrDefault(bucket) + 1;
                if (bucket == "Managers") managers++;
                else if (bucket == "Employees") employees++;
                else if (bucket == "QA") qa++;
                else if (bucket == "Admins") admins++;
            }

            var activeProjects = projects.Where(p => !p.IsClosed).ToList();
            var completedProjects = projects.Where(p => p.IsClosed).ToList();
            var overdueProjects = activeProjects.Where(p => p.Deadline < now).ToList();

            var projectStatus = new Dictionary<string, int>
            {
                ["Active"] = activeProjects.Count,
                ["Completed"] = completedProjects.Count,
                ["Delayed"] = overdueProjects.Count,
                ["On Hold"] = activeProjects.Count(p =>
                    p.Status?.Equals("On Hold", StringComparison.OrdinalIgnoreCase) == true),
            };

            var pendingSubmissions = submissions
                .Where(s => s.Status == "Submitted" && s.Task != null && TaskWorkflow.IsQaReviewable(s.Task.Status))
                .ToList();

            var taskStatus = new Dictionary<string, int>
            {
                ["Todo"] = allTasks.Count(t => TaskWorkflow.Normalize(t.Status) == TaskWorkflow.Todo),
                ["In Progress"] = allTasks.Count(t => TaskWorkflow.Normalize(t.Status) == TaskWorkflow.InProgress),
                ["Pending QA Review"] = pendingSubmissions.Count,
                ["Approved"] = allTasks.Count(t => TaskWorkflow.Normalize(t.Status) == TaskWorkflow.Approved),
                ["Done"] = allTasks.Count(t => TaskWorkflow.Normalize(t.Status) == TaskWorkflow.Done),
            };

            var rejectedSubs = submissions.Count(s => s.Status == "Rejected");
            if (rejectedSubs > 0) taskStatus["Rejected"] = rejectedSubs;

            var employeeWorkload = new List<AdminEmployeeWorkloadDto>();
            var employeeIds = await _unitOfWork.Users.GetUserIdsByRoleNameAsync(AppRoles.Employee);
            foreach (var eid in employeeIds.Take(25))
            {
                var load = await _workload.GetEmployeeLoadAsync(eid);
                var completed = allTasks.Count(t =>
                    t.AssignedEmployeeId == eid &&
                    (TaskWorkflow.Normalize(t.Status) == TaskWorkflow.Approved ||
                     TaskWorkflow.Normalize(t.Status) == TaskWorkflow.Done));
                var status = load.UtilizationPct >= 1.0 ? "Overloaded"
                    : load.UtilizationPct >= 0.85 ? "Busy"
                    : "Normal";
                employeeWorkload.Add(new AdminEmployeeWorkloadDto
                {
                    UserId = eid,
                    FullName = load.FullName,
                    CurrentTasks = load.ActiveTaskCount,
                    CompletedTasks = completed,
                    HoursThisWeek = load.ClockedHoursThisWeek > 0 ? load.ClockedHoursThisWeek : load.TotalEstimatedHours,
                    WorkloadStatus = status,
                    UtilizationPct = load.UtilizationPct,
                });
            }
            employeeWorkload = employeeWorkload.OrderByDescending(e => e.UtilizationPct).ToList();

            var managerPerformance = new List<AdminManagerPerformanceDto>();
            var managerIds = await _unitOfWork.Users.GetUserIdsByRoleNameAsync(AppRoles.Manager);
            foreach (var mid in managerIds)
            {
                var mgr = users.FirstOrDefault(u => u.UserId == mid);
                var mgrProjects = projects.Where(p => p.CreatedBy == mid).ToList();
                if (mgrProjects.Count == 0) continue;

                double progressSum = 0;
                int delayed = 0;
                foreach (var p in mgrProjects)
                {
                    var tasks = allTasks.Where(t => t.ProjectId == p.ProjectId).ToList();
                    if (tasks.Count > 0)
                    {
                        var done = tasks.Count(t =>
                        {
                            var n = TaskWorkflow.Normalize(t.Status);
                            return n == TaskWorkflow.Approved || n == TaskWorkflow.Done;
                        });
                        progressSum += (double)done / tasks.Count;
                    }
                    if (!p.IsClosed && p.Deadline < now) delayed++;
                }

                managerPerformance.Add(new AdminManagerPerformanceDto
                {
                    ManagerId = mid,
                    FullName = mgr?.FullName ?? "Manager",
                    Projects = mgrProjects.Count,
                    Delayed = delayed,
                    Completed = mgrProjects.Count(p => p.IsClosed),
                    AverageProgress = Math.Round(progressSum / Math.Max(1, mgrProjects.Count) * 100, 1),
                });
            }

            var qaPerformance = new List<AdminQaPerformanceDto>();
            var qaIds = await _unitOfWork.Users.GetUserIdsByRoleNameAsync(AppRoles.QualityAssurance);
            foreach (var qid in qaIds)
            {
                var qaUser = users.FirstOrDefault(u => u.UserId == qid);
                var teamIds = await _unitOfWork.TeamEmployees.GetTeamIdsForMemberAsync(qid);
                var assignments = await _unitOfWork.ProjectTeams.GetAllAssignmentsAsync();
                var projectIds = assignments.Where(a => teamIds.Contains(a.TeamId)).Select(a => a.ProjectId).ToHashSet();

                var qaSubs = submissions.Where(s => s.Task != null && projectIds.Contains(s.Task.ProjectId)).ToList();
                if (projectIds.Count == 0)
                    qaSubs = submissions;

                var reviewed = qaSubs.Where(s => s.ReviewedAt.HasValue && s.Status is "Approved" or "Rejected").ToList();
                qaPerformance.Add(new AdminQaPerformanceDto
                {
                    QaId = qid,
                    FullName = qaUser?.FullName ?? "QA",
                    PendingReviews = qaSubs.Count(s => s.Status == "Submitted"),
                    Approved = qaSubs.Count(s => s.Status == "Approved"),
                    Rejected = qaSubs.Count(s => s.Status == "Rejected"),
                    AverageReviewHours = reviewed.Count == 0
                        ? null
                        : reviewed.Average(s => (s.ReviewedAt!.Value - s.SubmittedAt).TotalHours),
                });
            }

            var todaysMeetings = meetings.Where(m => m.ScheduledAt.Date == today).ToList();
            var meetingAnalytics = new AdminMeetingAnalyticsDto
            {
                TodaysMeetings = todaysMeetings.Count,
                Upcoming = meetings.Count(m =>
                    m.ScheduledAt > now &&
                    m.Status.Equals("Scheduled", StringComparison.OrdinalIgnoreCase)),
                Completed = meetings.Count(m =>
                    m.Status.Equals("Completed", StringComparison.OrdinalIgnoreCase)),
                Cancelled = meetings.Count(m =>
                    m.Status.Equals("Cancelled", StringComparison.OrdinalIgnoreCase)),
                AttendanceRate = meetings.Count == 0 ? 0
                    : Math.Round(100.0 * meetings.Count(m =>
                        m.Status.Equals("Completed", StringComparison.OrdinalIgnoreCase)) / meetings.Count, 1),
            };

            var todaySheets = timesheets.Where(t => t.WorkDate.Date == today).ToList();
            var weekSheets = timesheets.Where(t => t.WorkDate >= weekStart).ToList();
            var clockedIn = await _unitOfWork.TimeEntries.CountOpenEntriesAsync();

            var timesheetAnalytics = new AdminTimesheetAnalyticsDto
            {
                ClockedInNow = clockedIn,
                SubmittedToday = todaySheets.Count(t => t.Status == "Submitted"),
                PendingApproval = timesheets.Count(t => t.Status == "Submitted"),
                AverageHoursToday = todaySheets.Count == 0 ? 0
                    : Math.Round(todaySheets.Average(t => t.TotalHours), 1),
                WeeklyHours = weekSheets.Sum(t => t.TotalHours),
            };

            var projectTeams = await _unitOfWork.ProjectTeams.GetAllAssignmentsAsync();
            var aiAnalytics = new AdminAiAnalyticsDto
            {
                AiAssistedMilestones = projects.Sum(p =>
                {
                    // count milestones per project lazily — use task milestone ids as proxy
                    return allTasks.Where(t => t.ProjectId == p.ProjectId && t.MilestoneId.HasValue)
                        .Select(t => t.MilestoneId!.Value).Distinct().Count();
                }),
                AiScoredTasks = allTasks.Count(t => !string.IsNullOrWhiteSpace(t.RequiredSkillsJson)),
                ProjectsWithTeams = projectTeams.Select(pt => pt.ProjectId).Distinct().Count(),
                AssignedAiTasks = allTasks.Count(t =>
                    t.AssignedEmployeeId.HasValue && (t.EstimatedHours.HasValue || !string.IsNullOrWhiteSpace(t.RequiredSkillsJson))),
            };

            var pendingApprovals = new AdminPendingApprovalsDto
            {
                PendingUsers = pendingUsers,
                PendingTimesheets = timesheets.Count(t => t.Status == "Submitted"),
                PendingQaReviews = pendingSubmissions.Count,
                PendingProjectClosures = activeProjects.Count(p =>
                    p.Status?.Equals("Pending Closure", StringComparison.OrdinalIgnoreCase) == true),
            };

            var recentActivity = notifications.Select(n => new AdminActivityDto
            {
                At = n.CreatedAt,
                Type = n.Type ?? "Activity",
                Title = n.Title,
                Body = n.Body,
            }).ToList();

            var alerts = new List<AdminAlertDto>();
            if (overdueProjects.Count > 0)
                alerts.Add(new AdminAlertDto { Severity = "warning", Message = $"{overdueProjects.Count} project(s) are overdue", ActionLink = "/admin?tab=monitoring" });
            if (system.OverloadedCount > 0)
                alerts.Add(new AdminAlertDto { Severity = "warning", Message = $"{system.OverloadedCount} employee(s) are overloaded", ActionLink = "/workload" });
            if (pendingUsers > 0)
                alerts.Add(new AdminAlertDto { Severity = "info", Message = $"{pendingUsers} user(s) awaiting approval", ActionLink = "/admin?tab=users" });
            if (pendingSubmissions.Count > 0)
                alerts.Add(new AdminAlertDto { Severity = "warning", Message = $"{pendingSubmissions.Count} task(s) waiting for QA review", ActionLink = "/qa/review" });
            if (timesheetAnalytics.PendingApproval > 0)
                alerts.Add(new AdminAlertDto { Severity = "info", Message = $"{timesheetAnalytics.PendingApproval} timesheet(s) pending approval", ActionLink = "/admin?tab=all-timesheets" });
            if (todaysMeetings.Count > 0)
                alerts.Add(new AdminAlertDto { Severity = "info", Message = $"{todaysMeetings.Count} meeting(s) scheduled today", ActionLink = "/admin?tab=monitoring" });

            var tasksCompletedPerWeek = new List<AdminWeeklyTasksDto>();
            for (var i = 7; i >= 0; i--)
            {
                var ws = today.AddDays(-7 * i - (int)today.DayOfWeek);
                var we = ws.AddDays(7);
                var count = submissions.Count(s =>
                    s.Status == "Approved" &&
                    s.ReviewedAt.HasValue &&
                    s.ReviewedAt.Value >= ws && s.ReviewedAt.Value < we);
                tasksCompletedPerWeek.Add(new AdminWeeklyTasksDto
                {
                    WeekLabel = ws.ToString("MMM d"),
                    Completed = count,
                });
            }

            var hoursPerWeek = new List<AdminWeeklyHoursDto>();
            for (var i = 7; i >= 0; i--)
            {
                var ws = today.AddDays(-7 * i - (int)today.DayOfWeek);
                var we = ws.AddDays(7);
                var hrs = timesheets
                    .Where(t => t.WorkDate >= ws && t.WorkDate < we)
                    .Sum(t => t.TotalHours);
                hoursPerWeek.Add(new AdminWeeklyHoursDto
                {
                    WeekLabel = ws.ToString("MMM d"),
                    Hours = hrs,
                });
            }

            var projectTitleById = projects.ToDictionary(p => p.ProjectId, p => p.Title);
            var userNameById = users.ToDictionary(u => u.UserId, u => u.FullName ?? u.Email ?? "Unknown");

            static string DisplayStatusFor(string normalized)
            {
                if (normalized == TaskWorkflow.Todo) return "Pending";
                if (normalized == TaskWorkflow.InProgress) return "In Progress";
                if (normalized == TaskWorkflow.Done) return "Completed";
                if (normalized == TaskWorkflow.Approved) return "Approved";
                return normalized;
            }

            var userRows = users
                .OrderBy(u => u.FullName)
                .Select(u =>
                {
                    var rn = u.UserRoles?.FirstOrDefault()?.Role?.RoleName;
                    return new AdminUserRowDto
                    {
                        UserId = u.UserId,
                        FullName = u.FullName ?? u.Email ?? "Unknown",
                        Email = u.Email ?? string.Empty,
                        Role = BucketRole(rn),
                        Status = "Active",
                    };
                })
                .ToList();

            var taskRows = allTasks
                .OrderByDescending(t => t.CreatedAt)
                .Select(t =>
                {
                    var norm = TaskWorkflow.Normalize(t.Status);
                    return new AdminTaskRowDto
                    {
                        TaskId = t.TaskId,
                        Title = t.Title,
                        Status = norm,
                        DisplayStatus = DisplayStatusFor(norm),
                        ProjectId = t.ProjectId,
                        ProjectTitle = projectTitleById.GetValueOrDefault(t.ProjectId, "Unknown project"),
                        AssigneeName = t.AssignedEmployeeId.HasValue
                            ? userNameById.GetValueOrDefault(t.AssignedEmployeeId.Value, "Unassigned")
                            : null,
                        Deadline = t.Deadline,
                        Priority = t.Priority,
                    };
                })
                .ToList();

            var allMilestones = await _unitOfWork.Milestones.GetAllAsync();
            var milestonesByProject = allMilestones
                .GroupBy(m => m.ProjectId)
                .ToDictionary(g => g.Key, g => g.ToList());
            var tasksByProject = allTasks
                .GroupBy(t => t.ProjectId)
                .ToDictionary(g => g.Key, g => g.ToList());

            var projectHealthRows = new List<AdminProjectHealthRowDto>();
            foreach (var p in projects.OrderByDescending(x => x.CreatedAt))
            {
                var tasks = tasksByProject.GetValueOrDefault(p.ProjectId) ?? new List<MANAGIX.Models.Models.TaskItem>();
                var completed = tasks.Count(t =>
                {
                    var n = TaskWorkflow.Normalize(t.Status);
                    return n == TaskWorkflow.Done || n == TaskWorkflow.Approved;
                });
                var inProgress = tasks.Count(t => TaskWorkflow.Normalize(t.Status) == TaskWorkflow.InProgress);
                var pending = tasks.Count(t => TaskWorkflow.Normalize(t.Status) == TaskWorkflow.Todo);
                var miles = milestonesByProject.GetValueOrDefault(p.ProjectId) ?? new List<MANAGIX.Models.Models.Milestone>();
                var milesDone = miles.Count(m =>
                    m.Status?.Equals("Completed", StringComparison.OrdinalIgnoreCase) == true);
                var progress = tasks.Count == 0
                    ? 0
                    : Math.Round(100.0 * completed / tasks.Count, 1);
                var isOverdue = !p.IsClosed && p.Deadline < now && completed < tasks.Count;

                projectHealthRows.Add(new AdminProjectHealthRowDto
                {
                    ProjectId = p.ProjectId,
                    Title = p.Title,
                    IsClosed = p.IsClosed,
                    IsOverdue = isOverdue,
                    TotalTasks = tasks.Count,
                    CompletedTasks = completed,
                    InProgressTasks = inProgress,
                    PendingTasks = pending,
                    ProgressPct = progress,
                    Deadline = p.Deadline,
                    MilestonesCompleted = milesDone,
                    MilestonesTotal = miles.Count,
                    Methodology = p.ProjectModel?.Methodology ?? p.ProjectModel?.ModelName,
                });
            }

            return new AdminDashboardDto
            {
                Overview = new AdminOverviewDto
                {
                    TotalUsers = users.Count,
                    Managers = managers,
                    Employees = employees,
                    Qa = qa,
                    Admins = admins,
                    ActiveProjects = activeProjects.Count,
                    CompletedProjects = completedProjects.Count,
                    PendingTasks = allTasks.Count(t =>
                    {
                        var n = TaskWorkflow.Normalize(t.Status);
                        return n == TaskWorkflow.Todo || n == TaskWorkflow.InProgress;
                    }),
                    TodaysMeetings = todaysMeetings.Count,
                    OverdueProjects = overdueProjects.Count,
                    OverloadedEmployees = system.OverloadedCount,
                    BlockedTasks = system.BlockedTaskCount,
                },
                UserDistribution = userDistribution,
                ProjectStatus = projectStatus,
                TaskStatus = taskStatus,
                EmployeeWorkload = employeeWorkload,
                ManagerPerformance = managerPerformance.OrderByDescending(m => m.Projects).ToList(),
                QaPerformance = qaPerformance,
                MeetingAnalytics = meetingAnalytics,
                TimesheetAnalytics = timesheetAnalytics,
                AiAnalytics = aiAnalytics,
                PendingApprovals = pendingApprovals,
                RecentActivity = recentActivity,
                SystemAlerts = alerts,
                TasksCompletedPerWeek = tasksCompletedPerWeek,
                HoursWorkedPerWeek = hoursPerWeek,
                ProjectHealthRows = projectHealthRows,
                TaskRows = taskRows,
                UserRows = userRows,
            };
        }
    }
}
