using MANAGIX.DataAccess.Repositories.IRepositories;
using MANAGIX.Models.DTO;
using MANAGIX.Models.Models;
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
            var userRole = user.UserRoles?
                .Select(ur => ur.Role?.RoleName)
                .FirstOrDefault(r => !string.IsNullOrWhiteSpace(r));
            var isQa = AppRoles.IsQualityAssurance(userRole);

            HashSet<Guid>? allowedProjectIds = null;
            if (scopedManagerId.HasValue && scopedManagerId.Value != Guid.Empty)
            {
                var mgrProjects = await _uow.Projects.GetByManagerIdAsync(scopedManagerId.Value);
                allowedProjectIds = mgrProjects.Select(p => p.ProjectId).ToHashSet();
                tasks = tasks.Where(t => allowedProjectIds.Contains(t.ProjectId)).ToList();
            }

            var teamIds = await _uow.TeamEmployees.GetTeamIdsForMemberAsync(userId);
            var allProjectIds = new HashSet<Guid>(tasks.Select(t => t.ProjectId));
            foreach (var tid in teamIds)
            {
                var teamProjectLink = await _uow.ProjectTeams.GetByTeamIdAsync(tid);
                if (teamProjectLink == null) continue;
                if (scopedManagerId.HasValue && allowedProjectIds != null &&
                    !allowedProjectIds.Contains(teamProjectLink.ProjectId))
                    continue;
                allProjectIds.Add(teamProjectLink.ProjectId);
            }

            var projects = new List<MANAGIX.Models.Models.Project>();
            foreach (var pid in allProjectIds)
            {
                var p = await _uow.Projects.GetByIdAsync(pid);
                if (p != null) projects.Add(p);
            }

            var approved = tasks.Count(t => TaskWorkflow.Normalize(t.Status) == TaskWorkflow.Approved);
            var inProg = tasks.Count(t => TaskWorkflow.Normalize(t.Status) == TaskWorkflow.InProgress);
            var todo = tasks.Count(t => TaskWorkflow.Normalize(t.Status) == TaskWorkflow.Todo);

            if (isQa)
            {
                foreach (var pid in allProjectIds)
                {
                    var projectTasks = await _uow.Tasks.GetByProjectIdAsync(pid);
                    if (scopedManagerId.HasValue && allowedProjectIds != null &&
                        !allowedProjectIds.Contains(pid))
                        continue;
                    todo += projectTasks.Count(t => TaskWorkflow.IsQaReviewable(t.Status));
                    approved += projectTasks.Count(t =>
                        TaskWorkflow.Normalize(t.Status) == TaskWorkflow.Approved);
                }
            }

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
                var empTasks = tasks.Where(t => t.ProjectId == pid).ToList();
                int assigned;
                int completed;
                if (empTasks.Count > 0)
                {
                    assigned = empTasks.Count;
                    completed = empTasks.Count(t =>
                        TaskWorkflow.Normalize(t.Status) == TaskWorkflow.Approved);
                }
                else if (isQa)
                {
                    var projectTasks = await _uow.Tasks.GetByProjectIdAsync(pid);
                    assigned = projectTasks.Count(t => TaskWorkflow.IsQaReviewable(t.Status));
                    completed = projectTasks.Count(t =>
                        TaskWorkflow.Normalize(t.Status) == TaskWorkflow.Approved);
                }
                else
                {
                    assigned = 0;
                    completed = 0;
                }

                projectInsights.Add(new EmployeeProjectInsightDto
                {
                    ProjectId = pid,
                    Title = p.Title,
                    AssignedTasks = assigned,
                    CompletedTasks = completed,
                });
            }

            var entries = await _uow.TimeEntries.GetByUserAsync(userId, 100);
            var byMonth = entries
                .Where(e => e.EndedAt != null)
                .GroupBy(e => e.StartedAt.ToString("yyyy-MM"))
                .OrderBy(g => g.Key)
                .Select(g => new MonthlyHoursDto { Month = g.Key, Hours = g.Sum(x => x.Hours) })
                .ToList();

            var teamInsights = new List<EmployeeTeamInsightDto>();
            foreach (var tid in teamIds)
            {
                var team = await _uow.Teams.GetByIdAsync(tid);
                if (team == null) continue;
                var pt = await _uow.ProjectTeams.GetByTeamIdAsync(tid);
                var proj = pt != null ? await _uow.Projects.GetByIdAsync(pt.ProjectId) : null;
                if (scopedManagerId.HasValue && proj != null && allowedProjectIds != null && !allowedProjectIds.Contains(proj.ProjectId))
                    continue;
                var creator = await _uow.Users.GetByIdAsync(team.CreatedBy);
                var teamMemberRows = await _uow.TeamEmployees.GetEmployeesByTeamIdAsync(tid);
                var memberBriefs = new List<TeamMemberBriefDto>();
                foreach (var te in teamMemberRows)
                {
                    var mu = await _uow.Users.GetByIdAsync(te.EmployeeId);
                    if (mu == null) continue;
                    memberBriefs.Add(new TeamMemberBriefDto
                    {
                        UserId = mu.UserId,
                        FullName = mu.FullName,
                        RoleName = ResolveRoleLabel(mu, team.CreatedBy),
                    });
                }
                teamInsights.Add(new EmployeeTeamInsightDto
                {
                    TeamId = tid,
                    TeamName = team.Name,
                    ProjectTitle = proj?.Title,
                    CreatedByName = creator?.FullName,
                    Members = memberBriefs
                        .OrderByDescending(m => m.RoleName == "Manager")
                        .ThenByDescending(m => AppRoles.IsQualityAssurance(m.RoleName))
                        .ThenBy(m => m.FullName)
                        .ToList(),
                });
            }

            var taskDetails = new List<EmployeeTaskInsightDto>();
            var milestoneInsights = new List<EmployeeMilestoneInsightDto>();
            var milestoneIds = tasks.Where(t => t.MilestoneId.HasValue).Select(t => t.MilestoneId!.Value).Distinct().ToList();
            foreach (var mid in milestoneIds)
            {
                var ms = await _uow.Milestones.GetByIdAsync(mid);
                if (ms == null) continue;
                if (scopedManagerId.HasValue && allowedProjectIds != null && !allowedProjectIds.Contains(ms.ProjectId))
                    continue;
                var mt = tasks.Where(t => t.MilestoneId == mid).ToList();
                milestoneInsights.Add(new EmployeeMilestoneInsightDto
                {
                    MilestoneId = mid,
                    Title = ms.Title,
                    Status = ms.Status,
                    Deadline = ms.Deadline,
                    TotalTasks = mt.Count,
                    CompletedTasks = mt.Count(t => TaskWorkflow.Normalize(t.Status) == TaskWorkflow.Approved),
                });
            }

            foreach (var t in tasks)
            {
                var proj = projects.FirstOrDefault(p => p.ProjectId == t.ProjectId);
                var ms = t.MilestoneId.HasValue ? await _uow.Milestones.GetByIdAsync(t.MilestoneId.Value) : null;
                taskDetails.Add(new EmployeeTaskInsightDto
                {
                    TaskId = t.TaskId,
                    Title = t.Title,
                    Status = t.Status,
                    Priority = t.Priority,
                    ProjectTitle = proj?.Title,
                    MilestoneTitle = ms?.Title,
                });
            }

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
                CompletionRate = (tasks.Count > 0 || isQa)
                    ? Math.Round((double)approved / Math.Max(1, approved + todo + inProg) * 100, 1)
                    : 0,
                ActiveWorkloadHours = activeHours,
                WeeklyCapacityHours = capacity,
                UtilizationPct = util,
                TotalLoggedHours = logged,
                HourlyRate = rate,
                EstimatedEarnings = logged * rate,
                ActiveProjects = projectInsights,
                HoursByMonth = byMonth,
                Teams = teamInsights,
                TaskDetails = taskDetails,
                Milestones = milestoneInsights,
            };
        }

        private static bool IsActiveTask(string? status)
        {
            var n = TaskWorkflow.Normalize(status);
            return n == TaskWorkflow.Todo || n == TaskWorkflow.InProgress;
        }

        private static string ResolveRoleLabel(User user, Guid teamCreatorId)
        {
            if (user.UserId == teamCreatorId)
                return "Manager";
            var role = user.UserRoles?
                .Select(ur => ur.Role?.RoleName)
                .FirstOrDefault(r => !string.IsNullOrWhiteSpace(r));
            if (AppRoles.IsQualityAssurance(role))
                return AppRoles.QualityAssurance;
            if (AppRoles.Matches(role, AppRoles.Manager))
                return AppRoles.Manager;
            if (AppRoles.Matches(role, AppRoles.Employee))
                return AppRoles.Employee;
            return role ?? "Member";
        }
    }
}
