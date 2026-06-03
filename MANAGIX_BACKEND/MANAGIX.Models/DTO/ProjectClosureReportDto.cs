using System;
using System.Collections.Generic;

namespace MANAGIX.Models.DTO
{
    public class ProjectClosureReportDto
    {
        public Guid ProjectId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public int DurationDays { get; set; }
        public decimal Budget { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? Methodology { get; set; }

        public List<ClosureTeamDto> Teams { get; set; } = new();
        public List<ClosureMemberDto> Members { get; set; } = new();
        public List<string> QaMembers { get; set; } = new();

        public int TotalMilestones { get; set; }
        public int CompletedMilestones { get; set; }
        public int DelayedMilestones { get; set; }

        public int TotalTasks { get; set; }
        public int ApprovedTasks { get; set; }
        public int RejectedTasks { get; set; }
        public double CompletionRate { get; set; }

        public List<ClosurePerformanceDto> Performance { get; set; } = new();
        public List<ClosureDeliverableDto> Deliverables { get; set; } = new();

        public decimal TotalLoggedHours { get; set; }
        public decimal EstimatedPayrollCost { get; set; }
        public string AiInsightsSummary { get; set; } = string.Empty;
    }

    public class ClosureTeamDto
    {
        public Guid TeamId { get; set; }
        public string Name { get; set; } = string.Empty;
    }

    public class ClosureMemberDto
    {
        public Guid UserId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string EmployeeLevel { get; set; } = string.Empty;
        public int TasksCompleted { get; set; }
        public decimal LoggedHours { get; set; }
    }

    public class ClosurePerformanceDto
    {
        public Guid EmployeeId { get; set; }
        public string EmployeeName { get; set; } = string.Empty;
        public double OnTimeRatio { get; set; }
        public int TasksCompleted { get; set; }
    }

    public class ClosureDeliverableDto
    {
        public Guid TaskId { get; set; }
        public string TaskTitle { get; set; } = string.Empty;
        public string FileName { get; set; } = string.Empty;
        public DateTime SubmittedAt { get; set; }
    }
}
