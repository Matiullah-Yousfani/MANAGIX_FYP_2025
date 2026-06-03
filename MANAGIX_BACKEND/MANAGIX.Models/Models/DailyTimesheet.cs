using System;
using System.ComponentModel.DataAnnotations;

namespace MANAGIX.Models.Models
{
    public class DailyTimesheet
    {
        [Key]
        public Guid DailyTimesheetId { get; set; } = Guid.NewGuid();

        [Required]
        public Guid UserId { get; set; }

        public DateTime WorkDate { get; set; }

        public decimal TotalHours { get; set; }

        /// <summary>Draft | Submitted | Approved | Rejected</summary>
        [MaxLength(32)]
        public string Status { get; set; } = "Draft";

        public string? EmployeeNote { get; set; }
        public string? OvertimeReason { get; set; }
        public string? ManagerComment { get; set; }

        public Guid? ReviewedBy { get; set; }
        public DateTime? SubmittedAt { get; set; }
        public DateTime? ReviewedAt { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
