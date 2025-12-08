using MANAGIX.Models.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MANAGIX.DataAccess.Repositories.IRepositories
{
    public interface IUserRequestRepository
    {
        Task<UserRequest?> GetByIdAsync(Guid id);
        Task<IEnumerable<UserRequest>> GetPendingRequestsAsync();
        Task AddAsync(UserRequest request);
        void Update(UserRequest request);
        void Remove(UserRequest request);
    }
}
