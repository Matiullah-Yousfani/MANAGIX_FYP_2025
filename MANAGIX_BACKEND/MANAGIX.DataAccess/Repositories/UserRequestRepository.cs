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
    public class UserRequestRepository:IUserRequestRepository
    {
        private readonly ApplicationDbContext _context;
        public UserRequestRepository(ApplicationDbContext context) => _context = context;

        public async Task<UserRequest?> GetByIdAsync(Guid id) =>
            await _context.userRequests.FirstOrDefaultAsync(r => r.RequestId == id);

        public async Task<IEnumerable<UserRequest>> GetPendingRequestsAsync() =>
            await _context.userRequests.Where(r => r.Status == "Pending").ToListAsync();

        public async Task AddAsync(UserRequest request) => await _context.userRequests.AddAsync(request);

        public void Update(UserRequest request) => _context.userRequests.Update(request);

        public void Remove(UserRequest request) => _context.userRequests.Remove(request);
    }
}
