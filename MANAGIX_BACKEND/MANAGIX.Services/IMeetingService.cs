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

        // Saves the transcript and flips status to Completed.
        Task<bool> CompleteWithTranscriptAsync(Guid meetingId, string transcriptText);

        // Calls the AI extractor (Python service) on the saved transcript and returns suggestions.
        // The caller (frontend) then confirms which to convert into real tasks.
        Task<ExtractTasksResponseDto> ExtractTasksAsync(Guid meetingId);

        Task<List<Guid>> ResolveProjectParticipantIdsAsync(Guid projectId);

        Task<MeetingJoinStatusDto?> GetJoinStatusAsync(Guid meetingId, Guid userId);

        Task<int> ExpirePastMeetingsAsync();
    }
}
