using MANAGIX.DataAccess.Repositories.IRepositories;
using MANAGIX.Models.DTO;
using MANAGIX.Models.Models;
using MANAGIX.Utility;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace MANAGIX.Services
{
    public interface IOvertimeService
    {
        Task<TimesheetTodayDto> GetTodayAsync(Guid userId);
        Task<(Guid? RequestId, bool Triggered)> CheckDailyOvertimeOnClockOutAsync(Guid userId, TimeEntry? closedEntry);
        Task<OvertimeRequestDto?> GetRequestAsync(Guid requestId, Guid actingUserId);
        Task<OvertimeRequestDto> SubmitReasonAsync(Guid requestId, OvertimeReasonDto dto);
        Task<OvertimeRequestDto> ResolveAsync(Guid requestId, OvertimeResolveDto dto);
    }

    public class OvertimeService : IOvertimeService
    {
        public const string StatusPendingReason = "PendingReason";
        public const string StatusPendingManager = "PendingManager";
        public const string StatusResolved = "Resolved";
        public const string TypeEmployee = "OvertimeExplanationRequired";
        public const string TypeManager = "OvertimeManagerAction";

        private readonly IUnitOfWork _uow;
        private readonly INotificationService _notifications;
        private readonly IDailyTimesheetService _daily;

        public OvertimeService(IUnitOfWork uow, INotificationService notifications, IDailyTimesheetService daily)
        {
            _uow = uow;
            _notifications = notifications;
            _daily = daily;
        }

        public Task<TimesheetTodayDto> GetTodayAsync(Guid userId) => _daily.GetTodayAsync(userId);

        public async Task<(Guid? RequestId, bool Triggered)> CheckDailyOvertimeOnClockOutAsync(Guid userId, TimeEntry? closedEntry)
        {
            var todayDto = await GetTodayAsync(userId);
            if (!todayDto.OvertimeTriggered)
                return (null, false);

            var today = DateTime.UtcNow.Date;
            var existing = await _uow.OvertimeRequests.GetOpenForUserOnDateAsync(userId, today);
            if (existing != null)
                return (existing.OvertimeRequestId, true);

            Guid? projectId = closedEntry?.ProjectId;
            Guid? taskId = closedEntry?.TaskId;
            if (!projectId.HasValue && taskId.HasValue)
            {
                var task = await _uow.Tasks.GetByIdAsync(taskId.Value);
                projectId = task?.ProjectId;
            }

            var request = new OvertimeRequest
            {
                UserId = userId,
                ProjectId = projectId,
                TaskId = taskId,
                WorkDate = today,
                TotalHoursThatDay = todayDto.TodayHours,
                Status = StatusPendingReason,
            };
            await _uow.OvertimeRequests.AddAsync(request);
            await _uow.CompleteAsync();

            await _notifications.PublishAsync(userId, new NotificationCreateDto
            {
                Type = TypeEmployee,
                Title = "Daily hours exceeded",
                Body = $"You logged {todayDto.TodayHours:0.#}h today (limit {todayDto.DailyLimitHours:0.#}h). Please submit a brief reason.",
                Link = $"/profile?overtimeId={request.OvertimeRequestId}",
            });

            return (request.OvertimeRequestId, true);
        }

        public async Task<OvertimeRequestDto?> GetRequestAsync(Guid requestId, Guid actingUserId)
        {
            var row = await _uow.OvertimeRequests.GetByIdAsync(requestId);
            if (row == null) return null;

            if (row.UserId != actingUserId)
            {
                if (row.ManagerId != actingUserId)
                {
                    if (!row.ProjectId.HasValue) return null;
                    var project = await _uow.Projects.GetByIdAsync(row.ProjectId.Value);
                    if (project == null || project.CreatedBy != actingUserId)
                    {
                        if (!await IsAdminAsync(actingUserId))
                            return null;
                    }
                }
            }

            return await ToDtoAsync(row);
        }

        public async Task<OvertimeRequestDto> SubmitReasonAsync(Guid requestId, OvertimeReasonDto dto)
        {
            var row = await _uow.OvertimeRequests.GetByIdAsync(requestId)
                ?? throw new InvalidOperationException("Overtime request not found.");
            if (row.UserId != dto.ActingUserId)
                throw new UnauthorizedAccessException("Not your overtime request.");
            if (row.Status == StatusResolved)
                throw new InvalidOperationException("Request already resolved.");

            row.EmployeeReason = (dto.Reason ?? "").Trim();
            if (string.IsNullOrWhiteSpace(row.EmployeeReason))
                throw new InvalidOperationException("Reason is required.");

            row.Status = StatusPendingManager;
            _uow.OvertimeRequests.Update(row);
            await _uow.CompleteAsync();

            var managerId = await ResolveManagerIdAsync(row);
            if (managerId != Guid.Empty)
            {
                row.ManagerId = managerId;
                _uow.OvertimeRequests.Update(row);
                await _uow.CompleteAsync();

                var employee = await _uow.Users.GetByIdAsync(row.UserId);
                await _notifications.PublishAsync(managerId, new NotificationCreateDto
                {
                    Type = TypeManager,
                    Title = "Overtime — manager action needed",
                    Body = $"{employee?.FullName ?? "Employee"}: {row.EmployeeReason}",
                    Link = $"/task-hub?overtimeId={row.OvertimeRequestId}&manager=1",
                });
            }

            return (await ToDtoAsync(row))!;
        }

        public async Task<OvertimeRequestDto> ResolveAsync(Guid requestId, OvertimeResolveDto dto)
        {
            var row = await _uow.OvertimeRequests.GetByIdAsync(requestId)
                ?? throw new InvalidOperationException("Overtime request not found.");

            var managerId = await ResolveManagerIdAsync(row);
            var isAdmin = await IsAdminAsync(dto.ActingUserId);
            if (managerId != dto.ActingUserId && !isAdmin)
                throw new UnauthorizedAccessException("Only the project manager or admin can resolve.");

            if (row.Status != StatusPendingManager)
                throw new InvalidOperationException("Employee must submit a reason first.");

            var action = (dto.Action ?? "").Trim();
            if (string.Equals(action, "ExtendDeadline", StringComparison.OrdinalIgnoreCase))
            {
                if (!row.TaskId.HasValue)
                    throw new InvalidOperationException("No task linked to extend deadline.");
                var task = await _uow.Tasks.GetByIdAsync(row.TaskId.Value)
                    ?? throw new InvalidOperationException("Task not found.");
                if (dto.NewDeadline.HasValue)
                    task.Deadline = dto.NewDeadline.Value;
                else
                    task.Deadline = DateTime.UtcNow.AddDays(3);
                if (dto.AdditionalEstimatedHours.HasValue && dto.AdditionalEstimatedHours > 0)
                    task.EstimatedHours = (task.EstimatedHours ?? 0m) + dto.AdditionalEstimatedHours.Value;
                _uow.Tasks.Update(task);
                row.ManagerAction = "ExtendDeadline";
            }
            else if (string.Equals(action, "Reassign", StringComparison.OrdinalIgnoreCase))
            {
                if (!row.TaskId.HasValue || !dto.NewAssigneeId.HasValue || dto.NewAssigneeId == Guid.Empty)
                    throw new InvalidOperationException("Task and new assignee required for reassign.");
                var task = await _uow.Tasks.GetByIdAsync(row.TaskId.Value)
                    ?? throw new InvalidOperationException("Task not found.");
                var onTeam = await TeamProjectGuards.EmployeeBelongsToProjectTeamAsync(
                    _uow, dto.NewAssigneeId.Value, task.ProjectId);
                if (!onTeam)
                    throw new InvalidOperationException("Assignee must be on the project team.");
                task.AssignedEmployeeId = dto.NewAssigneeId.Value;
                _uow.Tasks.Update(task);
                row.ManagerAction = "Reassign";
            }
            else
            {
                throw new InvalidOperationException("Action must be ExtendDeadline or Reassign.");
            }

            row.Status = StatusResolved;
            row.ResolvedAt = DateTime.UtcNow;
            row.ManagerId = dto.ActingUserId;
            _uow.OvertimeRequests.Update(row);
            await _uow.CompleteAsync();

            await _notifications.PublishAsync(row.UserId, new NotificationCreateDto
            {
                Type = "OvertimeResolved",
                Title = "Overtime request resolved",
                Body = $"Your manager completed action: {row.ManagerAction}.",
                Link = row.TaskId.HasValue ? $"/task-hub" : "/profile",
            });

            return (await ToDtoAsync(row))!;
        }

        private async Task<Guid> ResolveManagerIdAsync(OvertimeRequest row)
        {
            if (row.ProjectId.HasValue)
            {
                var project = await _uow.Projects.GetByIdAsync(row.ProjectId.Value);
                if (project != null) return project.CreatedBy;
            }
            if (row.TaskId.HasValue)
            {
                var task = await _uow.Tasks.GetByIdAsync(row.TaskId.Value);
                if (task != null)
                {
                    var project = await _uow.Projects.GetByIdAsync(task.ProjectId);
                    if (project != null) return project.CreatedBy;
                }
            }
            return Guid.Empty;
        }

        private async Task<OvertimeRequestDto> ToDtoAsync(OvertimeRequest row)
        {
            string? taskTitle = null;
            if (row.TaskId.HasValue)
            {
                var task = await _uow.Tasks.GetByIdAsync(row.TaskId.Value);
                taskTitle = task?.Title;
            }
            var user = await _uow.Users.GetByIdAsync(row.UserId);
            return new OvertimeRequestDto
            {
                OvertimeRequestId = row.OvertimeRequestId,
                UserId = row.UserId,
                ProjectId = row.ProjectId,
                TaskId = row.TaskId,
                TaskTitle = taskTitle,
                EmployeeName = user?.FullName,
                WorkDate = row.WorkDate,
                TotalHoursThatDay = row.TotalHoursThatDay,
                EmployeeReason = row.EmployeeReason,
                Status = row.Status,
                ManagerId = row.ManagerId,
                ManagerAction = row.ManagerAction,
                CreatedAt = row.CreatedAt,
            };
        }

        private async Task<UserProfile> EnsureProfileAsync(Guid userId)
        {
            var profile = await _uow.UserProfiles.GetByUserIdAsync(userId);
            if (profile != null) return profile;
            profile = new UserProfile { UserId = userId };
            await _uow.UserProfiles.AddAsync(profile);
            await _uow.CompleteAsync();
            return profile;
        }

        private static string? FormatTime(TimeSpan? t) =>
            t.HasValue ? $"{t.Value.Hours:D2}:{t.Value.Minutes:D2}" : null;

        private async Task<bool> IsAdminAsync(Guid userId)
        {
            var u = await _uow.Users.GetByIdAsync(userId);
            return u?.UserRoles?.Any(ur => ur.Role?.RoleName == "Admin") == true;
        }
    }
}
