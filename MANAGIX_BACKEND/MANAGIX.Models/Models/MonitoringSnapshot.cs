using System;
using System.ComponentModel.DataAnnotations;

namespace MANAGIX.Models.Models
{
    // PHASE 0 / PHASE 5: Periodic admin-monitoring snapshot per project.
    // Persisted by MonitoringService (on-demand for now) so the admin panel can render trend charts
    // without re-aggregating tasks/performance/workload from raw tables every refresh.
    public class MonitoringSnapshot
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public Guid ProjectId { get; set; }

        public DateTime CapturedAt { get; set; } = DateTime.UtcNow;

        // Ratio of tasks completed on or before their milestone deadline (0..1).
        public double OnTimeRatio { get; set; }

        // Average utilisation across project members at snapshot time (0..1+).
        public double AvgWorkloadHours { get; set; }

        // How many members were over 90% capacity at snapshot time.
        public int OverloadedCount { get; set; }

        // Tasks blocked / overdue / in 'Review' for > 3 days etc.
        public int BlockedTaskCount { get; set; }

        // Optional JSON blob for burndown points or any future series — keeps schema additive.
        public string? BurndownJson { get; set; }
    }
}
