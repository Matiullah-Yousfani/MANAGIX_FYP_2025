using System;

namespace MANAGIX.Models.DTO
{
    // PHASE 4: Notification payload for the bell-icon panel.
    public class NotificationDto
    {
        public Guid NotificationId { get; set; }
        public Guid UserId { get; set; }
        public string Type { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string? Body { get; set; }
        public string? Link { get; set; }
        public bool IsRead { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    // Used by the publisher when a service wants to fan out a single notification template
    // to many users (meeting invites, etc.) — see NotificationService.PublishToManyAsync.
    public class NotificationCreateDto
    {
        public string Type { get; set; } = "Generic";
        public string Title { get; set; } = string.Empty;
        public string? Body { get; set; }
        public string? Link { get; set; }
    }
}
