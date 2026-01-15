using MANAGIX.DataAccess.Data;
using MANAGIX.DataAccess.Repositories.IRepositories;
using MANAGIX.Models.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace MANAGIX.DataAccess.Repositories
{
    public class ResumeProjectRepository : IResumeProjectRepository
    {
        private readonly ApplicationDbContext _context;

        public ResumeProjectRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task AddAsync(ResumeProject project) =>
            await _context.ResumeProjects.AddAsync(project);

        public async Task<List<ResumeProject>> GetByUserIdAsync(Guid userId) =>
            await _context.ResumeProjects
                .Where(p => p.UserId == userId)
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();

        public void Update(ResumeProject project) =>
            _context.ResumeProjects.Update(project);

        public void Remove(ResumeProject project) =>
            _context.ResumeProjects.Remove(project);

        public async Task RemoveByUserIdAsync(Guid userId)
        {
            var projects = await _context.ResumeProjects
                .Where(p => p.UserId == userId)
                .ToListAsync();
            _context.ResumeProjects.RemoveRange(projects);
        }
    }
}
