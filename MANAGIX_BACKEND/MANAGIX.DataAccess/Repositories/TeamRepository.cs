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
    public class TeamRepository:ITeamRepository
    {
        private readonly ApplicationDbContext _context;
        public TeamRepository(ApplicationDbContext context) => _context = context;

        public async Task AddAsync(Team team) =>
            await _context.Teams.AddAsync(team);

        public async Task<List<Team>> GetAllAsync() =>
        await _context.Teams.ToListAsync();

        public async Task<Team?> GetByIdAsync(Guid id) =>
            await _context.Teams.FirstOrDefaultAsync(t => t.TeamId == id);
    }
}
