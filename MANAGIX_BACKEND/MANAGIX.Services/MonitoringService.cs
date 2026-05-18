using MANAGIX.DataAccess.Repositories.IRepositories;
using MANAGIX.Models.DTO;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace MANAGIX.Services
{
    // PHASE 5: Aggregation only — no new SQL. Uses existing repos + WorkloadService.
    //
    // Definitions:
    //   • Active project   = !IsClosed
    //   • Overdue project  = !IsClosed AND Deadline < UtcNow AND not all tasks done
    //   • Blocked task     = Status == "InProgress" AND CreatedAt < UtcNow.AddDays(-7)
    //                        (heuristic: stuck > 1 week without moving to Done)
    //   • Overloaded       = utilisation >= 0.9
    public class MonitoringService : IMonitoringService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IWorkloadService _workload;

        public MonitoringService(IUnitOfWork unitOfWork, IWorkloadService workload)
        {
            _unitOfWork = unitOfWork;
            _workload = workload;
        }

        public async Task<SystemHealthDto> GetSystemHealthAsync()
        {
            var projects = await _unitOfWork.Projects.GetAllAsync();
            var active = projects.Where(p => !p.IsClosed).ToList();
            var now = DateTime.UtcNow;
            var overdue = active.Where(p => p.Deadline < now).ToList();

            var workload = await _workload.GetOverloadedEmployeesAsync(0.0); // everyone
            var overloaded = workload.Where(w => w.UtilizationPct >= 0.9).ToList();
            var avgUtil = workload.Count == 0 ? 0 : workload.Average(w => w.UtilizationPct);

            // Count blocked tasks across the system.
            int blocked = 0;
            foreach (var p in active)
            {
                var tasks = await _unitOfWork.Tasks.GetActiveTasksByProjectAsync(p.ProjectId);
                blocked += tasks.Count(t => t.Status == "InProgress" && t.CreatedAt < now.AddDays(-7));
            }

            // Methodology breakdown — count active projects per methodology label.
            var methodologyBreakdown = active
                .GroupBy(p => string.IsNullOrWhiteSpace(p.ProjectModel?.Methodology)
                    ? (p.ProjectModel?.ModelName ?? "Unspecified")
                    : p.ProjectModel.Methodology)
                .ToDictionary(g => g.Key, g => g.Count());

            return new SystemHealthDto
            {
                ActiveProjects = active.Count,
                OverdueProjects = overdue.Count,
                AvgUtilization = avgUtil,
                OverloadedCount = overloaded.Count,
                BlockedTaskCount = blocked,
                TopOverloaded = overloaded
                    .OrderByDescending(w => w.UtilizationPct)
                    .Take(5)
                    .Select(w => new TopOverloadedDto
                    {
                        UserId = w.UserId,
                        FullName = w.FullName,
                        UtilizationPct = w.UtilizationPct,
                        TotalEstimatedHours = w.TotalEstimatedHours,
                    })
                    .ToList(),
                MethodologyBreakdown = methodologyBreakdown,
            };
        }

        public async Task<ProjectHealthDto> GetProjectHealthAsync(Guid projectId)
        {
            var project = await _unitOfWork.Projects.GetByIdAsync(projectId);
            if (project == null)
                return new ProjectHealthDto { ProjectId = projectId, Title = "(not found)" };

            var tasks = await _unitOfWork.Tasks.GetByProjectIdAsync(projectId);
            var completed = tasks.Where(t => t.Status == "Done").ToList();
            var inProgress = tasks.Where(t => t.Status == "InProgress").ToList();
            var pending = tasks.Where(t => t.Status == "Todo" || t.Status == "Pending").ToList();

            var milestones = await _unitOfWork.Milestones.GetByProjectIdAsync(projectId);
            var doneMilestones = milestones.Count(m => m.Status?.Equals("Completed", StringComparison.OrdinalIgnoreCase) == true);

            // OnTimeRatio = completed tasks completed by their milestone deadline / completed total.
            // We don't track per-task completion timestamps yet — use milestone-deadline proxy.
            double onTime = 0;
            if (completed.Count > 0)
            {
                int onTimeCount = 0;
                foreach (var t in completed)
                {
                    if (!t.MilestoneId.HasValue) { onTimeCount++; continue; }
                    var m = milestones.FirstOrDefault(x => x.MilestoneId == t.MilestoneId.Value);
                    if (m == null || m.CompletedAt == null || m.CompletedAt <= m.Deadline) onTimeCount++;
                }
                onTime = (double)onTimeCount / completed.Count;
            }

            var workload = await _workload.GetProjectWorkloadAsync(projectId);
            var overloadedMembers = workload.Members.Count(m => m.UtilizationPct >= 0.9);
            var avgProjUtil = workload.Members.Count == 0 ? 0 : workload.Members.Average(m => m.UtilizationPct);

            return new ProjectHealthDto
            {
                ProjectId = projectId,
                Title = project.Title,
                Methodology = project.ProjectModel?.Methodology ?? project.ProjectModel?.ModelName,
                TotalTasks = tasks.Count,
                CompletedTasks = completed.Count,
                PendingTasks = pending.Count,
                InProgressTasks = inProgress.Count,
                OnTimeRatio = onTime,
                AvgUtilization = avgProjUtil,
                OverloadedMembers = overloadedMembers,
                MilestonesTotal = milestones.Count,
                MilestonesCompleted = doneMilestones,
                Deadline = project.Deadline,
                IsOverdue = !project.IsClosed && project.Deadline < DateTime.UtcNow && completed.Count < tasks.Count,
                // AI risk summary intentionally null here — populated by an optional Phase-5b
                // pass when the planner Python service is up. Keeps the panel responsive
                // even if the AI is offline.
                AiRiskSummary = null,
            };
        }
    }
}
