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
    public class ProjectRepository:IProjectRepository
    {
        private readonly ApplicationDbContext _context;
        public ProjectRepository(ApplicationDbContext context) => _context = context;

        public async Task AddAsync(Project project) =>
            await _context.Projects.AddAsync(project);

        // PHASE 2: Include ProjectModel so the response carries Methodology — the frontend
        // dashboard dispatcher reads this to pick the right view (Agile/Scrum/Kanban/Waterfall).
        public async Task<List<Project>> GetAllAsync() =>
            await _context.Projects
                .Include(p => p.ProjectModel)
                .ToListAsync();

        public async Task<Project?> GetByIdAsync(Guid id) =>
            await _context.Projects
                .Include(p => p.ProjectModel)
                .FirstOrDefaultAsync(p => p.ProjectId == id);

        public void Update(Project project) =>
          _context.Projects.Update(project);

        public async Task<List<Project>> GetByManagerIdAsync(Guid managerId)
        {
            return await _context.Projects
                .Include(p => p.ProjectModel) // PHASE 2
                .Where(p => p.CreatedBy == managerId)
                .ToListAsync();
        }

        public void Remove(Project project)
        {
            _context.Projects.Remove(project);
        }
        public async Task<IEnumerable<Project>> GetProjectsByUserIdAsync(Guid userId)
        {
            return await _context.Projects
                .Include(p => p.ProjectModel) // PHASE 2
                .Where(p => _context.ProjectTeams
                    .Any(pt => pt.ProjectId == p.ProjectId &&
                               _context.TeamEmployees.Any(te => te.TeamId == pt.TeamId && te.EmployeeId == userId)))
                .ToListAsync();
        }

        public async Task<bool> ExistsByManagerAndTitleAsync(Guid managerId, string title, Guid? excludeProjectId)
        {
            var normalized = title.Trim().ToLowerInvariant();
            return await _context.Projects.AnyAsync(p =>
                p.CreatedBy == managerId &&
                p.Title.ToLower() == normalized &&
                (!excludeProjectId.HasValue || p.ProjectId != excludeProjectId.Value));
        }
    }
}
