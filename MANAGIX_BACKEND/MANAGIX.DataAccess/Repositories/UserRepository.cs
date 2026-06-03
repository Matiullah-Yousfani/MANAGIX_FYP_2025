using MANAGIX.DataAccess.Data;
using MANAGIX.DataAccess.Repositories.IRepositories;
using MANAGIX.Models.Models;
using MANAGIX.Utility;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace MANAGIX.DataAccess.Repositories
{
    public class UserRepository : IUserRepository
    {
        private readonly ApplicationDbContext _context;
        public UserRepository(ApplicationDbContext context) => _context = context;

        public async Task<User?> GetByIdAsync(Guid id) =>
            await _context.users
                .Include(u => u.Profile)
                .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
                .FirstOrDefaultAsync(u => u.UserId == id);

        public async Task<User?> GetByEmailAsync(string email) =>
            await _context.users
                .Include(u => u.Profile)
                .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
                .FirstOrDefaultAsync(u => u.Email == email);

        public async Task<IEnumerable<User>> GetAllAsync() => await _context.users.ToListAsync();

        public async Task<List<User>> GetAllWithRolesAndProfileAsync() =>
            await _context.users
                .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
                .Include(u => u.Profile)
                .OrderBy(u => u.FullName)
                .ToListAsync();

        /// <summary>EF-translatable role filter (do not use AppRoles.Matches in IQueryable).</summary>
        public async Task<List<Guid>> GetUserIdsByRoleNameAsync(string roleName)
        {
            var canonical = roleName.Trim();

            if (canonical.Equals(AppRoles.QualityAssurance, StringComparison.OrdinalIgnoreCase)
                || canonical.Equals("QA", StringComparison.OrdinalIgnoreCase))
            {
                return await _context.users
                    .Where(u => u.UserRoles.Any(ur =>
                        ur.Role != null &&
                        (ur.Role.RoleName == AppRoles.QualityAssurance || ur.Role.RoleName == "QA")))
                    .Select(u => u.UserId)
                    .Distinct()
                    .ToListAsync();
            }

            if (canonical.Equals(AppRoles.Employee, StringComparison.OrdinalIgnoreCase))
            {
                return await _context.users
                    .Where(u => u.UserRoles.Any(ur =>
                        ur.Role != null && ur.Role.RoleName == AppRoles.Employee))
                    .Select(u => u.UserId)
                    .Distinct()
                    .ToListAsync();
            }

            if (canonical.Equals(AppRoles.Manager, StringComparison.OrdinalIgnoreCase))
            {
                return await _context.users
                    .Where(u => u.UserRoles.Any(ur =>
                        ur.Role != null && ur.Role.RoleName == AppRoles.Manager))
                    .Select(u => u.UserId)
                    .Distinct()
                    .ToListAsync();
            }

            if (canonical.Equals(AppRoles.Admin, StringComparison.OrdinalIgnoreCase))
            {
                return await _context.users
                    .Where(u => u.UserRoles.Any(ur =>
                        ur.Role != null && ur.Role.RoleName == AppRoles.Admin))
                    .Select(u => u.UserId)
                    .Distinct()
                    .ToListAsync();
            }

            return await _context.users
                .Where(u => u.UserRoles.Any(ur =>
                    ur.Role != null && ur.Role.RoleName == canonical))
                .Select(u => u.UserId)
                .Distinct()
                .ToListAsync();
        }

        public async Task AddAsync(User user) => await _context.users.AddAsync(user);

        public void Update(User user) => _context.users.Update(user);

        public void Remove(User user) => _context.users.Remove(user);
    }
}
