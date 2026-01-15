using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using MANAGIX.Models.Models;

namespace MANAGIX.DataAccess.Repositories.IRepositories
{
    public interface IProjectModelRepository
    {
        Task<IEnumerable<ProjectModel>> GetAllAsync();
    }
}
