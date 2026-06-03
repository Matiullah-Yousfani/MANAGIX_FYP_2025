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
    public class DailyTimesheetRepository : IDailyTimesheetRepository
    {
        private readonly ApplicationDbContext _context;
        public DailyTimesheetRepository(ApplicationDbContext context) => _context = context;

        public async Task AddAsync(DailyTimesheet sheet) => await _context.DailyTimesheets.AddAsync(sheet);
        public void Update(DailyTimesheet sheet) => _context.DailyTimesheets.Update(sheet);
        public void Remove(DailyTimesheet sheet) => _context.DailyTimesheets.Remove(sheet);

        public async Task<DailyTimesheet?> GetByIdAsync(Guid dailyTimesheetId) =>
            await _context.DailyTimesheets.FirstOrDefaultAsync(d => d.DailyTimesheetId == dailyTimesheetId);

        public async Task<DailyTimesheet?> GetByUserAndDateAsync(Guid userId, DateTime workDateUtc)
        {
            var day = workDateUtc.Date;
            return await _context.DailyTimesheets
                .Where(d => d.UserId == userId && d.WorkDate == day)
                .OrderByDescending(d => d.CreatedAt)
                .FirstOrDefaultAsync();
        }

        public async Task<List<DailyTimesheet>> GetByUserAsync(Guid userId, int limit = 30) =>
            await _context.DailyTimesheets
                .Where(d => d.UserId == userId)
                .OrderByDescending(d => d.WorkDate)
                .Take(limit)
                .ToListAsync();

        public async Task<List<DailyTimesheet>> GetByUserIdsAsync(IEnumerable<Guid> userIds, DateTime? from = null, DateTime? to = null)
        {
            var ids = userIds.ToList();
            var q = _context.DailyTimesheets.Where(d => ids.Contains(d.UserId));
            if (from.HasValue) q = q.Where(d => d.WorkDate >= from.Value.Date);
            if (to.HasValue) q = q.Where(d => d.WorkDate <= to.Value.Date);
            return await q.OrderByDescending(d => d.WorkDate).ToListAsync();
        }

        public async Task<List<DailyTimesheet>> GetAllAsync(DateTime? from = null, DateTime? to = null, int limit = 200)
        {
            var q = _context.DailyTimesheets.AsQueryable();
            if (from.HasValue) q = q.Where(d => d.WorkDate >= from.Value.Date);
            if (to.HasValue) q = q.Where(d => d.WorkDate <= to.Value.Date);
            return await q.OrderByDescending(d => d.WorkDate).Take(limit).ToListAsync();
        }

        public async Task<List<DailyTimesheet>> GetUnsubmittedBeforeDateAsync(Guid userId, DateTime beforeUtcDate)
        {
            var cutoff = beforeUtcDate.Date;
            return await _context.DailyTimesheets
                .Where(d => d.UserId == userId
                    && d.WorkDate < cutoff
                    && d.Status != "Submitted"
                    && d.Status != "Approved")
                .ToListAsync();
        }
    }
}
