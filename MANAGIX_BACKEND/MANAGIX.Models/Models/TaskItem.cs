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
    }
}
