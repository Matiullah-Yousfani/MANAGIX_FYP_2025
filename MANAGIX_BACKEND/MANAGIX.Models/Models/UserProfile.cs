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
        public decimal WeeklyCapacityHours { get; set; } = 40m;

        /// <summary>Optional hourly rate for AI cost / workload budgeting signals.</summary>
        public decimal? HourlyRate { get; set; }

        /// <summary>Junior | Intermediate | Senior — updated when projects close.</summary>
        public string EmployeeLevel { get; set; } = "Junior";

        public int CompletedProjectsCount { get; set; }

        public decimal? MonthlySalary { get; set; }

        public DateTime? LastActiveAt { get; set; }

        /// <summary>Standard work day length (default 8h).</summary>
        public decimal StandardHoursPerDay { get; set; } = 8m;

        /// <summary>Grace hours after standard before overtime flow (default 2h → trigger at 10h).</summary>
        public decimal OvertimeGraceHours { get; set; } = 2m;

        /// <summary>Optional shift display, e.g. 09:00.</summary>
        public TimeSpan? ShiftStartTime { get; set; }

        public TimeSpan? ShiftEndTime { get; set; }
    }
}

