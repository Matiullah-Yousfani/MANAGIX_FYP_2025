using MANAGIX.DataAccess.Data;
using MANAGIX.DataAccess.Repositories.IRepositories;
using MANAGIX.Models.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MANAGIX.DataAccess.Repositories
{
    public class TeamEmployeeRepository : ITeamEmployeeRepository
    {
        private readonly ApplicationDbContext _context;
        public TeamEmployeeRepository(ApplicationDbContext context) => _context = context;

        public async Task AddAsync(TeamEmployee entity) =>
            await _context.TeamEmployees.AddAsync(entity);

        public async Task<List<TeamEmployee>> GetEmployeesByTeamIdAsync(Guid teamId)
        {
            return await _context.TeamEmployees
                .Where(te => te.TeamId == teamId)
                .ToListAsync();
        }


        public void Remove(TeamEmployee entity) =>
        _context.TeamEmployees.Remove(entity);

        public async Task<TeamEmployee?> GetAsync(Guid teamId, Guid employeeId) =>
        await _context.TeamEmployees
            .FirstOrDefaultAsync(te => te.TeamId == teamId && te.EmployeeId == employeeId);

        public async Task<bool> ExistsAsync(Guid teamId, Guid employeeId) =>
            await _context.TeamEmployees.AnyAsync(te => te.TeamId == teamId && te.EmployeeId == employeeId);

        public async Task<bool> IsEmployeeOnAnyTeamAsync(Guid employeeId) =>
            await _context.TeamEmployees.AnyAsync(te => te.EmployeeId == employeeId);

        // PHASE 0: Returns the single active assignment, if any. The DB-level filtered unique
        // index guarantees at most one row matches.
        public async Task<TeamEmployee?> GetActiveAssignmentAsync(Guid employeeId) =>
            await _context.TeamEmployees
                .FirstOrDefaultAsync(te => te.EmployeeId == employeeId && te.IsActive);

        // PHASE 0: Used by AI cross-project filter. Excludes the requesting project so its own
        // members aren't filtered out.
        public async Task<bool> IsEmployeeOnAnotherActiveProjectAsync(Guid employeeId, Guid? excludeProjectId) =>
            await _context.TeamEmployees.AnyAsync(te =>
                te.EmployeeId == employeeId &&
                te.IsActive &&
                te.ProjectId != null &&
                (excludeProjectId == null || te.ProjectId != excludeProjectId));

        // PHASE 0: Bulk variant — single round-trip to build the "busy" set.
        public async Task<HashSet<Guid>> GetActivelyAssignedEmployeeIdsAsync(Guid? excludeProjectId)
        {
            var query = _context.TeamEmployees
                .Where(te => te.IsActive && te.ProjectId != null);

            if (excludeProjectId.HasValue)
                query = query.Where(te => te.ProjectId != excludeProjectId.Value);

            var ids = await query.Select(te => te.EmployeeId).Distinct().ToListAsync();
            return new HashSet<Guid>(ids);
        }
    }
}
