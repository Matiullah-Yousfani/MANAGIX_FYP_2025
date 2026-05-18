using MANAGIX.Models.DTO;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace MANAGIX.Services
{
    // PHASE 3: Single source of truth for workload math. Used by:
    //   - WorkloadFunction endpoints (panel UI)
    //   - AiAllocationService scoring (already passes hours via EmployeeInfoDto, but this
    //     is the canonical helper if we ever need cross-project rebalancing across projects)
    //   - MonitoringService (Phase 5 admin panel)
    public interface IWorkloadService
    {
        Task<WorkloadEntryDto> GetEmployeeLoadAsync(Guid userId);
        Task<ProjectWorkloadDto> GetProjectWorkloadAsync(Guid projectId);
        Task<List<WorkloadEntryDto>> GetOverloadedEmployeesAsync(double threshold = 0.9);
    }
}
