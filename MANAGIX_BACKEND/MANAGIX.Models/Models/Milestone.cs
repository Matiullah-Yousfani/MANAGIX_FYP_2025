using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MANAGIX.Models.Models
{
    public class Milestone
    {
        [Key]
        public Guid MilestoneId { get; set; } = Guid.NewGuid();

        [Required]
        public Guid ProjectId { get; set; }

        [Required]
        public string Title { get; set; } = null!;

        public string? Description { get; set; }

        public DateTime Deadline { get; set; }

        public decimal BudgetAllocated { get; set; }

        public string Status { get; set; } = "Pending";

        public DateTime? CompletedAt { get; set; }

    }
}
