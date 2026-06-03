using System;

namespace MANAGIX.Models.DTO
{
    public class OvertimeRequestDto
    {
        public Guid OvertimeRequestId { get; set; }
        public Guid UserId { get; set; }
        public Guid? ProjectId { get; set; }
        public Guid? TaskId { get; set; }
        public string? TaskTitle { get; set; }
        public string? EmployeeName { get; set; }
        public DateTime WorkDate { get; set; }
        public decimal TotalHoursThatDay { get; set; }
        public string? EmployeeReason { get; set; }
        public string Status { get; set; } = string.Empty;
        public Guid? ManagerId { get; set; }
        public string? ManagerAction { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class OvertimeReasonDto
    {
        public string Reason { get; set; } = string.Empty;
        public Guid ActingUserId { get; set; }
    }

    public class OvertimeResolveDto
    {
        public Guid ActingUserId { get; set; }
        /// <summary>ExtendDeadline | Reassign</summary>
        public string Action { get; set; } = string.Empty;
        public DateTime? NewDeadline { get; set; }
        public Guid? NewAssigneeId { get; set; }
        public decimal? AdditionalEstimatedHours { get; set; }
    }

    public class AdminPayrollSettingsDto
    {
        public Guid UserId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? RoleName { get; set; }
        public decimal? HourlyRate { get; set; }
        public decimal? MonthlySalary { get; set; }
        public decimal WeeklyCapacityHours { get; set; }
        public decimal StandardHoursPerDay { get; set; }
        public decimal OvertimeGraceHours { get; set; }
        public string? ShiftStartTime { get; set; }
        public string? ShiftEndTime { get; set; }
    }

    public class AdminPayrollSettingsUpdateDto
    {
        public decimal? HourlyRate { get; set; }
        public decimal? MonthlySalary { get; set; }
        public decimal? WeeklyCapacityHours { get; set; }
        public decimal? StandardHoursPerDay { get; set; }
        public decimal? OvertimeGraceHours { get; set; }
        public string? ShiftStartTime { get; set; }
        public string? ShiftEndTime { get; set; }
    }
}
