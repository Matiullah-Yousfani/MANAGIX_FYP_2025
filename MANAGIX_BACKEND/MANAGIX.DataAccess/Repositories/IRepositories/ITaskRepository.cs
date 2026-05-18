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
        Task<List<TaskItem>> GetTasksByStatusAsync(string status);

        Task<int> CountActiveWorkloadAsync(Guid employeeId, Guid? excludeTaskId = null);

        Task<int> CountAssignedTasksAsync(Guid employeeId, Guid projectId);

        Task<int> CountCompletedTasksAsync(Guid employeeId, Guid projectId);
        void Update(TaskItem task);
        void Remove(TaskItem task); // <-- NEW: Delete task
        Task<List<TaskItem>> GetByMilestoneIdAsync(Guid milestoneId); // <-- NEW: Get tasks by milestone

        // PHASE 0 / PHASE 3: Sum of EstimatedHours for the employee's active tasks across all projects.
        // Drives WorkloadService and the deterministic scoring rebalance.
        Task<decimal> SumActiveEstimatedHoursAsync(Guid employeeId);

        // PHASE 5: Project-wide active workload — used by MonitoringSnapshot.
        Task<List<TaskItem>> GetActiveTasksByProjectAsync(Guid projectId);
    }
}
