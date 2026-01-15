using MANAGIX.Models.Models;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace MANAGIX.DataAccess.Repositories.IRepositories
{
    public interface IResumeExperienceRepository
    {
        Task AddAsync(ResumeExperience experience);
        Task<List<ResumeExperience>> GetByUserIdAsync(Guid userId);
        void Update(ResumeExperience experience);
        void Remove(ResumeExperience experience);
        Task RemoveByUserIdAsync(Guid userId);
    }
}
