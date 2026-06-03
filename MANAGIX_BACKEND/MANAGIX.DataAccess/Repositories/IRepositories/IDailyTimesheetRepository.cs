using MANAGIX.Models.Models;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace MANAGIX.DataAccess.Repositories.IRepositories
{
    public interface IDailyTimesheetRepository
    {
        Task AddAsync(DailyTimesheet sheet);
        void Update(DailyTimesheet sheet);
        void Remove(DailyTimesheet sheet);
        Task<List<DailyTimesheet>> GetUnsubmittedBeforeDateAsync(Guid userId, DateTime beforeUtcDate);
        Task<DailyTimesheet?> GetByIdAsync(Guid dailyTimesheetId);
        Task<DailyTimesheet?> GetByUserAndDateAsync(Guid userId, DateTime workDateUtc);
        Task<List<DailyTimesheet>> GetByUserAsync(Guid userId, int limit = 30);
        Task<List<DailyTimesheet>> GetByUserIdsAsync(IEnumerable<Guid> userIds, DateTime? from = null, DateTime? to = null);
        Task<List<DailyTimesheet>> GetAllAsync(DateTime? from = null, DateTime? to = null, int limit = 200);
    }
}
