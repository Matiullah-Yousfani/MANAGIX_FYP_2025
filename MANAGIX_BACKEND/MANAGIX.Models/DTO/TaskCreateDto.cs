using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MANAGIX.Models.DTO
{
    public class TaskCreateDto
    {
        public Guid ProjectId { get; set; }
        public Guid? MilestoneId { get; set; }
        /// <summary>Optional; omit or empty for unassigned tasks.</summary>
        public Guid? AssignedEmployeeId { get; set; }
        public string Title { get; set; } = null!;
        public string? Description { get; set; }
        public string Status { get; set; } = "Todo";
        public decimal? EstimatedHours { get; set; }
        public string? Priority { get; set; }
        public DateTime? Deadline { get; set; }
    }
}
