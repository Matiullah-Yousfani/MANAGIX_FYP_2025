using MANAGIX.DataAccess.Data;
using MANAGIX.DataAccess.Repositories.IRepositories;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MANAGIX.DataAccess.Repositories
{
    public class UnitOfWork : IUnitOfWork
    {
        private readonly ApplicationDbContext _context;

        public UnitOfWork(ApplicationDbContext context)
        {
            _context = context;

            Users = new UserRepository(_context);
            Roles = new RoleRepository(_context);
            UserProfiles = new UserProfileRepository(_context);
            UserRequests = new UserRequestRepository(_context);
            UserRoles = new UserRoleRepository(_context);
        }

        public IUserRepository Users { get; }
        public IRoleRepository Roles { get; }
        public IUserProfileRepository UserProfiles { get; }
        public IUserRequestRepository UserRequests { get; }
        public IUserRoleRepository UserRoles { get; }

        public async Task<int> CompleteAsync() => await _context.SaveChangesAsync();

        public void Dispose() => _context.Dispose();
    }
}
