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
    }
}
