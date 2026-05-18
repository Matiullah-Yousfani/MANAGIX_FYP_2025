using MANAGIX.Models.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MANAGIX.DataAccess.Repositories.IRepositories
{
    public interface ITeamEmployeeRepository
    {
        Task AddAsync(TeamEmployee entity);
        Task<List<TeamEmployee>> GetEmployeesByTeamIdAsync(Guid teamId);

        Task<TeamEmployee?> GetAsync(Guid teamId, Guid employeeId);
        void Remove(TeamEmployee entity);
        Task<bool> ExistsAsync(Guid teamId, Guid employeeId);
        Task<bool> IsEmployeeOnAnyTeamAsync(Guid employeeId);

        // PHASE 0: Single-active-project enforcement helpers.
        // Returns the employee's currently active TeamEmployee row (IsActive=1), if any.
        Task<TeamEmployee?> GetActiveAssignmentAsync(Guid employeeId);

        // True if the employee is already on a *different* active project than excludeProjectId.
        // Used by AiAllocationService to filter the candidate pool.
        Task<bool> IsEmployeeOnAnotherActiveProjectAsync(Guid employeeId, Guid? excludeProjectId);

        // Bulk fetch — gives the list of employee IDs already busy on another active project.
        // More efficient than per-employee round-trips in cross-project filtering.
        Task<HashSet<Guid>> GetActivelyAssignedEmployeeIdsAsync(Guid? excludeProjectId);
    }
}
