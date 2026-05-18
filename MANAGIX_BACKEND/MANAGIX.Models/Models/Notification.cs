using System;
using System.ComponentModel.DataAnnotations;

namespace MANAGIX.Models.Models
{
    // PHASE 0 / PHASE 4: Per-user notification row. Read by the bell-icon panel in Layout.tsx.
    // Indexed by (UserId, IsRead, CreatedAt DESC) for fast unread fetches.
    public class Notification
    {
        [Key]
        public Guid NotificationId { get; set; } = Guid.NewGuid();

        [Required]
        public Guid UserId { get; set; }

        // Type drives the icon/colour and the click-through link target.
        // Values: MeetingInvite | MeetingStarting | TaskAssigned | TaskExtractedFromMeeting
        //         | WorkloadAlert | ProjectMilestone
        [Required]
        [MaxLength(40)]
        public string Type { get; set; } = "Generic";

        [Required]
        public string Title { get; set; } = null!;

        public string? Body { get; set; }

        // Optional client-side route to navigate to on click, e.g. "/projects/{id}".
        [MaxLength(256)]
        public string? Link { get; set; }

        public bool IsRead { get; set; } = false;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
