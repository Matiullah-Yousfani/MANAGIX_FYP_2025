using System;
using System.ComponentModel.DataAnnotations;

namespace MANAGIX.Models.Models
{
    /// <summary>Per-participant transcript captured when they leave a scheduled meeting.</summary>
    public class MeetingParticipantTranscript
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        public Guid MeetingId { get; set; }

        public Guid UserId { get; set; }

        public string TranscriptText { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
