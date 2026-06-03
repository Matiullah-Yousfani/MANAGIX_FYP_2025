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
