using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MANAGIX.Models.Models
{
    public class UserProfile
    {
        [Key]
        public Guid ProfileId { get; set; } = Guid.NewGuid();

        [Required]
        public Guid UserId { get; set; } // FK to User

        [ForeignKey("UserId")]
        public User? User { get; set; } // Navigation property

        public string? Phone { get; set; }
        public string? Address { get; set; }
        public string? Skills { get; set; }
        public string? Experience { get; set; }
        public string? Education { get; set; }
        public string? ResumeFilePath { get; set; }
        public string? ProfilePicture { get; set; }
        public string? Bio { get; set; }
        public string? Summary { get; set; }

        // PHASE 0: Workload capacity. Default 40h/week — tunable per user (e.g. part-time, intern).
        // WorkloadService divides sum-of-EstimatedHours of active tasks by this to compute utilization %.
        public decimal WeeklyCapacityHours { get; set; } = 40m;
    }
}
