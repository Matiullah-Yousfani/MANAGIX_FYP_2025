using System;
using System.Collections.Generic;

namespace MANAGIX.Models.DTO
{
    public class ProjectTimelineDto
    {
        public Guid ProjectId { get; set; }
        public string Title { get; set; } = string.Empty;
        public DateTime ProjectStart { get; set; }
        public DateTime ProjectEnd { get; set; }
        public double OverallProgressPct { get; set; }
        public List<TimelineMilestoneBarDto> Milestones { get; set; } = new();
    }

    public class TimelineMilestoneBarDto
    {
        public Guid MilestoneId { get; set; }
        public string Title { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string Status { get; set; } = string.Empty;
        public int TotalTasks { get; set; }
        public int CompletedTasks { get; set; }
        public double ProgressPct { get; set; }
        public double OffsetPct { get; set; }
        public double WidthPct { get; set; }
        /// <summary>True when tasks are Done but not yet Approved (awaiting QA).</summary>
        public bool HasPendingReview { get; set; }
    }
}
