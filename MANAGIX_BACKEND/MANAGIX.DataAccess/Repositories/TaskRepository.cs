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

        public async Task<List<TaskItem>> GetByProjectIdAsync(Guid projectId) =>
            await _context.Tasks
                          .Where(t => t.ProjectId == projectId)
                          .ToListAsync();
    }
}
