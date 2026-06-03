using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MANAGIX.Models.Models
{
    public class TaskItem
    {
        [Key]
        public Guid TaskId { get; set; } = Guid.NewGuid();

        [Required]
        public Guid ProjectId { get; set; }

        public Guid? MilestoneId { get; set; }

        /// <summary>Null when the task is not yet assigned (e.g. AI-generated).</summary>
        public Guid? AssignedEmployeeId { get; set; }

        [Required]
        public string Title { get; set; } = null!;

        public string? Description { get; set; }

        public string Status { get; set; } = "Todo";

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? Deadline { get; set; }

        // PHASE 0: Workload + AI-allocation signals.
        // EstimatedHours feeds capacity math (sum across active tasks vs. UserProfile.WeeklyCapacityHours).
        public decimal? EstimatedHours { get; set; }

        // Agile teams may prefer story points over hours. Both are optional and orthogonal.
        public int? StoryPoints { get; set; }

        // Priority is consumed by the deterministic scoring rebalance in AiAllocationService.
        // Values: Low / Medium / High / Critical.
        [MaxLength(16)]
        public string? Priority { get; set; }

        // JSON array of skill tags ["C#", "EF Core", ...]. Sent to the Python allocator so task→employee
        // matching considers concrete skills rather than free-text title alone.
        public string? RequiredSkillsJson { get; set; }
    }
}
