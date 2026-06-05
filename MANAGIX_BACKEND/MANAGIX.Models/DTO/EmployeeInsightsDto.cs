using System;
using System.Collections.Generic;

namespace MANAGIX.Models.DTO
{
    public class EmployeeInsightsDto
    {
        public Guid UserId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string EmployeeLevel { get; set; } = "Junior";
        public int CompletedProjectsCount { get; set; }
        public bool IsOnline { get; set; }
        public DateTime? LastActiveAt { get; set; }

        public int TotalTasksAssigned { get; set; }
        public int TasksCompleted { get; set; }
        public int TasksInProgress { get; set; }
        public int TasksPending { get; set; }
        public double CompletionRate { get; set; }

        public decimal ActiveWorkloadHours { get; set; }
        public decimal WeeklyCapacityHours { get; set; }
        public double UtilizationPct { get; set; }
        public decimal TotalLoggedHours { get; set; }
        public decimal? HourlyRate { get; set; }
        public decimal EstimatedEarnings { get; set; }

        public List<EmployeeProjectInsightDto> ActiveProjects { get; set; } = new();
        public List<MonthlyHoursDto> HoursByMonth { get; set; } = new();
        public List<EmployeeTeamInsightDto> Teams { get; set; } = new();
        public List<EmployeeTaskInsightDto> TaskDetails { get; set; } = new();
        public List<EmployeeMilestoneInsightDto> Milestones { get; set; } = new();
    }

    public class EmployeeTeamInsightDto
    {
        public Guid TeamId { get; set; }
        public string TeamName { get; set; } = string.Empty;
        public string? ProjectTitle { get; set; }
        public string? CreatedByName { get; set; }
        public List<TeamMemberBriefDto> Members { get; set; } = new();
    }

    public class TeamMemberBriefDto
    {
        public Guid UserId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string RoleName { get; set; } = string.Empty;
    }

    public class EmployeeTaskInsightDto
    {
        public Guid TaskId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string? Priority { get; set; }
        public string? ProjectTitle { get; set; }
        public string? MilestoneTitle { get; set; }
    }

    public class EmployeeMilestoneInsightDto
    {
        public Guid MilestoneId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime Deadline { get; set; }
        public int TotalTasks { get; set; }
        public int CompletedTasks { get; set; }
    }

    public class EmployeeProjectInsightDto
    {
        public Guid ProjectId { get; set; }
        public string Title { get; set; } = string.Empty;
        public int AssignedTasks { get; set; }
        public int CompletedTasks { get; set; }
    }

    public class MonthlyHoursDto
    {
        public string Month { get; set; } = string.Empty;
        public decimal Hours { get; set; }
    }
}
