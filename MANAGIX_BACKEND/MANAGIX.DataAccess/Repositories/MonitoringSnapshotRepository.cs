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
    // PHASE 5: MonitoringSnapshot persistence.
    public class MonitoringSnapshotRepository : IMonitoringSnapshotRepository
    {
        private readonly ApplicationDbContext _context;
        public MonitoringSnapshotRepository(ApplicationDbContext context) => _context = context;

        public async Task AddAsync(MonitoringSnapshot snapshot) =>
            await _context.MonitoringSnapshots.AddAsync(snapshot);

        public async Task<MonitoringSnapshot?> GetLatestForProjectAsync(Guid projectId) =>
            await _context.MonitoringSnapshots
                .Where(s => s.ProjectId == projectId)
                .OrderByDescending(s => s.CapturedAt)
                .FirstOrDefaultAsync();

        public async Task<List<MonitoringSnapshot>> GetForProjectAsync(Guid projectId, int limit = 30) =>
            await _context.MonitoringSnapshots
                .Where(s => s.ProjectId == projectId)
                .OrderByDescending(s => s.CapturedAt)
                .Take(limit)
                .ToListAsync();
    }
}
