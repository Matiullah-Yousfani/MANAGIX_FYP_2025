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
    public class RoleRepository :IRoleRepository
    {
        private readonly ApplicationDbContext _context;
        public RoleRepository(ApplicationDbContext context) => _context = context;

        public async Task<Role?> GetByIdAsync(Guid id) =>
            await _context.roles.FirstOrDefaultAsync(r => r.RoleId == id);

        public async Task<Role?> GetByNameAsync(string roleName) =>
            await _context.roles.FirstOrDefaultAsync(r => r.RoleName == roleName);

        public async Task<IEnumerable<Role>> GetAllAsync() => await _context.roles.ToListAsync();

        public async Task AddAsync(Role role) => await _context.roles.AddAsync(role);

        public void Update(Role role) => _context.roles.Update(role);

        public void Remove(Role role) => _context.roles.Remove(role);
    }
}
