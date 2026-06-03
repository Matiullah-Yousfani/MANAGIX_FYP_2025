using MANAGIX.Models.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MANAGIX.DataAccess.Repositories.IRepositories
{
    public interface IUserRepository
    {
        Task<User?> GetByIdAsync(Guid id);
        Task<User?> GetByEmailAsync(string email);
        Task<IEnumerable<User>> GetAllAsync();
        Task<List<User>> GetAllWithRolesAndProfileAsync();
        Task<List<Guid>> GetUserIdsByRoleNameAsync(string roleName);
        Task AddAsync(User user);
        void Update(User user);
        void Remove(User user);
    }
}
