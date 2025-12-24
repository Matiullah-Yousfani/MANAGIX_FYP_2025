using MANAGIX.Models.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MANAGIX.DataAccess.Repositories.IRepositories
{
    public interface ITeamRepository
    {
        Task AddAsync(Team team);
        Task<Team?> GetByIdAsync(Guid id);

        Task<List<Team>> GetAllAsync();

    }
}
