using MANAGIX.Models.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MANAGIX.DataAccess.Repositories.IRepositories
{
    public interface ITeamEmployeeRepository
    {
        Task AddAsync(TeamEmployee entity);
        Task<List<TeamEmployee>> GetEmployeesByTeamIdAsync(Guid teamId);

        Task<TeamEmployee?> GetAsync(Guid teamId, Guid employeeId);
        void Remove(TeamEmployee entity);
    }
}
