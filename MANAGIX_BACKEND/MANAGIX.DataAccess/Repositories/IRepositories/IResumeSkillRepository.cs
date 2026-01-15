using MANAGIX.Models.Models;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace MANAGIX.DataAccess.Repositories.IRepositories
{
    public interface IResumeSkillRepository
    {
        Task AddAsync(ResumeSkill skill);
        Task<List<ResumeSkill>> GetByUserIdAsync(Guid userId);
        void Update(ResumeSkill skill);
        void Remove(ResumeSkill skill);
        Task RemoveByUserIdAsync(Guid userId);
    }
}
