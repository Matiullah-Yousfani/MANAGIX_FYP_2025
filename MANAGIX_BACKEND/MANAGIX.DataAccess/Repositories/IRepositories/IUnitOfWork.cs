using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MANAGIX.DataAccess.Repositories.IRepositories
{
    public interface IUnitOfWork
    {
        IUserRepository Users { get; }
        IRoleRepository Roles { get; }
        IUserProfileRepository UserProfiles { get; }
        IUserRequestRepository UserRequests { get; }
        IUserRoleRepository UserRoles { get; }

        Task<int> CompleteAsync();
    }
}
