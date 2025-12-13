using MANAGIX.Models.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MANAGIX.DataAccess.Repositories.IRepositories
{
    public interface ITaskRepository
    {
        Task AddAsync(TaskItem task);
        Task<List<TaskItem>> GetByProjectIdAsync(Guid projectId);
    }
}
