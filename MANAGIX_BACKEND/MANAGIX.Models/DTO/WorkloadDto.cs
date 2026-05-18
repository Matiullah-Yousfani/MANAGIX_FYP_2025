using System;
using System.Collections.Generic;

namespace MANAGIX.Models.DTO
{
    // PHASE 3: Per-employee workload payload — also referenced by Phase 5 monitoring.
    public class WorkloadEntryDto
    {
        public Guid UserId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public int ActiveTaskCount { get; set; }
        public decimal TotalEstimatedHours { get; set; }
        public decimal CapacityHours { get; set; } = 40m;

        // Utilization ratio = TotalEstimatedHours / CapacityHours.
        // > 1.0 means over capacity. Frontend colors >0.9 amber, >1.0 red.
        public double UtilizationPct { get; set; }

        // Distinct active projects this employee touches (cross-project view).
        public int ProjectsAssigned { get; set; }
    }

    // PHASE 3: Project-scoped workload — used by manager dashboards and AI scoring.
    public class ProjectWorkloadDto
    {
        public Guid ProjectId { get; set; }
        public List<WorkloadEntryDto> Members { get; set; } = new();
        public decimal TotalProjectHours { get; set; }
        public decimal TotalProjectCapacity { get; set; }
        public double ProjectUtilizationPct { get; set; }
    }
}
