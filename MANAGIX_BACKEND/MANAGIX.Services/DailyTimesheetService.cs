using MANAGIX.DataAccess.Repositories.IRepositories;
using MANAGIX.Models.DTO;
using MANAGIX.Models.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace MANAGIX.Services
{
    public interface IDailyTimesheetService
    {
        Task<TimesheetPolicyDto> GetPolicyAsync();
        Task<TimesheetPolicyDto> UpdatePolicyAsync(TimesheetPolicyDto dto);
        Task<TimesheetTodayDto> GetTodayAsync(Guid userId);
        Task<DailyTimesheetDto> SubmitAsync(SubmitDailyTimesheetDto dto);
        Task<DailyTimesheetDto> ReviewAsync(Guid dailyTimesheetId, ReviewDailyTimesheetDto dto);
        Task<List<DailyTimesheetDto>> GetMyHistoryAsync(Guid userId, int limit = 14);
        Task<List<DailyTimesheetDto>> GetForAdminAsync(DateTime? from, DateTime? to);
        Task<List<DailyTimesheetDto>> GetForManagerAsync(Guid managerId, DateTime? from, DateTime? to);
        Task<DailyTimesheetDto?> GetDayDetailAsync(Guid userId, DateTime workDate, Guid actingUserId, bool isAdmin);
    }

    public class DailyTimesheetService : IDailyTimesheetService
    {
        public const string StatusDraft = "Draft";
        public const string StatusSubmitted = "Submitted";
        public const string StatusApproved = "Approved";
        public const string StatusRejected = "Rejected";

        private readonly IUnitOfWork _uow;
        private readonly IManagerScopeService _scope;
        private readonly INotificationService _notifications;

        public DailyTimesheetService(IUnitOfWork uow, IManagerScopeService scope, INotificationService notifications)
        {
            _uow = uow;
            _scope = scope;
            _notifications = notifications;
        }

        public async Task<TimesheetPolicyDto> GetPolicyAsync()
        {
            var p = await _uow.TimesheetPolicy.GetOrCreateAsync();
            return ToPolicyDto(p);
        }

        public async Task<TimesheetPolicyDto> UpdatePolicyAsync(TimesheetPolicyDto dto)
        {
            var p = await _uow.TimesheetPolicy.GetOrCreateAsync();
            if (dto.StandardHoursPerDay > 0) p.StandardHoursPerDay = dto.StandardHoursPerDay;
            if (dto.OvertimeGraceHours >= 0) p.OvertimeGraceHours = dto.OvertimeGraceHours;
            if (dto.DailyMaxHours > 0) p.DailyMaxHours = dto.DailyMaxHours;
            if (dto.MinimumSubmitHours >= 0) p.MinimumSubmitHours = dto.MinimumSubmitHours;
            _uow.TimesheetPolicy.Update(p);
            await _uow.CompleteAsync();
            return ToPolicyDto(p);
        }

        public async Task<TimesheetTodayDto> GetTodayAsync(Guid userId)
        {
            await ExpireUnsubmittedPriorDaysAsync(userId);
            var policy = await _uow.TimesheetPolicy.GetOrCreateAsync();
            var today = DateTime.UtcNow.Date;
            var hours = await ComputeDayHoursAsync(userId, today);
            var sheet = await _uow.DailyTimesheets.GetByUserAndDateAsync(userId, today);
            var threshold = policy.StandardHoursPerDay + policy.OvertimeGraceHours;
            var open = await _uow.TimeEntries.GetOpenEntryAsync(userId);
            var status = sheet?.Status ?? StatusDraft;
            var minSubmit = policy.MinimumSubmitHours;
            var meetsMinimum = minSubmit <= 0 || hours >= minSubmit;
            var canSubmit = meetsMinimum
                && open == null
                && hours > 0
                && status != StatusSubmitted
                && status != StatusApproved;

            return new TimesheetTodayDto
            {
                UserId = userId,
                TodayHours = hours,
                IsClockedIn = open != null,
                OpenSessionStartedAt = open?.StartedAt,
                StandardHoursPerDay = policy.StandardHoursPerDay,
                OvertimeGraceHours = policy.OvertimeGraceHours,
                DailyMaxHours = policy.DailyMaxHours,
                OvertimeThresholdHours = threshold,
                DailyLimitHours = policy.DailyMaxHours,
                MinimumSubmitHours = minSubmit,
                HoursRemainingToSubmit = minSubmit > 0 ? Math.Max(0m, minSubmit - hours) : 0m,
                CanSubmitToday = canSubmit,
                OvertimeTriggered = hours > threshold,
                RequiresOvertimeReasonOnSubmit = hours > threshold || hours >= policy.DailyMaxHours,
                DailyTimesheetStatus = status,
                DailyTimesheetId = sheet?.DailyTimesheetId,
            };
        }

        public async Task<DailyTimesheetDto> SubmitAsync(SubmitDailyTimesheetDto dto)
        {
            var workDate = (dto.WorkDate ?? DateTime.UtcNow).Date;
            var open = await _uow.TimeEntries.GetOpenEntryAsync(dto.UserId);
            if (open != null)
                throw new InvalidOperationException("Clock out before submitting your timesheet.");

            var policy = await _uow.TimesheetPolicy.GetOrCreateAsync();
            var total = await ComputeDayHoursAsync(dto.UserId, workDate);
            if (total <= 0)
                throw new InvalidOperationException("No clocked hours for this day.");

            if (total > policy.DailyMaxHours)
                throw new InvalidOperationException($"Daily maximum is {policy.DailyMaxHours}h. You have {total:0.#}h.");

            if (policy.MinimumSubmitHours > 0 && total < policy.MinimumSubmitHours)
                throw new InvalidOperationException(
                    $"Minimum {policy.MinimumSubmitHours:0.#}h required before submit. You have {total:0.#}h — clock more time first.");

            var threshold = policy.StandardHoursPerDay + policy.OvertimeGraceHours;
            if (total >= policy.DailyMaxHours && string.IsNullOrWhiteSpace(dto.OvertimeReason))
                throw new InvalidOperationException(
                    $"You reached the {policy.DailyMaxHours}h daily limit. Submit a reason for the extra work.");

            if (total > threshold && string.IsNullOrWhiteSpace(dto.OvertimeReason))
                throw new InvalidOperationException(
                    $"Over {threshold:0.#}h requires an overtime reason ({policy.StandardHoursPerDay}h shift + {policy.OvertimeGraceHours}h grace).");

            var sheet = await _uow.DailyTimesheets.GetByUserAndDateAsync(dto.UserId, workDate);
            if (sheet != null && sheet.Status == StatusSubmitted)
                throw new InvalidOperationException("Timesheet already submitted for this day.");
            if (sheet != null && sheet.Status == StatusApproved)
                throw new InvalidOperationException("Timesheet already approved.");

            if (sheet == null)
            {
                sheet = new DailyTimesheet
                {
                    UserId = dto.UserId,
                    WorkDate = workDate,
                    TotalHours = total,
                    Status = StatusSubmitted,
                    EmployeeNote = dto.EmployeeNote,
                    OvertimeReason = dto.OvertimeReason?.Trim(),
                    SubmittedAt = DateTime.UtcNow,
                };
                await _uow.DailyTimesheets.AddAsync(sheet);
            }
            else
            {
                sheet.TotalHours = total;
                sheet.Status = StatusSubmitted;
                sheet.EmployeeNote = dto.EmployeeNote;
                sheet.OvertimeReason = dto.OvertimeReason?.Trim();
                sheet.SubmittedAt = DateTime.UtcNow;
                sheet.ManagerComment = null;
                sheet.ReviewedBy = null;
                sheet.ReviewedAt = null;
                _uow.DailyTimesheets.Update(sheet);
            }

            await _uow.CompleteAsync();
            await NotifyManagerForSubmitAsync(sheet);
            return await ToDtoAsync(sheet, includeEntries: true);
        }

        public async Task<DailyTimesheetDto> ReviewAsync(Guid dailyTimesheetId, ReviewDailyTimesheetDto dto)
        {
            var sheet = await _uow.DailyTimesheets.GetByIdAsync(dailyTimesheetId)
                ?? throw new InvalidOperationException("Timesheet not found.");

            if (sheet.Status != StatusSubmitted)
                throw new InvalidOperationException("Only submitted timesheets can be reviewed.");

            var isAdmin = await IsAdminAsync(dto.ActingUserId);
            var submitter = await _uow.Users.GetByIdAsync(sheet.UserId);
            var submitterIsManager = submitter?.UserRoles?.Any(ur => ur.Role?.RoleName == "Manager") == true;

            if (submitterIsManager && !isAdmin)
                throw new UnauthorizedAccessException("Manager timesheets must be approved by admin.");

            if (!isAdmin)
            {
                var managerId = await ResolveManagerForEmployeeAsync(sheet.UserId);
                if (managerId != dto.ActingUserId && sheet.UserId != dto.ActingUserId)
                    throw new UnauthorizedAccessException("Not authorized to review this timesheet.");
                if (sheet.UserId == dto.ActingUserId)
                    throw new InvalidOperationException("You cannot approve your own timesheet.");
            }

            sheet.Status = dto.Approve ? StatusApproved : StatusRejected;
            sheet.ManagerComment = dto.ManagerComment?.Trim();
            sheet.ReviewedBy = dto.ActingUserId;
            sheet.ReviewedAt = DateTime.UtcNow;
            _uow.DailyTimesheets.Update(sheet);
            await _uow.CompleteAsync();

            await _notifications.PublishAsync(sheet.UserId, new NotificationCreateDto
            {
                Type = dto.Approve ? "TimesheetApproved" : "TimesheetRejected",
                Title = dto.Approve ? "Timesheet approved" : "Timesheet rejected",
                Body = dto.ManagerComment ?? (dto.Approve ? "Your daily timesheet was approved." : "Please review and resubmit."),
                Link = "/timesheets",
            });

            return await ToDtoAsync(sheet, includeEntries: true);
        }

        public async Task<List<DailyTimesheetDto>> GetMyHistoryAsync(Guid userId, int limit = 14)
        {
            var rows = await _uow.DailyTimesheets.GetByUserAsync(userId, limit);
            var list = new List<DailyTimesheetDto>();
            foreach (var r in rows)
                list.Add(await ToDtoAsync(r, false));
            return list;
        }

        public async Task<List<DailyTimesheetDto>> GetForAdminAsync(DateTime? from, DateTime? to)
        {
            var rows = await _uow.DailyTimesheets.GetAllAsync(from, to);
            var list = new List<DailyTimesheetDto>();
            foreach (var r in rows)
                list.Add(await ToDtoAsync(r, false));
            return list;
        }

        public async Task<List<DailyTimesheetDto>> GetForManagerAsync(Guid managerId, DateTime? from, DateTime? to)
        {
            var memberIds = await _scope.GetScopedMemberIdsAsync(managerId);
            memberIds.Add(managerId);
            var rows = await _uow.DailyTimesheets.GetByUserIdsAsync(memberIds, from, to);
            var list = new List<DailyTimesheetDto>();
            foreach (var r in rows.OrderByDescending(x => x.WorkDate))
                list.Add(await ToDtoAsync(r, false));
            return list;
        }

        public async Task<DailyTimesheetDto?> GetDayDetailAsync(Guid userId, DateTime workDate, Guid actingUserId, bool isAdmin)
        {
            if (!isAdmin && actingUserId != userId)
            {
                var scoped = await _scope.GetScopedMemberIdsAsync(actingUserId);
                if (!scoped.Contains(userId) && actingUserId != userId)
                {
                    if (!await IsAdminAsync(actingUserId)) return null;
                }
            }

            var sheet = await _uow.DailyTimesheets.GetByUserAndDateAsync(userId, workDate.Date);
            if (sheet == null)
            {
                var hours = await ComputeDayHoursAsync(userId, workDate.Date);
                if (hours <= 0) return null;
                return new DailyTimesheetDto
                {
                    UserId = userId,
                    WorkDate = workDate.Date,
                    TotalHours = hours,
                    Status = StatusDraft,
                    Entries = await GetEntriesForDayAsync(userId, workDate.Date),
                };
            }
            return await ToDtoAsync(sheet, true);
        }

        private async Task<decimal> ComputeDayHoursAsync(Guid userId, DateTime day)
        {
            var hours = await _uow.TimeEntries.SumHoursByUserForUtcDayAsync(userId, day);
            var open = await _uow.TimeEntries.GetOpenEntryAsync(userId);
            if (open != null && open.StartedAt.Date == day)
            {
                hours += Math.Round((decimal)(DateTime.UtcNow - open.StartedAt).TotalHours, 4);
            }
            return hours;
        }

        private async Task<List<TimeEntryDto>> GetEntriesForDayAsync(Guid userId, DateTime day)
        {
            var end = day.AddDays(1);
            var all = await _uow.TimeEntries.GetByUserAsync(userId, 100);
            return all
                .Where(e => e.StartedAt >= day && e.StartedAt < end)
                .Select(e => new TimeEntryDto
                {
                    TimeEntryId = e.TimeEntryId,
                    UserId = e.UserId,
                    StartedAt = e.StartedAt,
                    EndedAt = e.EndedAt,
                    Hours = e.Hours,
                    EntryType = e.EntryType,
                })
                .ToList();
        }

        private async Task<DailyTimesheetDto> ToDtoAsync(DailyTimesheet sheet, bool includeEntries)
        {
            var u = await _uow.Users.GetByIdAsync(sheet.UserId);
            var primaryRole = u?.UserRoles?
                .Select(ur => ur.Role?.RoleName)
                .FirstOrDefault(r => !string.IsNullOrWhiteSpace(r));

            var dto = new DailyTimesheetDto
            {
                DailyTimesheetId = sheet.DailyTimesheetId,
                UserId = sheet.UserId,
                FullName = u?.FullName,
                Email = u?.Email,
                SubmitterRole = primaryRole,
                WorkDate = sheet.WorkDate,
                TotalHours = sheet.TotalHours,
                Status = sheet.Status,
                EmployeeNote = sheet.EmployeeNote,
                OvertimeReason = sheet.OvertimeReason,
                ManagerComment = sheet.ManagerComment,
                SubmittedAt = sheet.SubmittedAt,
                ReviewedAt = sheet.ReviewedAt,
            };
            if (includeEntries)
                dto.Entries = await GetEntriesForDayAsync(sheet.UserId, sheet.WorkDate);
            return dto;
        }

        private async Task NotifyManagerForSubmitAsync(DailyTimesheet sheet)
        {
            var submitter = await _uow.Users.GetByIdAsync(sheet.UserId);
            var isManager = submitter?.UserRoles?.Any(ur => ur.Role?.RoleName == "Manager") == true;

            if (isManager)
            {
                var adminIds = await _uow.Users.GetUserIdsByRoleNameAsync("Admin");
                foreach (var adminId in adminIds.Distinct())
                {
                    await _notifications.PublishAsync(adminId, new NotificationCreateDto
                    {
                        Type = "TimesheetSubmitted",
                        Title = "Manager timesheet needs approval",
                        Body = $"{submitter?.FullName ?? "Manager"} submitted {sheet.TotalHours:0.#}h for {sheet.WorkDate:yyyy-MM-dd}.",
                        Link = "/timesheets",
                    });
                }
                return;
            }

            var managerId = await ResolveManagerForEmployeeAsync(sheet.UserId);
            if (managerId == Guid.Empty || managerId == sheet.UserId) return;
            await _notifications.PublishAsync(managerId, new NotificationCreateDto
            {
                Type = "TimesheetSubmitted",
                Title = "Timesheet submitted for approval",
                Body = $"{submitter?.FullName ?? "Employee"} submitted {sheet.TotalHours:0.#}h for {sheet.WorkDate:yyyy-MM-dd}.",
                Link = "/timesheets",
            });
        }

        private async Task<Guid> ResolveManagerForEmployeeAsync(Guid employeeId)
        {
            var tasks = await _uow.Tasks.GetByEmployeeIdAsync(employeeId);
            var projectId = tasks.Select(t => t.ProjectId).FirstOrDefault();
            if (projectId == Guid.Empty) return Guid.Empty;
            var project = await _uow.Projects.GetByIdAsync(projectId);
            return project?.CreatedBy ?? Guid.Empty;
        }

        private async Task<bool> IsAdminAsync(Guid userId)
        {
            var u = await _uow.Users.GetByIdAsync(userId);
            return u?.UserRoles?.Any(ur => ur.Role?.RoleName == "Admin") == true;
        }

        /// <summary>Remove prior days that were never submitted (mandatory daily submit).</summary>
        private async Task ExpireUnsubmittedPriorDaysAsync(Guid userId)
        {
            var today = DateTime.UtcNow.Date;
            var changed = false;
            var stale = await _uow.DailyTimesheets.GetUnsubmittedBeforeDateAsync(userId, today);
            foreach (var sheet in stale)
            {
                var entries = await _uow.TimeEntries.GetEntriesForUserOnUtcDayAsync(userId, sheet.WorkDate);
                if (entries.Count > 0)
                    _uow.TimeEntries.RemoveRange(entries);
                _uow.DailyTimesheets.Remove(sheet);
                changed = true;
            }

            for (var day = today.AddDays(-14); day < today; day = day.AddDays(1))
            {
                var sheet = await _uow.DailyTimesheets.GetByUserAndDateAsync(userId, day);
                if (sheet != null && (sheet.Status == StatusSubmitted || sheet.Status == StatusApproved))
                    continue;
                var entries = await _uow.TimeEntries.GetEntriesForUserOnUtcDayAsync(userId, day);
                if (entries.Count == 0) continue;
                if (!entries.Any(e => e.EndedAt != null)) continue;
                _uow.TimeEntries.RemoveRange(entries);
                if (sheet != null)
                {
                    _uow.DailyTimesheets.Remove(sheet);
                    changed = true;
                }
                else
                    changed = true;
            }

            if (changed)
                await _uow.CompleteAsync();
        }

        private static TimesheetPolicyDto ToPolicyDto(TimesheetPolicySettings p) => new()
        {
            StandardHoursPerDay = p.StandardHoursPerDay,
            OvertimeGraceHours = p.OvertimeGraceHours,
            DailyMaxHours = p.DailyMaxHours,
            MinimumSubmitHours = p.MinimumSubmitHours,
            OvertimeThresholdHours = p.StandardHoursPerDay + p.OvertimeGraceHours,
        };
    }
}
