using MANAGIX.DataAccess.Repositories.IRepositories;
using MANAGIX.Models.DTO;
using MANAGIX.Models.Models;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace MANAGIX.Services
{
    public interface ITimesheetService
    {
        Task<PresenceHeartbeatDto> HeartbeatAsync(Guid userId);
        Task<TimeEntryDto> ClockInAsync(ClockInDto dto);
        Task<ClockOutResultDto> ClockOutAsync(Guid userId);
        Task<TimesheetSummaryDto> GetSummaryAsync(Guid userId);
        Task<TimesheetTodayDto> GetTodayAsync(Guid userId);
        Task<bool> IsUserOnlineAsync(Guid userId);
    }

    public class TimesheetService : ITimesheetService
    {
        private readonly IUnitOfWork _uow;
        private readonly IDailyTimesheetService _daily;
        private static readonly TimeSpan OnlineThreshold = TimeSpan.FromMinutes(5);

        public TimesheetService(IUnitOfWork uow, IDailyTimesheetService daily)
        {
            _uow = uow;
            _daily = daily;
        }

        public Task<TimesheetTodayDto> GetTodayAsync(Guid userId) => _daily.GetTodayAsync(userId);

        public async Task<PresenceHeartbeatDto> HeartbeatAsync(Guid userId)
        {
            var profile = await _uow.UserProfiles.GetByUserIdAsync(userId);
            if (profile == null)
            {
                profile = new UserProfile { UserId = userId };
                await _uow.UserProfiles.AddAsync(profile);
            }

            profile.LastActiveAt = DateTime.UtcNow;
            _uow.UserProfiles.Update(profile);
            await _uow.CompleteAsync();

            return new PresenceHeartbeatDto
            {
                UserId = userId,
                IsOnline = true,
                LastActiveAt = profile.LastActiveAt.Value,
            };
        }

        public async Task<bool> IsUserOnlineAsync(Guid userId)
        {
            var profile = await _uow.UserProfiles.GetByUserIdAsync(userId);
            if (profile?.LastActiveAt == null) return false;
            return DateTime.UtcNow - profile.LastActiveAt.Value <= OnlineThreshold;
        }

        public async Task<TimeEntryDto> ClockInAsync(ClockInDto dto)
        {
            await CloseStaleOpenEntriesAsync(dto.UserId);

            var policy = await _uow.TimesheetPolicy.GetOrCreateAsync();
            var today = DateTime.UtcNow.Date;
            var sheet = await _uow.DailyTimesheets.GetByUserAndDateAsync(dto.UserId, today);
            if (sheet != null && (sheet.Status == DailyTimesheetService.StatusSubmitted || sheet.Status == DailyTimesheetService.StatusApproved))
                throw new InvalidOperationException("Today's timesheet is already submitted. Clock resets tomorrow.");

            var dayHours = await _uow.TimeEntries.SumHoursByUserForUtcDayAsync(dto.UserId, today);
            if (dayHours >= policy.DailyMaxHours)
                throw new InvalidOperationException(
                    $"Daily maximum of {policy.DailyMaxHours}h reached. Submit your timesheet with an overtime reason.");

            var open = await _uow.TimeEntries.GetOpenEntryAsync(dto.UserId);
            if (open != null)
                throw new InvalidOperationException("Already clocked in. Clock out first.");

            var entry = new TimeEntry
            {
                UserId = dto.UserId,
                StartedAt = DateTime.UtcNow,
                EntryType = "Work",
            };
            await _uow.TimeEntries.AddAsync(entry);
            await _uow.CompleteAsync();
            await HeartbeatAsync(dto.UserId);
            return ToDto(entry);
        }

        public async Task<ClockOutResultDto> ClockOutAsync(Guid userId)
        {
            await CloseStaleOpenEntriesAsync(userId);
            var open = await _uow.TimeEntries.GetOpenEntryAsync(userId);
            if (open == null)
            {
                return new ClockOutResultDto
                {
                    Message = "No open time entry.",
                    Today = await _daily.GetTodayAsync(userId),
                };
            }

            open.EndedAt = DateTime.UtcNow;
            var elapsedSeconds = Math.Max(0, (int)(open.EndedAt.Value - open.StartedAt).TotalSeconds);
            open.Hours = Math.Round((decimal)elapsedSeconds / 3600m, 4);
            _uow.TimeEntries.Update(open);
            await _uow.CompleteAsync();

            var today = await _daily.GetTodayAsync(userId);
            return new ClockOutResultDto
            {
                Entry = ToDto(open),
                Today = today,
                OvertimeTriggered = today.RequiresOvertimeReasonOnSubmit,
                Message = today.RequiresOvertimeReasonOnSubmit
                    ? $"Over {today.OvertimeThresholdHours:0.#}h today — add an overtime reason when you submit your timesheet."
                    : null,
            };
        }

        public async Task<TimesheetSummaryDto> GetSummaryAsync(Guid userId)
        {
            var weekStart = DateTime.UtcNow.Date.AddDays(-(int)DateTime.UtcNow.DayOfWeek);
            var weekHours = await _uow.TimeEntries.SumHoursByUserAsync(userId, weekStart);
            var allHours = await _uow.TimeEntries.SumHoursByUserAsync(userId);
            var open = await _uow.TimeEntries.GetOpenEntryAsync(userId);
            var recent = await _uow.TimeEntries.GetByUserAsync(userId, 20);
            var today = await _daily.GetTodayAsync(userId);

            return new TimesheetSummaryDto
            {
                UserId = userId,
                TotalHoursThisWeek = weekHours,
                TotalHoursAllTime = allHours,
                TodayHours = today.TodayHours,
                StandardHoursPerDay = today.StandardHoursPerDay,
                DailyLimitHours = today.DailyMaxHours,
                IsOnline = await IsUserOnlineAsync(userId),
                OpenEntry = open == null ? null : ToDto(open),
                RecentEntries = recent.Select(ToDto).ToList(),
            };
        }

        /// <summary>Auto-close forgotten sessions from prior UTC days so UI can clock in again.</summary>
        private async Task CloseStaleOpenEntriesAsync(Guid userId)
        {
            var open = await _uow.TimeEntries.GetOpenEntryAsync(userId);
            if (open == null || open.StartedAt.Date >= DateTime.UtcNow.Date)
                return;

            var end = open.StartedAt.Date.AddDays(1);
            if (end > DateTime.UtcNow) end = DateTime.UtcNow;
            open.EndedAt = end;
            var elapsedSeconds = Math.Max(0, (int)(open.EndedAt.Value - open.StartedAt).TotalSeconds);
            open.Hours = Math.Round((decimal)elapsedSeconds / 3600m, 4);
            _uow.TimeEntries.Update(open);
            await _uow.CompleteAsync();
        }

        private static TimeEntryDto ToDto(TimeEntry e) => new()
        {
            TimeEntryId = e.TimeEntryId,
            UserId = e.UserId,
            ProjectId = e.ProjectId,
            TaskId = e.TaskId,
            StartedAt = e.StartedAt,
            EndedAt = e.EndedAt,
            Hours = e.Hours,
            EntryType = e.EntryType,
        };
    }
}
