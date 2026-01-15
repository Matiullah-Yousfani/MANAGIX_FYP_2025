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
    public class ResumeEducationRepository : IResumeEducationRepository
    {
        private readonly ApplicationDbContext _context;

        public ResumeEducationRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task AddAsync(ResumeEducation education) =>
            await _context.ResumeEducations.AddAsync(education);

        public async Task<List<ResumeEducation>> GetByUserIdAsync(Guid userId) =>
            await _context.ResumeEducations
                .Where(e => e.UserId == userId)
                .OrderByDescending(e => e.CreatedAt)
                .ToListAsync();

        public void Update(ResumeEducation education) =>
            _context.ResumeEducations.Update(education);

        public void Remove(ResumeEducation education) =>
            _context.ResumeEducations.Remove(education);

        public async Task RemoveByUserIdAsync(Guid userId)
        {
            var educations = await _context.ResumeEducations
                .Where(e => e.UserId == userId)
                .ToListAsync();
            _context.ResumeEducations.RemoveRange(educations);
        }
    }
}
