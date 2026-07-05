using MANAGIX.Models.DTO;
using System;
using System.Threading.Tasks;

namespace MANAGIX.Services
{
    // PHASE 5: Aggregates data from existing repos (Tasks, Projects, EmployeePerformance,
    // Workload) into admin-friendly health DTOs.
    public interface IMonitoringService
    {
        Task<SystemHealthDto> GetSystemHealthAsync();
        Task<ProjectHealthDto> GetProjectHealthAsync(Guid projectId);
        Task<AdminDashboardDto> GetAdminDashboardAsync();
    }
}
