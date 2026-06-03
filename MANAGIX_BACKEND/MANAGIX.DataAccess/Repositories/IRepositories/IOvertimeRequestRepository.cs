using MANAGIX.Models.Models;
using System;
using System.Threading.Tasks;

namespace MANAGIX.DataAccess.Repositories.IRepositories
{
    public interface IOvertimeRequestRepository
    {
        Task AddAsync(OvertimeRequest request);
        void Update(OvertimeRequest request);
        Task<OvertimeRequest?> GetByIdAsync(Guid id);
        Task<OvertimeRequest?> GetForUserOnDateAsync(Guid userId, DateTime workDateUtc);
        Task<OvertimeRequest?> GetOpenForUserOnDateAsync(Guid userId, DateTime workDateUtc);
    }
}
