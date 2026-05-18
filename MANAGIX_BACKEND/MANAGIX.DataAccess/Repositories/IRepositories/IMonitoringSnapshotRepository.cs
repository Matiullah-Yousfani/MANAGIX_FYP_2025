using MANAGIX.Models.Models;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace MANAGIX.DataAccess.Repositories.IRepositories
{
    // PHASE 5: Persisted aggregate metrics per project for trend charts in the admin panel.
    public interface IMonitoringSnapshotRepository
    {
        Task AddAsync(MonitoringSnapshot snapshot);
        Task<MonitoringSnapshot?> GetLatestForProjectAsync(Guid projectId);
        Task<List<MonitoringSnapshot>> GetForProjectAsync(Guid projectId, int limit = 30);
    }
}
