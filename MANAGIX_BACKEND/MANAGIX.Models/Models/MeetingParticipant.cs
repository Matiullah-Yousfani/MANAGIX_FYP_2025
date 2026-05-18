using System;
using System.ComponentModel.DataAnnotations;

namespace MANAGIX.Models.Models
{
    // PHASE 0 / PHASE 4: Who is invited / attended a meeting.
    // Drives the participant list UI and the per-participant notification fan-out.
    public class MeetingParticipant
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public Guid MeetingId { get; set; }

        [Required]
        public Guid UserId { get; set; }

        // Host / Attendee / Optional — purely informational; auth uses UserId only.
        [MaxLength(16)]
        public string Role { get; set; } = "Attendee";

        public DateTime AddedAt { get; set; } = DateTime.UtcNow;
    }
}
