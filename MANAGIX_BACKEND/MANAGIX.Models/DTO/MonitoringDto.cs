using System;
using System.Collections.Generic;

namespace MANAGIX.Models.DTO
{
    // PHASE 5: Top-level system snapshot for the admin panel.
    public class SystemHealthDto
    {
        public int ActiveProjects { get; set; }
        public int OverdueProjects { get; set; }
        public double AvgUtilization { get; set; }       // 0..1+
        public int OverloadedCount { get; set; }
        public int BlockedTaskCount { get; set; }
        public List<TopOverloadedDto> TopOverloaded { get; set; } = new();
        public Dictionary<string, int> MethodologyBreakdown { get; set; } = new();
        public int TotalUsers { get; set; }
        public int PendingUsers { get; set; }
        public int ActiveUsers { get; set; }
    }

    public class TopOverloadedDto
    {
        public Guid UserId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public double UtilizationPct { get; set; }
        public decimal TotalEstimatedHours { get; set; }
    }

    // PHASE 5: Per-project health card.
    public class ProjectHealthDto
    {
        public Guid ProjectId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Methodology { get; set; }
        public int TotalTasks { get; set; }
        public int CompletedTasks { get; set; }
        public int PendingTasks { get; set; }
        public int InProgressTasks { get; set; }
        public double OnTimeRatio { get; set; }
        public double AvgUtilization { get; set; }
        public int OverloadedMembers { get; set; }
        public int MilestonesTotal { get; set; }
        public int MilestonesCompleted { get; set; }
        public DateTime? Deadline { get; set; }
        public bool IsOverdue { get; set; }
        // Optional AI-narrated risk summary — populated when the planner Python service is reachable.
        public string? AiRiskSummary { get; set; }
    }
}
