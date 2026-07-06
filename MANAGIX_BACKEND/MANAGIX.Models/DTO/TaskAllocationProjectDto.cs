using System;

namespace MANAGIX.Models.DTO
{
    public class TaskAllocationProjectDto
    {
        public Guid ProjectId { get; set; }
        public string Title { get; set; } = string.Empty;
        public int UnassignedTaskCount { get; set; }
        /// <summary>False when project has unassigned tasks but no team yet (assign team before AI allocation).</summary>
        public bool HasTeam { get; set; }
    }
}
