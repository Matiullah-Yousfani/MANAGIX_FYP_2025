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
    public class UserProfileRepository:IUserProfileRepository
    {
        private readonly ApplicationDbContext _context;
        public UserProfileRepository(ApplicationDbContext context) => _context = context;

        public async Task<UserProfile?> GetByUserIdAsync(Guid userId) =>
            await _context.userProfiles.FirstOrDefaultAsync(p => p.UserId == userId);

        public async Task AddAsync(UserProfile profile) => await _context.userProfiles.AddAsync(profile);

        public void Update(UserProfile profile) => _context.userProfiles.Update(profile);

        public void Remove(UserProfile profile) => _context.userProfiles.Remove(profile);
    }
}
