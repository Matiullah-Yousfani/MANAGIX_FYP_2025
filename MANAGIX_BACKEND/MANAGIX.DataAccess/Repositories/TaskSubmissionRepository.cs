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
                .Where(s => s.Status == "Submitted" && s.Task != null)
                .ToListAsync();

        public async Task<List<TaskSubmission>> GetReviewHistoryAsync() =>
            await _context.TaskSubmissions
                .Include(s => s.Task)
                .Include(s => s.Employee)
                .Where(s => s.Task != null &&
                            (s.Status == "Approved" || s.Status == "Rejected" || s.Status == "Submitted"))
                .OrderByDescending(s => s.ReviewedAt ?? s.SubmittedAt)
                .ToListAsync();

        public async Task<TaskSubmission?> GetByTaskIdAsync(Guid taskId) =>
            await _context.TaskSubmissions.FirstOrDefaultAsync(s => s.TaskId == taskId);

        public void Update(TaskSubmission submission) => _context.TaskSubmissions.Update(submission);

        public void Remove(TaskSubmission submission) => _context.TaskSubmissions.Remove(submission);
    }
}
