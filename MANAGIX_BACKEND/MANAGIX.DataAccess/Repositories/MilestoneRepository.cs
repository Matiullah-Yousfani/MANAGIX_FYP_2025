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
    public class MilestoneRepository:IMilestoneRepository
    {
        private readonly ApplicationDbContext _context;
        public MilestoneRepository(ApplicationDbContext context) => _context = context;

        public async Task AddAsync(Milestone milestone) =>
            await _context.Milestones.AddAsync(milestone);

        public async Task<Milestone?> GetByIdAsync(Guid milestoneId) =>
          await _context.Milestones.FirstOrDefaultAsync(m => m.MilestoneId == milestoneId);

        public async Task<List<Milestone>> GetByProjectIdAsync(Guid projectId) =>
            await _context.Milestones
                          .Where(m => m.ProjectId == projectId)
                          .ToListAsync();

        public void Update(Milestone milestone) =>
            _context.Milestones.Update(milestone);
        public void Remove(Milestone milestone)
        {
            _context.Milestones.Remove(milestone);
        }

    }
}
