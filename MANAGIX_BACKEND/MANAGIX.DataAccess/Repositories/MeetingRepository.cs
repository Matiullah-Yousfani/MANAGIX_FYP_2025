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
                orderby m.ScheduledAt
                select m
            ).Distinct().ToListAsync();
        }

        public void Update(Meeting meeting) => _context.Meetings.Update(meeting);
        public void Remove(Meeting meeting) => _context.Meetings.Remove(meeting);
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
