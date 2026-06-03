using MANAGIX.DataAccess.Data;
using MANAGIX.DataAccess.Repositories.IRepositories;
using MANAGIX.Models.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace MANAGIX.DataAccess.Repositories
{
    public class OvertimeRequestRepository : IOvertimeRequestRepository
    {
        private readonly ApplicationDbContext _context;
        public OvertimeRequestRepository(ApplicationDbContext context) => _context = context;

        public async Task AddAsync(OvertimeRequest request) =>
            await _context.OvertimeRequests.AddAsync(request);

        public void Update(OvertimeRequest request) => _context.OvertimeRequests.Update(request);

        public async Task<OvertimeRequest?> GetByIdAsync(Guid id) =>
            await _context.OvertimeRequests.FirstOrDefaultAsync(o => o.OvertimeRequestId == id);

        public async Task<OvertimeRequest?> GetForUserOnDateAsync(Guid userId, DateTime workDateUtc)
        {
            var day = workDateUtc.Date;
            return await _context.OvertimeRequests
                .Where(o => o.UserId == userId && o.WorkDate == day)
                .OrderByDescending(o => o.CreatedAt)
                .FirstOrDefaultAsync();
        }

        public async Task<OvertimeRequest?> GetOpenForUserOnDateAsync(Guid userId, DateTime workDateUtc)
        {
            var day = workDateUtc.Date;
            return await _context.OvertimeRequests
                .Where(o => o.UserId == userId && o.WorkDate == day && o.Status != "Resolved")
                .OrderByDescending(o => o.CreatedAt)
                .FirstOrDefaultAsync();
        }
    }
}
