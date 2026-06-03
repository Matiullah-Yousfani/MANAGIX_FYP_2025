using MANAGIX.DataAccess.Repositories.IRepositories;
using MANAGIX.Models.DTO;
using MANAGIX.Utility;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace MANAGIX.Services
{
    public interface IProjectClosureReportService
    {
        Task<ProjectClosureReportDto?> BuildAsync(Guid projectId);
    }

    public class ProjectClosureReportService : IProjectClosureReportService
    {
        private readonly IUnitOfWork _uow;

        public ProjectClosureReportService(IUnitOfWork uow) => _uow = uow;

        public async Task<ProjectClosureReportDto?> BuildAsync(Guid projectId)
        {
            var project = await _uow.Projects.GetByIdAsync(projectId);
            if (project == null) return null;

            var milestones = await _uow.Milestones.GetByProjectIdAsync(projectId);
            var tasks = await _uow.Tasks.GetByProjectIdAsync(projectId);
            var model = await _uow.ProjectModels.GetByIdAsync(project.ModelId);

            var pt = await _uow.ProjectTeams.GetByProjectIdAsync(projectId);
            var teams = new List<ClosureTeamDto>();
            var members = new List<ClosureMemberDto>();

            if (pt != null)
            {
                var team = await _uow.Teams.GetByIdAsync(pt.TeamId);
                if (team != null)
                    teams.Add(new ClosureTeamDto { TeamId = team.TeamId, Name = team.Name });

                var tes = await _uow.TeamEmployees.GetEmployeesByTeamIdAsync(pt.TeamId);
                foreach (var te in tes)
                {
                    var u = await _uow.Users.GetByIdAsync(te.EmployeeId);
                    var profile = await _uow.UserProfiles.GetByUserIdAsync(te.EmployeeId);
                    var userTasks = tasks.Where(t => t.AssignedEmployeeId == te.EmployeeId).ToList();
                    var done = userTasks.Count(t =>
                        TaskWorkflow.Normalize(t.Status) == TaskWorkflow.Approved || t.Status == "Completed");
                    var hours = await _uow.TimeEntries.SumHoursByUserAsync(te.EmployeeId);

                    members.Add(new ClosureMemberDto
                    {
                        UserId = te.EmployeeId,
                        FullName = u?.FullName ?? "Unknown",
                        Role = "Employee",
                        EmployeeLevel = profile?.EmployeeLevel ?? "Junior",
                        TasksCompleted = done,
                        LoggedHours = hours,
                    });
                }
            }

            var qaIds = await _uow.Users.GetUserIdsByRoleNameAsync(AppRoles.QualityAssurance);
            var qaNames = new List<string>();
            foreach (var q in qaIds)
            {
                var u = await _uow.Users.GetByIdAsync(q);
                if (u != null) qaNames.Add(u.FullName);
            }

            var approved = tasks.Count(t => TaskWorkflow.Normalize(t.Status) == TaskWorkflow.Approved);
            var rejected = 0;
            foreach (var t in tasks)
            {
                var subCheck = await _uow.TaskSubmissions.GetByTaskIdAsync(t.TaskId);
                if (subCheck != null && string.Equals(subCheck.Status, "Rejected", StringComparison.OrdinalIgnoreCase))
                    rejected++;
            }
            var completedMs = milestones.Count(m => string.Equals(m.Status, "Completed", StringComparison.OrdinalIgnoreCase));
            var delayedMs = milestones.Count(m =>
                !string.Equals(m.Status, "Completed", StringComparison.OrdinalIgnoreCase) && m.Deadline < DateTime.UtcNow);

            var deliverables = new List<ClosureDeliverableDto>();
            foreach (var t in tasks)
            {
                var sub = await _uow.TaskSubmissions.GetByTaskIdAsync(t.TaskId);
                if (sub != null)
                {
                    deliverables.Add(new ClosureDeliverableDto
                    {
                        TaskId = t.TaskId,
                        TaskTitle = t.Title,
                        FileName = string.IsNullOrEmpty(sub.FilePath) ? "submission" : System.IO.Path.GetFileName(sub.FilePath),
                        SubmittedAt = sub.SubmittedAt,
                    });
                }
            }

            var perfs = await _uow.EmployeePerformances.GetByProjectIdAsync(projectId);
            var perfDtos = new List<ClosurePerformanceDto>();
            foreach (var p in perfs)
            {
                var u = await _uow.Users.GetByIdAsync(p.EmployeeId);
                perfDtos.Add(new ClosurePerformanceDto
                {
                    EmployeeId = p.EmployeeId,
                    EmployeeName = u?.FullName ?? "Unknown",
                    OnTimeRatio = p.ApprovalRate,
                    TasksCompleted = p.TasksCompleted,
                });
            }

            var totalHours = await _uow.TimeEntries.SumHoursByProjectAsync(projectId);
            decimal laborCost = 0;
            foreach (var m in members)
            {
                var profile = await _uow.UserProfiles.GetByUserIdAsync(m.UserId);
                var rate = profile?.HourlyRate ?? 25m;
                laborCost += m.LoggedHours * rate;
            }

            var end = project.ClosedAt ?? DateTime.UtcNow;
            var duration = Math.Max(1, (int)(end - project.CreatedAt).TotalDays);

            return new ProjectClosureReportDto
            {
                ProjectId = project.ProjectId,
                Title = project.Title,
                Description = project.Description,
                StartDate = project.CreatedAt,
                EndDate = project.ClosedAt,
                DurationDays = duration,
                Budget = project.Budget,
                Status = project.Status,
                Methodology = model?.Methodology ?? model?.ModelName,
                Teams = teams,
                Members = members,
                QaMembers = qaNames,
                TotalMilestones = milestones.Count,
                CompletedMilestones = completedMs,
                DelayedMilestones = delayedMs,
                TotalTasks = tasks.Count,
                ApprovedTasks = approved,
                RejectedTasks = rejected,
                CompletionRate = tasks.Count > 0 ? Math.Round((double)approved / tasks.Count * 100, 1) : 0,
                Performance = perfDtos,
                Deliverables = deliverables,
                TotalLoggedHours = totalHours,
                EstimatedPayrollCost = laborCost,
                AiInsightsSummary = BuildAiSummary(members, totalHours, laborCost, project.Budget),
            };
        }

        private static string BuildAiSummary(List<ClosureMemberDto> members, decimal hours, decimal cost, decimal budget)
        {
            var top = members.OrderByDescending(m => m.TasksCompleted).FirstOrDefault();
            var util = budget > 0 ? Math.Round((double)(cost / budget) * 100, 1) : 0;
            return $"Team logged {hours:0.#}h. Est. labor cost {cost:0.#} ({util}% of budget). " +
                   (top != null ? $"Top contributor: {top.FullName} ({top.TasksCompleted} tasks)." : "No member stats.");
        }
    }
}
