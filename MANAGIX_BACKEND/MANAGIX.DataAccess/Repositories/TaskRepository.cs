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
    public class TaskRepository:ITaskRepository
    {
        private readonly ApplicationDbContext _context;
        public TaskRepository(ApplicationDbContext context) => _context = context;

        public async Task AddAsync(TaskItem task) =>
            await _context.Tasks.AddAsync(task);

        public async Task<TaskItem?> GetByIdAsync(Guid taskId) =>
            await _context.Tasks.FirstOrDefaultAsync(t => t.TaskId == taskId);

        public async Task<List<TaskItem>> GetByProjectIdAsync(Guid projectId) =>
            await _context.Tasks
                          .Where(t => t.ProjectId == projectId)
                          .ToListAsync();

        public async Task<List<TaskItem>> GetByEmployeeIdAsync(Guid employeeId) =>
            await _context.Tasks
                          .Where(t => t.AssignedEmployeeId == employeeId)
                          .ToListAsync();

        public async Task<List<TaskItem>> GetTasksByStatusAsync(TaskStatus status) =>
            await _context.Tasks
                          .Where(t => t.Status == status.ToString())
                          .ToListAsync();

        public async Task<int> CountAssignedTasksAsync(Guid employeeId, Guid projectId) =>
            await _context.Tasks
                          .CountAsync(t => t.AssignedEmployeeId == employeeId && t.ProjectId == projectId);

        public async Task<int> CountCompletedTasksAsync(Guid employeeId, Guid projectId) =>
            await _context.Tasks
                          .CountAsync(t => t.AssignedEmployeeId == employeeId
                                        && t.ProjectId == projectId
                                        && t.Status == "Done");

        public void Update(TaskItem task) =>
            _context.Tasks.Update(task);

        public void Remove(TaskItem task)
        {
            _context.Tasks.Remove(task);
        }

        public async Task<List<TaskItem>> GetByMilestoneIdAsync(Guid milestoneId)
        {
            return await _context.Tasks.Where(t => t.MilestoneId == milestoneId).ToListAsync();
        }

    }
}
