using MANAGIX.DataAccess.Repositories.IRepositories;
using MANAGIX.Models.DTO;
using MANAGIX.Models.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace MANAGIX.Services
{
    public interface IAdminPayrollSettingsService
    {
        Task<List<AdminPayrollSettingsDto>> GetEmployeeSettingsAsync();
        Task<AdminPayrollSettingsDto> UpdateEmployeeSettingsAsync(Guid userId, AdminPayrollSettingsUpdateDto dto);
    }

    public class AdminPayrollSettingsService : IAdminPayrollSettingsService
    {
        private readonly IUnitOfWork _uow;

        public AdminPayrollSettingsService(IUnitOfWork uow) => _uow = uow;

        public async Task<List<AdminPayrollSettingsDto>> GetEmployeeSettingsAsync()
        {
            var users = await _uow.Users.GetAllWithRolesAndProfileAsync();
            return users.Select(u => ToDto(u, u.Profile)).ToList();
        }

        public async Task<AdminPayrollSettingsDto> UpdateEmployeeSettingsAsync(Guid userId, AdminPayrollSettingsUpdateDto dto)
        {
            var user = await _uow.Users.GetByIdAsync(userId)
                ?? throw new InvalidOperationException("User not found.");

            var profile = await _uow.UserProfiles.GetByUserIdAsync(userId);
            if (profile == null)
            {
                profile = new UserProfile { UserId = userId };
                await _uow.UserProfiles.AddAsync(profile);
            }

            if (dto.HourlyRate.HasValue) profile.HourlyRate = dto.HourlyRate;
            if (dto.MonthlySalary.HasValue) profile.MonthlySalary = dto.MonthlySalary;
            if (dto.WeeklyCapacityHours.HasValue && dto.WeeklyCapacityHours > 0)
                profile.WeeklyCapacityHours = dto.WeeklyCapacityHours.Value;
            if (dto.StandardHoursPerDay.HasValue && dto.StandardHoursPerDay > 0)
                profile.StandardHoursPerDay = dto.StandardHoursPerDay.Value;
            if (dto.OvertimeGraceHours.HasValue && dto.OvertimeGraceHours >= 0)
                profile.OvertimeGraceHours = dto.OvertimeGraceHours.Value;
            if (dto.ShiftStartTime != null)
                profile.ShiftStartTime = ParseTime(dto.ShiftStartTime);
            if (dto.ShiftEndTime != null)
                profile.ShiftEndTime = ParseTime(dto.ShiftEndTime);

            _uow.UserProfiles.Update(profile);
            await _uow.CompleteAsync();
            return ToDto(user, profile);
        }

        private static AdminPayrollSettingsDto ToDto(User u, UserProfile? profile)
        {
            var roleName = u.UserRoles?
                .Select(ur => ur.Role?.RoleName)
                .FirstOrDefault(r => !string.IsNullOrWhiteSpace(r));
            return new AdminPayrollSettingsDto
            {
            UserId = u.UserId,
            FullName = u.FullName,
            Email = u.Email,
            RoleName = roleName,
            HourlyRate = profile?.HourlyRate,
            MonthlySalary = profile?.MonthlySalary,
            WeeklyCapacityHours = profile?.WeeklyCapacityHours ?? 40m,
            StandardHoursPerDay = profile?.StandardHoursPerDay ?? 8m,
            OvertimeGraceHours = profile?.OvertimeGraceHours ?? 2m,
            ShiftStartTime = FormatTime(profile?.ShiftStartTime),
            ShiftEndTime = FormatTime(profile?.ShiftEndTime),
            };
        }

        private static TimeSpan? ParseTime(string? s)
        {
            if (string.IsNullOrWhiteSpace(s)) return null;
            if (TimeSpan.TryParse(s, out var t)) return t;
            return null;
        }

        private static string? FormatTime(TimeSpan? t) =>
            t.HasValue ? $"{t.Value.Hours:D2}:{t.Value.Minutes:D2}" : null;
    }
}
