using MANAGIX.Models.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MANAGIX.DataAccess.Repositories.IRepositories
{
    public interface IEmployeePerformanceRepository
    {
        Task AddAsync(EmployeePerformance performance);

        Task<EmployeePerformance?> GetByEmployeeAndProjectAsync(
            Guid employeeId,
            Guid projectId
        );

        Task<List<EmployeePerformance>> GetByProjectIdAsync(Guid projectId);

        // PHASE 1: Average approval rate across all projects — used to weight AI suggestions.
        // Returns 0.5 (neutral) when there is no history.
        Task<double> GetAverageApprovalRateAsync(Guid employeeId);

        void Remove(EmployeePerformance performance);
    }
}
