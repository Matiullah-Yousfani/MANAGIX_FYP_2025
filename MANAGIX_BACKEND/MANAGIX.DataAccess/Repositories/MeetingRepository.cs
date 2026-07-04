using MANAGIX.DataAccess.Data;
using MANAGIX.DataAccess.Repositories.IRepositories;
using MANAGIX.Models.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace MANAGIX.DataAccess.Repositories
{
    // PHASE 4: Meeting persistence.
    public class MeetingRepository : IMeetingRepository
    {
        private readonly ApplicationDbContext _context;
        public MeetingRepository(ApplicationDbContext context) => _context = context;

        public async Task AddAsync(Meeting meeting) => await _context.Meetings.AddAsync(meeting);

        public async Task<Meeting?> GetByIdAsync(Guid meetingId) =>
            await _context.Meetings.FirstOrDefaultAsync(m => m.MeetingId == meetingId);

        public async Task<List<Meeting>> GetByProjectAsync(Guid projectId) =>
            await _context.Meetings
                .Where(m => m.ProjectId == projectId)
                .OrderByDescending(m => m.ScheduledAt)
                .ToListAsync();

        // Upcoming = scheduled within the next 14 days, where the user is a participant.
        public async Task<List<Meeting>> GetUpcomingForUserAsync(Guid userId)
        {
            var horizon = DateTime.UtcNow.AddDays(14);
            return await (
                from m in _context.Meetings
                join p in _context.MeetingParticipants on m.MeetingId equals p.MeetingId
                where p.UserId == userId
                   && m.ScheduledAt >= DateTime.UtcNow
                   && m.ScheduledAt <= horizon
                   && m.Status != "Cancelled"
                   && m.Status != "Expired"
                orderby m.ScheduledAt
                select m
            ).Distinct().ToListAsync();
        }

        public async Task<List<Meeting>> GetActiveForUserAsync(Guid userId, DateTime utcNow) =>
            await (
                from m in _context.Meetings
                join p in _context.MeetingParticipants on m.MeetingId equals p.MeetingId
                where p.UserId == userId
                   && m.MeetingLink != null
                   && m.Status != "Cancelled"
                   && m.Status != "Completed"
                   && m.Status != "Expired"
                   && m.ScheduledAt <= utcNow
                   && m.ScheduledAt.AddMinutes(m.DurationMinutes > 0 ? m.DurationMinutes : 60) > utcNow
                orderby m.ScheduledAt
                select m
            ).Distinct().ToListAsync();

        public async Task<List<Meeting>> GetHistoryForUserAsync(Guid userId) =>
            await (
                from m in _context.Meetings
                join p in _context.MeetingParticipants on m.MeetingId equals p.MeetingId
                where p.UserId == userId
                   && (m.Status == "Completed" || m.TranscriptText != null)
                orderby m.ScheduledAt descending
                select m
            ).Distinct().ToListAsync();

        public async Task<List<Meeting>> GetConductedForManagerAsync(Guid managerId) =>
            await (
                from m in _context.Meetings
                join pr in _context.Projects on m.ProjectId equals pr.ProjectId
                where pr.CreatedBy == managerId
                   && (m.Status == "Completed" || m.SummaryText != null || m.TranscriptText != null)
                orderby m.ScheduledAt descending
                select m
            ).Distinct().ToListAsync();

        public async Task<List<Meeting>> GetPastScheduledAsync(DateTime utcNow) =>
            await _context.Meetings
                .Where(m =>
                    (m.Status == "Scheduled" || m.Status == "Live" || m.Status == "LinkDisabled") &&
                    m.MeetingLink != null)
                .ToListAsync();

        public async Task<List<Meeting>> GetMeetingsNeedingExpirationAsync(DateTime utcNow) =>
            await _context.Meetings
                .Where(m =>
                    m.MeetingLink != null &&
                    m.Status != "Completed" &&
                    m.Status != "Cancelled" &&
                    m.Status != "Expired" &&
                    m.ScheduledAt.AddMinutes(m.DurationMinutes > 0 ? m.DurationMinutes : 30) <= utcNow)
                .ToListAsync();

        public void Update(Meeting meeting) => _context.Meetings.Update(meeting);
        public void Remove(Meeting meeting) => _context.Meetings.Remove(meeting);
    }

    public class MeetingParticipantTranscriptRepository : IMeetingParticipantTranscriptRepository
    {
        private readonly ApplicationDbContext _context;
        public MeetingParticipantTranscriptRepository(ApplicationDbContext context) => _context = context;

        public async Task AddAsync(MeetingParticipantTranscript row) =>
            await _context.MeetingParticipantTranscripts.AddAsync(row);

        public async Task<MeetingParticipantTranscript?> GetAsync(Guid meetingId, Guid userId) =>
            await _context.MeetingParticipantTranscripts
                .FirstOrDefaultAsync(t => t.MeetingId == meetingId && t.UserId == userId);

        public async Task<List<MeetingParticipantTranscript>> GetByMeetingAsync(Guid meetingId) =>
            await _context.MeetingParticipantTranscripts
                .Where(t => t.MeetingId == meetingId)
                .OrderBy(t => t.CreatedAt)
                .ToListAsync();

        public void Update(MeetingParticipantTranscript row) =>
            _context.MeetingParticipantTranscripts.Update(row);
    }

    // PHASE 4: MeetingParticipant persistence.
    public class MeetingParticipantRepository : IMeetingParticipantRepository
    {
        private readonly ApplicationDbContext _context;
        public MeetingParticipantRepository(ApplicationDbContext context) => _context = context;

        public async Task AddAsync(MeetingParticipant participant) =>
            await _context.MeetingParticipants.AddAsync(participant);

        public async Task<List<MeetingParticipant>> GetByMeetingAsync(Guid meetingId) =>
            await _context.MeetingParticipants
                .Where(p => p.MeetingId == meetingId)
                .ToListAsync();

        public async Task<List<Guid>> GetUserIdsForMeetingAsync(Guid meetingId) =>
            await _context.MeetingParticipants
                .Where(p => p.MeetingId == meetingId)
                .Select(p => p.UserId)
                .ToListAsync();

        public async Task<bool> ExistsAsync(Guid meetingId, Guid userId) =>
            await _context.MeetingParticipants
                .AnyAsync(p => p.MeetingId == meetingId && p.UserId == userId);

        public void Remove(MeetingParticipant participant) =>
            _context.MeetingParticipants.Remove(participant);
    }
}
