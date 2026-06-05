using MANAGIX.DataAccess.Repositories.IRepositories;
using MANAGIX.Models.Models;
using MANAGIX.Utility;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace MANAGIX.Services
{
    public interface IEmployeePerformanceService
    {
        Task RecalculateProjectAsync(Guid projectId);
    }

    public class EmployeePerformanceService : IEmployeePerformanceService
    {
        private readonly IUnitOfWork _uow;

        public EmployeePerformanceService(IUnitOfWork uow) => _uow = uow;

        public async Task RecalculateProjectAsync(Guid projectId)
        {
            var assignment = await _uow.ProjectTeams.GetByProjectIdAsync(projectId)
                ?? throw new InvalidOperationException("No team assigned to this project yet.");

            var members = await _uow.TeamEmployees.GetEmployeesByTeamIdAsync(assignment.TeamId);
            var tasks = await _uow.Tasks.GetByProjectIdAsync(projectId);
            var employeeIds = (await _uow.Users.GetUserIdsByRoleNameAsync(AppRoles.Employee)).ToHashSet();

            var existingRows = await _uow.EmployeePerformances.GetByProjectIdAsync(projectId) ?? new List<EmployeePerformance>();
            foreach (var stale in existingRows.Where(p => !employeeIds.Contains(p.EmployeeId)))
                _uow.EmployeePerformances.Remove(stale);

            foreach (var te in members.Where(m => employeeIds.Contains(m.EmployeeId)))
            {
                var empTasks = tasks.Where(t => t.AssignedEmployeeId == te.EmployeeId).ToList();
                var assigned = empTasks.Count;
                var completed = empTasks.Count(t =>
                    TaskWorkflow.Normalize(t.Status) == TaskWorkflow.Approved);
                var rate = assigned > 0 ? Math.Round((double)completed / assigned, 4) : 0;

                var existing = await _uow.EmployeePerformances.GetByEmployeeAndProjectAsync(te.EmployeeId, projectId);
                if (existing == null)
                {
                    await _uow.EmployeePerformances.AddAsync(new EmployeePerformance
                    {
                        EmployeeId = te.EmployeeId,
                        ProjectId = projectId,
                        TasksAssigned = assigned,
                        TasksCompleted = completed,
                        ApprovalRate = rate,
                        GeneratedAt = DateTime.UtcNow,
                    });
                }
                else
                {
                    existing.TasksAssigned = assigned;
                    existing.TasksCompleted = completed;
                    existing.ApprovalRate = rate;
                    existing.GeneratedAt = DateTime.UtcNow;
                }
            }

            await _uow.CompleteAsync();
        }
    }
}
