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

        public string? Description { get; set; }

        public DateTime ScheduledAt { get; set; } = DateTime.UtcNow;

        public int DurationMinutes { get; set; } = 30;

        /// <summary>Auto-derived from project week — persisted when DB column exists.</summary>
        public int SprintNumber { get; set; } = 1;

        // In-app join route or external URL shown in notifications (cleared when expired).
        [MaxLength(512)]
        public string? MeetingLink { get; set; }

        // Identifier passed to Jitsi when the room is opened. We store it so the same meeting can be re-joined.
        [MaxLength(128)]
        public string? JitsiRoomName { get; set; }

        /// <summary>6-character code required to enter the meeting room.</summary>
        [MaxLength(8)]
        public string? JoinCode { get; set; }

        [Required]
        public Guid CreatedBy { get; set; } // Manager / scheduler UserId

        // Lifecycle: Scheduled → Live → Completed | Expired | Cancelled.
        [MaxLength(16)]
        public string Status { get; set; } = "Scheduled";

        // Captured on completion — fed to AI extractor to suggest action-item tasks.
        public string? TranscriptText { get; set; }

        public string? SummaryText { get; set; }

        public string? MeetingNotesText { get; set; }

        /// <summary>JSON array of backlog items suggested by AI.</summary>
        public string? BacklogJson { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
