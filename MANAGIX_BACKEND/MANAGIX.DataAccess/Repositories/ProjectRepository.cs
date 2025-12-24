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

        public async Task<List<Project>> GetAllAsync() =>
            await _context.Projects.ToListAsync();

        public async Task<Project?> GetByIdAsync(Guid id) =>
            await _context.Projects.FirstOrDefaultAsync(p => p.ProjectId == id);

        public void Update(Project project) =>
          _context.Projects.Update(project);

        public async Task<List<Project>> GetByManagerIdAsync(Guid managerId)
        {
            return await _context.Projects
                .Where(p => p.CreatedBy == managerId)
                .ToListAsync();
        }

        public void Remove(Project project)
        {
            _context.Projects.Remove(project);
        }
    }
}
