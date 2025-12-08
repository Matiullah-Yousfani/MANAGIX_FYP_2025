using MANAGIX.Models.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MANAGIX.DataAccess.Repositories.IRepositories
{
    public interface IRoleRepository
    {
        Task<Role?> GetByIdAsync(Guid id);
        Task<Role?> GetByNameAsync(string roleName);
        Task<IEnumerable<Role>> GetAllAsync();
        Task AddAsync(Role role);
        void Update(Role role);
        void Remove(Role role);
    }
}
