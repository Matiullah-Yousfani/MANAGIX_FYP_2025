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
    public class TimeEntryRepository : ITimeEntryRepository
    {
        private readonly ApplicationDbContext _context;
        public TimeEntryRepository(ApplicationDbContext context) => _context = context;

        public async Task AddAsync(TimeEntry entry) => await _context.Set<TimeEntry>().AddAsync(entry);

        public void Update(TimeEntry entry) => _context.Set<TimeEntry>().Update(entry);

        public async Task<TimeEntry?> GetOpenEntryAsync(Guid userId) =>
            await _context.Set<TimeEntry>()
                .Where(t => t.UserId == userId && t.EndedAt == null)
                .OrderByDescending(t => t.StartedAt)
                .FirstOrDefaultAsync();

        public async Task<List<TimeEntry>> GetByUserAsync(Guid userId, int limit = 50) =>
            await _context.Set<TimeEntry>()
                .Where(t => t.UserId == userId)
                .OrderByDescending(t => t.StartedAt)
                .Take(limit)
                .ToListAsync();

        public async Task<List<TimeEntry>> GetByProjectAsync(Guid projectId) =>
            await _context.Set<TimeEntry>()
                .Where(t => t.ProjectId == projectId && t.EndedAt != null)
                .ToListAsync();

        public async Task<decimal> SumHoursByUserAsync(Guid userId, DateTime? since = null)
        {
            var q = _context.Set<TimeEntry>().Where(t => t.UserId == userId && t.EndedAt != null);
            if (since.HasValue) q = q.Where(t => t.StartedAt >= since.Value);
            return await q.SumAsync(t => t.Hours);
        }

        public async Task<decimal> SumHoursByUserForUtcDayAsync(Guid userId, DateTime utcDay)
        {
            var start = utcDay.Date;
            var end = start.AddDays(1);
            return await _context.Set<TimeEntry>()
                .Where(t => t.UserId == userId && t.EndedAt != null
                    && t.StartedAt >= start && t.StartedAt < end)
                .SumAsync(t => t.Hours);
        }

        public async Task<decimal> SumHoursByProjectAsync(Guid projectId) =>
            await _context.Set<TimeEntry>()
                .Where(t => t.ProjectId == projectId && t.EndedAt != null)
                .SumAsync(t => t.Hours);

        public async Task<List<TimeEntry>> GetEntriesForUserOnUtcDayAsync(Guid userId, DateTime utcDay)
        {
            var start = utcDay.Date;
            var end = start.AddDays(1);
            return await _context.Set<TimeEntry>()
                .Where(t => t.UserId == userId && t.StartedAt >= start && t.StartedAt < end)
                .ToListAsync();
        }

        public void RemoveRange(IEnumerable<TimeEntry> entries) => _context.Set<TimeEntry>().RemoveRange(entries);
    }
}
