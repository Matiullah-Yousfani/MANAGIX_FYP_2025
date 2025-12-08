using MANAGIX.Models.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MANAGIX.DataAccess.Repositories.IRepositories
{
    public interface IUserRoleRepository
    {
        Task<UserRole?> GetByIdAsync(Guid id);
        Task AddAsync(UserRole userRole);
        void Remove(UserRole userRole);
    }
}
