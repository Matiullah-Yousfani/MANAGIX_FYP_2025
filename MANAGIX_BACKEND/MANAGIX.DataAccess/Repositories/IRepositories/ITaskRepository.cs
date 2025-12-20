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
        Task<TaskItem?> GetByIdAsync(Guid taskId);
        Task<List<TaskItem>> GetByProjectIdAsync(Guid projectId);
        Task<List<TaskItem>> GetByEmployeeIdAsync(Guid employeeId);
        Task<List<TaskItem>> GetTasksByStatusAsync(TaskStatus status);

        Task<int> CountAssignedTasksAsync(Guid employeeId, Guid projectId);

        Task<int> CountCompletedTasksAsync(Guid employeeId, Guid projectId);
        void Update(TaskItem task);



    }
}
