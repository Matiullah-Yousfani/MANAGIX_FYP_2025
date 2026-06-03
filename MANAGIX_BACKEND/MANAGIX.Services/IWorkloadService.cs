using MANAGIX.Models.DTO;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace MANAGIX.Services
{
    public interface IWorkloadService
    {
        Task<WorkloadEntryDto> GetEmployeeLoadAsync(Guid userId, Guid? projectId = null);
        Task<ProjectWorkloadDto> GetProjectWorkloadAsync(Guid projectId);
        /// <summary>All scoped members (manager's project teams) or all employees when managerId is null (admin).</summary>
        Task<List<WorkloadEntryDto>> GetTeamWorkloadAsync(Guid? managerId);
        Task<List<WorkloadEntryDto>> GetOverloadedEmployeesAsync(double threshold = 0.9, Guid? managerId = null);
    }
}
