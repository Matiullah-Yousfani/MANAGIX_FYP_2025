using System;
using System.ComponentModel.DataAnnotations;

namespace MANAGIX.Models.Models
{
    public class TimeEntry
    {
        [Key]
        public Guid TimeEntryId { get; set; } = Guid.NewGuid();

        [Required]
        public Guid UserId { get; set; }

        public Guid? ProjectId { get; set; }
        public Guid? TaskId { get; set; }

        public DateTime StartedAt { get; set; } = DateTime.UtcNow;
        public DateTime? EndedAt { get; set; }

        public decimal Hours { get; set; }

        [MaxLength(32)]
        public string EntryType { get; set; } = "Work";

        public string? Notes { get; set; }
    }
}
