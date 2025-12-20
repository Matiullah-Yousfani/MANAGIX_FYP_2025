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
    }
}
