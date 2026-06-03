using MANAGIX.Models.Models;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace MANAGIX.DataAccess.Repositories.IRepositories
{
    // PHASE 4: Meeting CRUD + project/user-scoped queries.
    public interface IMeetingRepository
    {
        Task AddAsync(Meeting meeting);
        Task<Meeting?> GetByIdAsync(Guid meetingId);
        Task<List<Meeting>> GetByProjectAsync(Guid projectId);
        Task<List<Meeting>> GetUpcomingForUserAsync(Guid userId);
        Task<List<Meeting>> GetPastScheduledAsync(DateTime utcNow);
        void Update(Meeting meeting);
        void Remove(Meeting meeting);
    }

    // Participants are managed alongside meetings — kept in the same file to mirror the
    // ResumeEducation/ResumeSkill split-file pattern would be over-spec'd here.
    public interface IMeetingParticipantRepository
    {
        Task AddAsync(MeetingParticipant participant);
        Task<List<MeetingParticipant>> GetByMeetingAsync(Guid meetingId);
        Task<List<Guid>> GetUserIdsForMeetingAsync(Guid meetingId);
        Task<bool> ExistsAsync(Guid meetingId, Guid userId);
        void Remove(MeetingParticipant participant);
    }
}
