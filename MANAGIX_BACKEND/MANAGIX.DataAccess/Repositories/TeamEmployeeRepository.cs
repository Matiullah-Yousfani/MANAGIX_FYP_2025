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

        public async Task<List<Guid>> GetEmployeesByTeamIdAsync(Guid teamId) =>
            await _context.TeamEmployees
                          .Where(te => te.TeamId == teamId)
                          .Select(te => te.EmployeeId)
                          .ToListAsync();
    }
}
