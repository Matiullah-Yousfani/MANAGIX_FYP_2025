using MANAGIX.DataAccess.Repositories.IRepositories;
using MANAGIX.Models.DTO;
using MANAGIX.Utility;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace MANAGIX.Services
{
    public interface IEmployeeInsightsService
    {
        Task<EmployeeInsightsDto?> GetAsync(Guid userId, Guid? scopedManagerId = null);
    }

    public class EmployeeInsightsService : IEmployeeInsightsService
    {
        private readonly IUnitOfWork _uow;
        private readonly ITimesheetService _timesheet;
        private readonly IManagerScopeService _scope;

        public EmployeeInsightsService(
            IUnitOfWork uow,
            ITimesheetService timesheet,
            IManagerScopeService scope)
        {
            _uow = uow;
            _timesheet = timesheet;
            _scope = scope;
        }

        public async Task<EmployeeInsightsDto?> GetAsync(Guid userId, Guid? scopedManagerId = null)
        {
            var user = await _uow.Users.GetByIdAsync(userId);
            if (user == null) return null;

            if (scopedManagerId.HasValue && scopedManagerId.Value != Guid.Empty)
            {
                if (!await _scope.IsMemberInManagerScopeAsync(scopedManagerId.Value, userId))
                    return null;
            }

            var profile = await _uow.UserProfiles.GetByUserIdAsync(userId);
            var tasks = await _uow.Tasks.GetByEmployeeIdAsync(userId);

            HashSet<Guid>? allowedProjectIds = null;
            if (scopedManagerId.HasValue && scopedManagerId.Value != Guid.Empty)
            {
                var mgrProjects = await _uow.Projects.GetByManagerIdAsync(scopedManagerId.Value);
                allowedProjectIds = mgrProjects.Select(p => p.ProjectId).ToHashSet();
                tasks = tasks.Where(t => allowedProjectIds.Contains(t.ProjectId)).ToList();
            }

            var projectIds = tasks.Select(t => t.ProjectId).Distinct().ToList();
            var projects = new List<MANAGIX.Models.Models.Project>();
            foreach (var pid in projectIds)
            {
                var p = await _uow.Projects.GetByIdAsync(pid);
                if (p != null) projects.Add(p);
            }

            var approved = tasks.Count(t => TaskWorkflow.Normalize(t.Status) == TaskWorkflow.Approved);
            var inProg = tasks.Count(t => TaskWorkflow.Normalize(t.Status) == TaskWorkflow.InProgress);
            var todo = tasks.Count(t => TaskWorkflow.Normalize(t.Status) == TaskWorkflow.Todo);

            var activeHours = tasks
                .Where(t => IsActiveTask(t.Status))
                .Sum(t => t.EstimatedHours ?? 4m);
            var capacity = profile?.WeeklyCapacityHours ?? 40m;
            var util = capacity > 0 ? (double)(activeHours / capacity) : 0;

            var logged = await _uow.TimeEntries.SumHoursByUserAsync(userId);
            var rate = profile?.HourlyRate ?? 25m;

            var projectInsights = new List<EmployeeProjectInsightDto>();
            foreach (var p in projects.Where(pr => !pr.IsClosed))
            {
                var pid = p.ProjectId;
                var pt = tasks.Where(t => t.ProjectId == pid).ToList();
                projectInsights.Add(new EmployeeProjectInsightDto
                {
                    ProjectId = pid,
                    Title = p.Title,
                    AssignedTasks = pt.Count,
                    CompletedTasks = pt.Count(t => TaskWorkflow.Normalize(t.Status) == TaskWorkflow.Approved),
                });
            }

            var entries = await _uow.TimeEntries.GetByUserAsync(userId, 100);
            var byMonth = entries
                .Where(e => e.EndedAt != null)
                .GroupBy(e => e.StartedAt.ToString("yyyy-MM"))
                .OrderBy(g => g.Key)
                .Select(g => new MonthlyHoursDto { Month = g.Key, Hours = g.Sum(x => x.Hours) })
                .ToList();

            return new EmployeeInsightsDto
            {
                UserId = userId,
                FullName = user.FullName,
                EmployeeLevel = profile?.EmployeeLevel ?? EmployeeCareerService.ComputeLevel(profile?.CompletedProjectsCount ?? 0),
                CompletedProjectsCount = profile?.CompletedProjectsCount ?? 0,
                IsOnline = await _timesheet.IsUserOnlineAsync(userId),
                LastActiveAt = profile?.LastActiveAt,
                TotalTasksAssigned = tasks.Count,
                TasksCompleted = approved,
                TasksInProgress = inProg,
                TasksPending = todo,
                CompletionRate = tasks.Count > 0 ? Math.Round((double)approved / tasks.Count * 100, 1) : 0,
                ActiveWorkloadHours = activeHours,
                WeeklyCapacityHours = capacity,
                UtilizationPct = util,
                TotalLoggedHours = logged,
                HourlyRate = rate,
                EstimatedEarnings = logged * rate,
                ActiveProjects = projectInsights,
                HoursByMonth = byMonth,
            };
        }

        private static bool IsActiveTask(string? status)
        {
            var n = TaskWorkflow.Normalize(status);
            return n == TaskWorkflow.Todo || n == TaskWorkflow.InProgress;
        }
    }
}
