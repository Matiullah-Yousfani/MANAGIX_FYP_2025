using System;
using System.Collections.Generic;

namespace MANAGIX.Models.DTO
{
    // PHASE 4: Meeting persistence DTOs.
    public class MeetingCreateDto
    {
        public Guid? ProjectId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public DateTime ScheduledAt { get; set; } = DateTime.UtcNow;
        public int DurationMinutes { get; set; } = 30;
        public string? JitsiRoomName { get; set; }
        public Guid CreatedBy { get; set; }
        /// <summary>If empty, server resolves project team + QA users.</summary>
        public List<Guid> ParticipantUserIds { get; set; } = new();
    }

    public class MeetingDto
    {
        public Guid MeetingId { get; set; }
        public Guid? ProjectId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public DateTime ScheduledAt { get; set; }
        public DateTime EndsAt { get; set; }
        public int DurationMinutes { get; set; }
        public string? MeetingLink { get; set; }
        public string? JitsiRoomName { get; set; }
        public Guid CreatedBy { get; set; }
        public string Status { get; set; } = "Scheduled";
        public string? TranscriptText { get; set; }
        public List<Guid> Participants { get; set; } = new();
        /// <summary>BeforeStart | Active | Expired</summary>
        public string JoinState { get; set; } = "BeforeStart";
        public bool CanJoin { get; set; }
    }

    public class MeetingJoinStatusDto
    {
        public Guid MeetingId { get; set; }
        public string JoinState { get; set; } = "BeforeStart";
        public bool CanJoin { get; set; }
        public bool IsParticipant { get; set; }
        public string? MeetingLink { get; set; }
        public string? JitsiRoomName { get; set; }
        public string Status { get; set; } = "Scheduled";
        public DateTime ScheduledAt { get; set; }
        public DateTime EndsAt { get; set; }
        public string Title { get; set; } = string.Empty;
    }

    public class MeetingTranscriptDto
    {
        public string TranscriptText { get; set; } = string.Empty;
    }

    // ── Meeting AI task extraction ────────────────────────────────────────
    // The Python AI service returns a list of action items extracted from a transcript.
    // We map them into our Task domain in a separate confirmation step (manager reviews
    // suggestions in the UI then accepts to create real TaskItems).
    public class ExtractedTaskDto
    {
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public Guid? SuggestedAssigneeUserId { get; set; }
        public string? SuggestedAssigneeName { get; set; }
        public decimal? EstimatedHours { get; set; }
        public string? Priority { get; set; }
        public List<string> RequiredSkills { get; set; } = new();
    }

    public class ExtractTasksResponseDto
    {
        public List<ExtractedTaskDto> Tasks { get; set; } = new();
    }
}
