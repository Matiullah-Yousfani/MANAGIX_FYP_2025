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
    public class TaskSubmissionRepository:ITaskSubmissionRepository
    {
        private readonly ApplicationDbContext _context;
        public TaskSubmissionRepository(ApplicationDbContext context) => _context = context;

        public async Task AddAsync(TaskSubmission submission) => await _context.TaskSubmissions.AddAsync(submission);

        public async Task<List<TaskSubmission>> GetPendingSubmissionsAsync() =>
            await _context.TaskSubmissions
                .Include(s => s.Task)
                .Include(s => s.Employee)
                .Where(s => s.Status == "Submitted")
                .ToListAsync();

        public async Task<TaskSubmission?> GetByTaskIdAsync(Guid taskId) =>
            await _context.TaskSubmissions.FirstOrDefaultAsync(s => s.TaskId == taskId);

        public void Update(TaskSubmission submission) => _context.TaskSubmissions.Update(submission);
    }
}
