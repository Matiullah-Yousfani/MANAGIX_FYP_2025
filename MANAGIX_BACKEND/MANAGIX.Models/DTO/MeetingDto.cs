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
        /// <summary>Preferred: set EndsAt; otherwise DurationMinutes is used.</summary>
        public DateTime? EndsAt { get; set; }
        public int DurationMinutes { get; set; } = 30;
        public string? JitsiRoomName { get; set; }
        public Guid CreatedBy { get; set; }
        /// <summary>If empty, server resolves project manager + team members.</summary>
        public List<Guid> ParticipantUserIds { get; set; } = new();
    }

    public class MeetingParticipantTranscriptDto
    {
        public Guid UserId { get; set; }
        public string? UserName { get; set; }
        public string TranscriptText { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    public class MeetingParticipantTranscriptSaveDto
    {
        public Guid UserId { get; set; }
        public string TranscriptText { get; set; } = string.Empty;
    }

    public class SprintPreviewDto
    {
        public int SprintNumber { get; set; }
        public int ProjectWeek { get; set; }
    }

    public class SpeedUpAlertDto
    {
        public Guid? UserId { get; set; }
        public string? UserName { get; set; }
        public string Message { get; set; } = string.Empty;
        public string? Reason { get; set; }
    }

    public class BacklogItemDto
    {
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? Priority { get; set; }
        public Guid? SuggestedAssigneeUserId { get; set; }
        public string? SuggestedAssigneeName { get; set; }
    }

    public class MeetingAnalysisResponseDto
    {
        public string? CombinedSummary { get; set; }
        public string? MeetingNotes { get; set; }
        public string? CombinedTranscript { get; set; }
        public List<BacklogItemDto> BacklogItems { get; set; } = new();
        public List<MeetingParticipantTranscriptDto> ParticipantTranscripts { get; set; } = new();
        public List<ExtractedTaskDto> Tasks { get; set; } = new();
        public List<SpeedUpAlertDto> SpeedUpAlerts { get; set; } = new();
        public bool Finalized { get; set; }
    }

    public class MeetingParticipantDetailDto
    {
        public Guid UserId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string Role { get; set; } = "Attendee";
    }

    public class MeetingJoinCodeVerifyDto
    {
        public Guid UserId { get; set; }
        public string JoinCode { get; set; } = string.Empty;
    }

    public class MeetingDto
    {
        public Guid MeetingId { get; set; }
        public Guid? ProjectId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public DateTime ScheduledAt { get; set; }
        public DateTime EndsAt { get; set; }
        public DateTime LinkExpiresAt { get; set; }
        public int DurationMinutes { get; set; }
        public int SprintNumber { get; set; }
        public string? MeetingLink { get; set; }
        public string? JoinCode { get; set; }
        public string? JitsiRoomName { get; set; }
        public Guid CreatedBy { get; set; }
        public string Status { get; set; } = "Scheduled";
        public string? TranscriptText { get; set; }
        public string? SummaryText { get; set; }
        public string? MeetingNotesText { get; set; }
        public List<BacklogItemDto> BacklogItems { get; set; } = new();
        public List<Guid> Participants { get; set; } = new();
        /// <summary>BeforeStart | Active | LinkDisabled | Expired</summary>
        public string JoinState { get; set; } = "BeforeStart";
        public bool CanJoin { get; set; }
        public bool LinkVisible { get; set; }
        public int ParticipantTranscriptCount { get; set; }
    }

    public class MeetingJoinStatusDto
    {
        public Guid MeetingId { get; set; }
        public string JoinState { get; set; } = "BeforeStart";
        public bool CanJoin { get; set; }
        public bool LinkVisible { get; set; }
        public bool IsParticipant { get; set; }
        public string? MeetingLink { get; set; }
        public string? JitsiRoomName { get; set; }
        public string Status { get; set; } = "Scheduled";
        public DateTime ScheduledAt { get; set; }
        public DateTime EndsAt { get; set; }
        public DateTime LinkExpiresAt { get; set; }
        public int SprintNumber { get; set; }
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
