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
    public class ResumeSkillRepository : IResumeSkillRepository
    {
        private readonly ApplicationDbContext _context;

        public ResumeSkillRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task AddAsync(ResumeSkill skill) =>
            await _context.ResumeSkills.AddAsync(skill);

        public async Task<List<ResumeSkill>> GetByUserIdAsync(Guid userId) =>
            await _context.ResumeSkills
                .Where(s => s.UserId == userId)
                .OrderByDescending(s => s.CreatedAt)
                .ToListAsync();

        public void Update(ResumeSkill skill) =>
            _context.ResumeSkills.Update(skill);

        public void Remove(ResumeSkill skill) =>
            _context.ResumeSkills.Remove(skill);

        public async Task RemoveByUserIdAsync(Guid userId)
        {
            var skills = await _context.ResumeSkills
                .Where(s => s.UserId == userId)
                .ToListAsync();
            _context.ResumeSkills.RemoveRange(skills);
        }
    }
}
