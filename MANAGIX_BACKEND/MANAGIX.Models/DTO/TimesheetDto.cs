using System;
using System.Collections.Generic;

namespace MANAGIX.Models.DTO
{
    public class PresenceHeartbeatDto
    {
        public Guid UserId { get; set; }
        public bool IsOnline { get; set; }
        public DateTime LastActiveAt { get; set; }
    }

    public class TimeEntryDto
    {
        public Guid TimeEntryId { get; set; }
        public Guid UserId { get; set; }
        public Guid? ProjectId { get; set; }
        public Guid? TaskId { get; set; }
        public DateTime StartedAt { get; set; }
        public DateTime? EndedAt { get; set; }
        public decimal Hours { get; set; }
        public string EntryType { get; set; } = "Work";
    }

    public class ClockInDto
    {
        public Guid UserId { get; set; }
        public Guid? ProjectId { get; set; }
        public Guid? TaskId { get; set; }
    }

    public class ClockOutDto
    {
        public Guid UserId { get; set; }
    }

    public class TimesheetPolicyDto
    {
        public decimal StandardHoursPerDay { get; set; } = 8m;
        public decimal OvertimeGraceHours { get; set; } = 2m;
        public decimal DailyMaxHours { get; set; } = 12m;
        public decimal OvertimeThresholdHours { get; set; } = 10m;
        public decimal MinimumSubmitHours { get; set; }
    }

    public class TimesheetTodayDto
    {
        public Guid UserId { get; set; }
        public decimal TodayHours { get; set; }
        public decimal StandardHoursPerDay { get; set; }
        public decimal OvertimeGraceHours { get; set; }
        public decimal DailyMaxHours { get; set; }
        public decimal OvertimeThresholdHours { get; set; }
        public decimal DailyLimitHours { get; set; }
        public bool OvertimeTriggered { get; set; }
        public bool RequiresOvertimeReasonOnSubmit { get; set; }
        public string? DailyTimesheetStatus { get; set; }
        public Guid? DailyTimesheetId { get; set; }
        public bool IsClockedIn { get; set; }
        /// <summary>UTC start of open clock-in session (for live H:M:S display).</summary>
        public DateTime? OpenSessionStartedAt { get; set; }
        public decimal MinimumSubmitHours { get; set; }
        public bool CanSubmitToday { get; set; }
        public decimal HoursRemainingToSubmit { get; set; }
        public string? ShiftStartTime { get; set; }
        public string? ShiftEndTime { get; set; }
    }

    public class DailyTimesheetDto
    {
        public Guid DailyTimesheetId { get; set; }
        public Guid UserId { get; set; }
        public string? FullName { get; set; }
        public string? Email { get; set; }
        /// <summary>Primary role of submitter (e.g. Manager) — manager rows need admin approval.</summary>
        public string? SubmitterRole { get; set; }
        public DateTime WorkDate { get; set; }
        public decimal TotalHours { get; set; }
        public string Status { get; set; } = "Draft";
        public string? EmployeeNote { get; set; }
        public string? OvertimeReason { get; set; }
        public string? ManagerComment { get; set; }
        public DateTime? SubmittedAt { get; set; }
        public DateTime? ReviewedAt { get; set; }
        public List<TimeEntryDto> Entries { get; set; } = new();
    }

    public class SubmitDailyTimesheetDto
    {
        public Guid UserId { get; set; }
        public DateTime? WorkDate { get; set; }
        public string? EmployeeNote { get; set; }
        public string? OvertimeReason { get; set; }
    }

    public class ReviewDailyTimesheetDto
    {
        public Guid ActingUserId { get; set; }
        public bool Approve { get; set; }
        public string? ManagerComment { get; set; }
    }

    public class ClockOutResultDto
    {
        public TimeEntryDto? Entry { get; set; }
        public TimesheetTodayDto? Today { get; set; }
        public Guid? OvertimeRequestId { get; set; }
        public bool OvertimeTriggered { get; set; }
        public string? Message { get; set; }
    }

    public class TimesheetSummaryDto
    {
        public Guid UserId { get; set; }
        public decimal TotalHoursThisWeek { get; set; }
        public decimal TotalHoursAllTime { get; set; }
        public decimal TodayHours { get; set; }
        public decimal StandardHoursPerDay { get; set; }
        public decimal DailyLimitHours { get; set; }
        public bool IsOnline { get; set; }
        public TimeEntryDto? OpenEntry { get; set; }
        public List<TimeEntryDto> RecentEntries { get; set; } = new();
        public Guid? PendingOvertimeRequestId { get; set; }
    }
}
