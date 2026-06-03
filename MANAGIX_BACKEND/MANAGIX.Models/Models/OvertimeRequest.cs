using System;
using System.ComponentModel.DataAnnotations;

namespace MANAGIX.Models.Models
{
    public class OvertimeRequest
    {
        [Key]
        public Guid OvertimeRequestId { get; set; } = Guid.NewGuid();

        [Required]
        public Guid UserId { get; set; }

        public Guid? ProjectId { get; set; }
        public Guid? TaskId { get; set; }

        /// <summary>UTC calendar date for per-day overtime tracking.</summary>
        public DateTime WorkDate { get; set; }

        public decimal TotalHoursThatDay { get; set; }

        [MaxLength(2000)]
        public string? EmployeeReason { get; set; }

        /// <summary>PendingReason | PendingManager | Resolved</summary>
        [MaxLength(32)]
        public string Status { get; set; } = "PendingReason";

        public Guid? ManagerId { get; set; }

        [MaxLength(32)]
        public string? ManagerAction { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ResolvedAt { get; set; }
    }
}
