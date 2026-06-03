using MANAGIX.Models.Models;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace MANAGIX.DataAccess.Repositories.IRepositories
{
    public interface ITimeEntryRepository
    {
        Task AddAsync(TimeEntry entry);
        void Update(TimeEntry entry);
        Task<TimeEntry?> GetOpenEntryAsync(Guid userId);
        Task<List<TimeEntry>> GetEntriesForUserOnUtcDayAsync(Guid userId, DateTime utcDay);
        void RemoveRange(IEnumerable<TimeEntry> entries);
        Task<List<TimeEntry>> GetByUserAsync(Guid userId, int limit = 50);
        Task<List<TimeEntry>> GetByProjectAsync(Guid projectId);
        Task<decimal> SumHoursByUserAsync(Guid userId, DateTime? since = null);
        Task<decimal> SumHoursByUserForUtcDayAsync(Guid userId, DateTime utcDay);
        Task<decimal> SumHoursByProjectAsync(Guid projectId);
    }
}
