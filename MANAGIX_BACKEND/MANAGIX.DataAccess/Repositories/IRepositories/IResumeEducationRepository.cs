using MANAGIX.Models.Models;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace MANAGIX.DataAccess.Repositories.IRepositories
{
    public interface IResumeEducationRepository
    {
        Task AddAsync(ResumeEducation education);
        Task<List<ResumeEducation>> GetByUserIdAsync(Guid userId);
        void Update(ResumeEducation education);
        void Remove(ResumeEducation education);
        Task RemoveByUserIdAsync(Guid userId);
    }
}
