using System;
using System.Collections.Generic;

namespace MANAGIX.Models.DTO
{
    public class AdminDashboardDto
    {
        public AdminOverviewDto Overview { get; set; } = new();
        public Dictionary<string, int> UserDistribution { get; set; } = new();
        public Dictionary<string, int> ProjectStatus { get; set; } = new();
        public Dictionary<string, int> TaskStatus { get; set; } = new();
        public List<AdminEmployeeWorkloadDto> EmployeeWorkload { get; set; } = new();
        public List<AdminManagerPerformanceDto> ManagerPerformance { get; set; } = new();
        public List<AdminQaPerformanceDto> QaPerformance { get; set; } = new();
        public AdminMeetingAnalyticsDto MeetingAnalytics { get; set; } = new();
        public AdminTimesheetAnalyticsDto TimesheetAnalytics { get; set; } = new();
        public AdminAiAnalyticsDto AiAnalytics { get; set; } = new();
        public AdminPendingApprovalsDto PendingApprovals { get; set; } = new();
        public List<AdminActivityDto> RecentActivity { get; set; } = new();
        public List<AdminAlertDto> SystemAlerts { get; set; } = new();
        public List<AdminWeeklyTasksDto> TasksCompletedPerWeek { get; set; } = new();
        public List<AdminWeeklyHoursDto> HoursWorkedPerWeek { get; set; } = new();
        /// <summary>Per-project health rows — one entry per project in the org.</summary>
        public List<AdminProjectHealthRowDto> ProjectHealthRows { get; set; } = new();
        /// <summary>Org-wide task rows for admin task pipeline drill-down.</summary>
        public List<AdminTaskRowDto> TaskRows { get; set; } = new();
        /// <summary>Org users for people drill-down.</summary>
        public List<AdminUserRowDto> UserRows { get; set; } = new();
    }

    public class AdminUserRowDto
    {
        public Guid UserId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
    }

    public class AdminTaskRowDto
    {
        public Guid TaskId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string DisplayStatus { get; set; } = string.Empty;
        public Guid ProjectId { get; set; }
        public string ProjectTitle { get; set; } = string.Empty;
        public string? AssigneeName { get; set; }
        public DateTime? Deadline { get; set; }
        public string? Priority { get; set; }
    }

    /// <summary>Health metrics for a single project (not org-wide aggregate).</summary>
    public class AdminProjectHealthRowDto
    {
        public Guid ProjectId { get; set; }
        public string Title { get; set; } = string.Empty;
        public bool IsClosed { get; set; }
        public bool IsOverdue { get; set; }
        public int TotalTasks { get; set; }
        public int CompletedTasks { get; set; }
        public int InProgressTasks { get; set; }
        public int PendingTasks { get; set; }
        public double ProgressPct { get; set; }
        public DateTime? Deadline { get; set; }
        public int MilestonesCompleted { get; set; }
        public int MilestonesTotal { get; set; }
        public string? Methodology { get; set; }
    }

    public class AdminOverviewDto
    {
        public int TotalUsers { get; set; }
        public int Managers { get; set; }
        public int Employees { get; set; }
        public int Qa { get; set; }
        public int Admins { get; set; }
        public int ActiveProjects { get; set; }
        public int CompletedProjects { get; set; }
        public int PendingTasks { get; set; }
        public int TodaysMeetings { get; set; }
        public int OverdueProjects { get; set; }
        public int OverloadedEmployees { get; set; }
        public int BlockedTasks { get; set; }
    }

    public class AdminEmployeeWorkloadDto
    {
        public Guid UserId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public int CurrentTasks { get; set; }
        public int CompletedTasks { get; set; }
        public decimal HoursThisWeek { get; set; }
        public string WorkloadStatus { get; set; } = "Normal";
        public double UtilizationPct { get; set; }
    }

    public class AdminManagerPerformanceDto
    {
        public Guid ManagerId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public int Projects { get; set; }
        public int Delayed { get; set; }
        public int Completed { get; set; }
        public double AverageProgress { get; set; }
    }

    public class AdminQaPerformanceDto
    {
        public Guid QaId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public int PendingReviews { get; set; }
        public int Approved { get; set; }
        public int Rejected { get; set; }
        public double? AverageReviewHours { get; set; }
    }

    public class AdminMeetingAnalyticsDto
    {
        public int TodaysMeetings { get; set; }
        public int Upcoming { get; set; }
        public int Completed { get; set; }
        public int Cancelled { get; set; }
        public double AttendanceRate { get; set; }
    }

    public class AdminTimesheetAnalyticsDto
    {
        public int ClockedInNow { get; set; }
        public int SubmittedToday { get; set; }
        public int PendingApproval { get; set; }
        public decimal AverageHoursToday { get; set; }
        public decimal WeeklyHours { get; set; }
    }

    public class AdminAiAnalyticsDto
    {
        public int AiAssistedMilestones { get; set; }
        public int AiScoredTasks { get; set; }
        public int ProjectsWithTeams { get; set; }
        public int AssignedAiTasks { get; set; }
    }

    public class AdminPendingApprovalsDto
    {
        public int PendingUsers { get; set; }
        public int PendingTimesheets { get; set; }
        public int PendingQaReviews { get; set; }
        public int PendingProjectClosures { get; set; }
    }

    public class AdminActivityDto
    {
        public DateTime At { get; set; }
        public string Type { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string? Body { get; set; }
    }

    public class AdminAlertDto
    {
        public string Severity { get; set; } = "info";
        public string Message { get; set; } = string.Empty;
        public string? ActionLink { get; set; }
    }

    public class AdminWeeklyTasksDto
    {
        public string WeekLabel { get; set; } = string.Empty;
        public int Completed { get; set; }
    }

    public class AdminWeeklyHoursDto
    {
        public string WeekLabel { get; set; } = string.Empty;
        public decimal Hours { get; set; }
    }
}
