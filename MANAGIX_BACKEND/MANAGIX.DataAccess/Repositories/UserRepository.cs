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
    public class UserRepository:IUserRepository
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

        public async Task AddAsync(User user) => await _context.users.AddAsync(user);

        public void Update(User user) => _context.users.Update(user);

        public void Remove(User user) => _context.users.Remove(user);
    }
}
