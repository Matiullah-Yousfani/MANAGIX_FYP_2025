using MANAGIX.Models.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MANAGIX.DataAccess.Repositories.IRepositories
{
    public interface ITaskSubmissionRepository
    {
        Task AddAsync(TaskSubmission submission);
        Task<TaskSubmission?> GetByTaskIdAsync(Guid taskId);
        Task<List<TaskSubmission>> GetPendingSubmissionsAsync();
        void Update(TaskSubmission submission);
    }
}
