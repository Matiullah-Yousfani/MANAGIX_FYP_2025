using MANAGIX.DataAccess.Data;
using MANAGIX.DataAccess.Repositories.IRepositories;
using MANAGIX.Models.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MANAGIX.DataAccess.Repositories
{
    public class UserRoleRepository:IUserRoleRepository
    {
        private readonly ApplicationDbContext _context;
        public UserRoleRepository(ApplicationDbContext context) => _context = context;

        public async Task<UserRole?> GetByIdAsync(Guid id) =>
            await _context.userRoles.FirstOrDefaultAsync(ur => ur.UserRoleId == id);

        public async Task AddAsync(UserRole userRole) => await _context.userRoles.AddAsync(userRole);

        public void Remove(UserRole userRole) => _context.userRoles.Remove(userRole);

    }
}
