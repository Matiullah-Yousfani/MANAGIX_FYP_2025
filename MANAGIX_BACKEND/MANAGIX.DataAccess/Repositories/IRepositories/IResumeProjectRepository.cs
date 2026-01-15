using MANAGIX.Models.Models;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace MANAGIX.DataAccess.Repositories.IRepositories
{
    public interface IResumeProjectRepository
    {
        Task AddAsync(ResumeProject project);
        Task<List<ResumeProject>> GetByUserIdAsync(Guid userId);
        void Update(ResumeProject project);
        void Remove(ResumeProject project);
        Task RemoveByUserIdAsync(Guid userId);
    }
}
