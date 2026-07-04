using MANAGIX.Models.DTO;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace MANAGIX.Services
{
    // PHASE 4: Meeting CRUD + AI task extraction.
    public interface IMeetingService
    {
        Task<MeetingDto> CreateAsync(MeetingCreateDto input);
        Task<MeetingDto?> GetAsync(Guid meetingId);
        Task<List<MeetingDto>> GetByProjectAsync(Guid projectId);
        Task<List<MeetingDto>> GetUpcomingForUserAsync(Guid userId);
        Task<List<MeetingDto>> GetActiveForUserAsync(Guid userId);
        Task<List<MeetingDto>> GetHistoryForUserAsync(Guid userId);
        Task<List<MeetingDto>> GetConductedForManagerAsync(Guid managerId);
        Task<SprintPreviewDto> GetSprintPreviewAsync(Guid projectId, DateTime scheduledAt);

        Task<bool> SaveParticipantTranscriptAsync(Guid meetingId, Guid userId, string transcriptText);
        Task<List<MeetingParticipantTranscriptDto>> GetParticipantTranscriptsAsync(Guid meetingId);

        Task<bool> CompleteWithTranscriptAsync(Guid meetingId, string transcriptText);
        Task<ExtractTasksResponseDto> ExtractTasksAsync(Guid meetingId);
        Task<MeetingAnalysisResponseDto> AnalyzeMeetingAsync(Guid meetingId, Guid requestedBy);
        Task<MeetingAnalysisResponseDto?> TryFinalizeMeetingAsync(Guid meetingId, Guid requestedBy);

        Task<List<Guid>> ResolveProjectParticipantIdsAsync(Guid projectId);

        Task<MeetingJoinStatusDto?> GetJoinStatusAsync(Guid meetingId, Guid userId);
        Task<bool> VerifyJoinCodeAsync(Guid meetingId, Guid userId, string joinCode);
        Task<List<MeetingParticipantDetailDto>> GetParticipantRosterAsync(Guid meetingId);

        Task<int> ExpirePastMeetingsAsync();
    }
}
