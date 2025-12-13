using MANAGIX.Models.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MANAGIX.DataAccess.Repositories.IRepositories
{
    public interface IProjectTeamRepository
    {
        Task AddAsync(ProjectTeam entity);
        Task<ProjectTeam?> GetByProjectIdAsync(Guid projectId);
    }
}
