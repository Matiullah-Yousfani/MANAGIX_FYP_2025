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
    public class ResumeExperienceRepository : IResumeExperienceRepository
    {
        private readonly ApplicationDbContext _context;

        public ResumeExperienceRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task AddAsync(ResumeExperience experience) =>
            await _context.ResumeExperiences.AddAsync(experience);

        public async Task<List<ResumeExperience>> GetByUserIdAsync(Guid userId) =>
            await _context.ResumeExperiences
                .Where(e => e.UserId == userId)
                .OrderByDescending(e => e.CreatedAt)
                .ToListAsync();

        public void Update(ResumeExperience experience) =>
            _context.ResumeExperiences.Update(experience);

        public void Remove(ResumeExperience experience) =>
            _context.ResumeExperiences.Remove(experience);

        public async Task RemoveByUserIdAsync(Guid userId)
        {
            var experiences = await _context.ResumeExperiences
                .Where(e => e.UserId == userId)
                .ToListAsync();
            _context.ResumeExperiences.RemoveRange(experiences);
        }
    }
}
