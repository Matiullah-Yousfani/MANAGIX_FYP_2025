using MANAGIX.Models.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MANAGIX.DataAccess.Repositories.IRepositories
{
    public interface IUserProfileRepository
    {
        Task<UserProfile?> GetByUserIdAsync(Guid userId);
        Task AddAsync(UserProfile profile);
        void Update(UserProfile profile);
        void Remove(UserProfile profile);

        Task<UserProfile> UpdateResumePathAsync(Guid userId, string resumePath);

    }
}
