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
    public interface IProjectTimelineService
    {
        Task<ProjectTimelineDto?> GetAsync(Guid projectId);
    }

    public class ProjectTimelineService : IProjectTimelineService
    {
        private readonly IUnitOfWork _uow;

        public ProjectTimelineService(IUnitOfWork uow) => _uow = uow;

        private static bool IsTaskApproved(string? status) =>
            TaskWorkflow.Normalize(status) == TaskWorkflow.Approved;

        private static bool IsTaskAwaitingReview(string? status) =>
            TaskWorkflow.Normalize(status) == TaskWorkflow.Done;

        private static bool IsMilestoneCompleted(string? status) =>
            string.Equals(status?.Trim(), "Completed", StringComparison.OrdinalIgnoreCase);

        private static bool HasUsableDeadline(DateTime deadline, DateTime projectStart) =>
            deadline.Year >= 2000 && deadline >= projectStart.AddDays(-1);

        private static DateTime EffectiveMilestoneEnd(
            Milestone milestone,
            int index,
            int count,
            DateTime projectStart,
            DateTime projectEnd,
            double spanDays)
        {
            if (HasUsableDeadline(milestone.Deadline, projectStart))
            {
                var d = milestone.Deadline;
                return d > projectEnd ? projectEnd : d;
            }

            var slice = spanDays / Math.Max(count, 1);
            return projectStart.AddDays(Math.Max(1, slice * (index + 1)));
        }

        public async Task<ProjectTimelineDto?> GetAsync(Guid projectId)
        {
            var project = await _uow.Projects.GetByIdAsync(projectId);
            if (project == null) return null;

            var milestones = await _uow.Milestones.GetByProjectIdAsync(projectId);
            var tasks = await _uow.Tasks.GetByProjectIdAsync(projectId);

            var start = project.CreatedAt;
            var end = project.Deadline;
            if (!HasUsableDeadline(end, start) || end <= start)
                end = start.AddDays(30);
            var span = Math.Max(1.0, (end - start).TotalDays);

            var bars = new List<TimelineMilestoneBarDto>();
            var ordered = milestones
                .OrderBy(m => HasUsableDeadline(m.Deadline, start) ? m.Deadline : DateTime.MaxValue)
                .ThenBy(m => m.Title, StringComparer.OrdinalIgnoreCase)
                .ToList();

            var count = ordered.Count;
            for (int i = 0; i < count; i++)
            {
                var m = ordered[i];
                var mTasks = tasks.Where(t => t.MilestoneId == m.MilestoneId).ToList();
                var approved = mTasks.Count(t => IsTaskApproved(t.Status));
                var awaitingReview = mTasks.Any(t => IsTaskAwaitingReview(t.Status));
                var milestoneCompleted = IsMilestoneCompleted(m.Status);

                var mStart = i == 0
                    ? start
                    : EffectiveMilestoneEnd(ordered[i - 1], i - 1, count, start, end, span);
                if (mStart < start) mStart = start;

                var mEnd = EffectiveMilestoneEnd(m, i, count, start, end, span);
                if (mEnd <= mStart)
                    mEnd = mStart.AddDays(Math.Max(1, span / Math.Max(count, 1)));

                var offsetPct = Math.Clamp((mStart - start).TotalDays / span * 100, 0, 100);
                var rawWidth = Math.Max(1, (mEnd - mStart).TotalDays / span * 100);
                if (offsetPct + rawWidth > 100)
                    rawWidth = Math.Max(1, 100 - offsetPct);
                var widthPct = rawWidth;

                var progressPct = milestoneCompleted
                    ? 100
                    : (mTasks.Count > 0 ? Math.Round((double)approved / mTasks.Count * 100, 1) : 0);

                bars.Add(new TimelineMilestoneBarDto
                {
                    MilestoneId = m.MilestoneId,
                    Title = m.Title,
                    StartDate = mStart,
                    EndDate = mEnd,
                    Status = milestoneCompleted ? "Completed" : m.Status,
                    TotalTasks = mTasks.Count,
                    CompletedTasks = milestoneCompleted ? mTasks.Count : approved,
                    ProgressPct = progressPct,
                    OffsetPct = offsetPct,
                    WidthPct = widthPct,
                    HasPendingReview = !milestoneCompleted && awaitingReview,
                });
            }

            var taskProgressPct = tasks.Count > 0
                ? Math.Round((double)tasks.Count(t => IsTaskApproved(t.Status)) / tasks.Count * 100, 1)
                : 0;
            var milestoneProgressPct = bars.Count > 0
                ? Math.Round(bars.Average(b => b.ProgressPct), 1)
                : 0;
            var overall = Math.Round(Math.Max(taskProgressPct, milestoneProgressPct), 1);

            return new ProjectTimelineDto
            {
                ProjectId = projectId,
                Title = project.Title,
                ProjectStart = start,
                ProjectEnd = end,
                OverallProgressPct = overall,
                Milestones = bars,
            };
        }
    }
}
