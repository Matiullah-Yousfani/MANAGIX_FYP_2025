using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MANAGIX.Models.Models
{
    public class EmployeePerformance
    {
        [Key]
        public Guid PerformanceId { get; set; } = Guid.NewGuid();

        // FK → Users table
        [Required]
        public Guid EmployeeId { get; set; }

        [ForeignKey(nameof(EmployeeId))]
        public User? Employee { get; set; }

        // FK → Projects table
        [Required]
        public Guid ProjectId { get; set; }

        [ForeignKey(nameof(ProjectId))]
        public Project? Project { get; set; }

        public int TasksAssigned { get; set; }
        public int TasksCompleted { get; set; }

        public double ApprovalRate { get; set; }

        public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
    }
}
