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
    public class ProjectTeamRepository:IProjectTeamRepository
    {
        private readonly ApplicationDbContext _context;
        public ProjectTeamRepository(ApplicationDbContext context) => _context = context;

        public async Task AddAsync(ProjectTeam entity) =>
            await _context.ProjectTeams.AddAsync(entity);

        public async Task<ProjectTeam?> GetByProjectIdAsync(Guid projectId) =>
            await _context.ProjectTeams.FirstOrDefaultAsync(pt => pt.ProjectId == projectId);
    }
}
