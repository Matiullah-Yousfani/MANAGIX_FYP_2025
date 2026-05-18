using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MANAGIX.Models.Models
{
    // PHASE 0 / PHASE 4: Meeting record persisted per Jitsi room.
    // Powers: meeting history, AI task extraction (transcript → tasks), and notification fan-out.
    public class Meeting
    {
        [Key]
        public Guid MeetingId { get; set; } = Guid.NewGuid();

        // Optional — ad-hoc meetings (no project) are allowed.
        public Guid? ProjectId { get; set; }

        [Required]
        public string Title { get; set; } = null!;

        public DateTime ScheduledAt { get; set; } = DateTime.UtcNow;

        public int DurationMinutes { get; set; } = 30;

        // Identifier passed to Jitsi when the room is opened. We store it so the same meeting can be re-joined.
        [MaxLength(128)]
        public string? JitsiRoomName { get; set; }

        [Required]
        public Guid CreatedBy { get; set; } // Manager / scheduler UserId

        // Lifecycle: Scheduled → Live → Completed (or Cancelled).
        [MaxLength(16)]
        public string Status { get; set; } = "Scheduled";

        // Captured on completion — fed to AI extractor to suggest action-item tasks.
        public string? TranscriptText { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
