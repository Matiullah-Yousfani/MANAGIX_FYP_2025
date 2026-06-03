using MANAGIX.DataAccess.Repositories.IRepositories;
using MANAGIX.Models.DTO;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace MANAGIX.Services
{
    public interface IPayrollService
    {
        Task<PayrollSummaryDto> GetProjectPayrollAsync(Guid projectId);
        Task<PayrollSummaryDto> GetOrganizationPayrollAsync();
    }

    public class PayrollService : IPayrollService
    {
        private readonly IUnitOfWork _uow;

        public PayrollService(IUnitOfWork uow) => _uow = uow;

        public async Task<PayrollSummaryDto> GetProjectPayrollAsync(Guid projectId)
        {
            var project = await _uow.Projects.GetByIdAsync(projectId);
            var lines = new List<PayrollEmployeeLineDto>();
            decimal totalCost = 0;

            var pt = await _uow.ProjectTeams.GetByProjectIdAsync(projectId);
            if (pt != null)
            {
                var members = await _uow.TeamEmployees.GetEmployeesByTeamIdAsync(pt.TeamId);
                foreach (var te in members)
                {
                    var line = await BuildLineAsync(te.EmployeeId, projectId);
                    lines.Add(line);
                    totalCost += line.EstimatedCost;
                }
            }

            return new PayrollSummaryDto
            {
                ProjectId = projectId,
                ProjectTitle = project?.Title,
                TotalBudget = project?.Budget ?? 0,
                TotalEstimatedLaborCost = totalCost,
                BudgetRemaining = (project?.Budget ?? 0) - totalCost,
                Employees = lines.OrderByDescending(l => l.EstimatedCost).ToList(),
            };
        }

        public async Task<PayrollSummaryDto> GetOrganizationPayrollAsync()
        {
            var users = await _uow.Users.GetAllAsync();
            var lines = new List<PayrollEmployeeLineDto>();
            decimal total = 0;

            foreach (var u in users)
            {
                var roles = u.UserRoles?.Select(ur => ur.Role?.RoleName).Where(r => r != null).ToList() ?? new List<string?>();
                if (!roles.Any(r => r == "Employee" || r == "Manager"))
                    continue;

                var line = await BuildLineAsync(u.UserId, null);
                lines.Add(line);
                total += line.EstimatedCost;
            }

            return new PayrollSummaryDto
            {
                TotalEstimatedLaborCost = total,
                Employees = lines.OrderByDescending(l => l.EstimatedCost).ToList(),
            };
        }

        private async Task<PayrollEmployeeLineDto> BuildLineAsync(Guid userId, Guid? projectId)
        {
            var u = await _uow.Users.GetByIdAsync(userId);
            var profile = await _uow.UserProfiles.GetByUserIdAsync(userId);
            decimal clocked = 0m;
            decimal hours;
            decimal estimatedFallback = 0m;
            if (projectId.HasValue)
            {
                clocked = (await _uow.TimeEntries.GetByProjectAsync(projectId.Value))
                    .Where(t => t.UserId == userId)
                    .Sum(t => t.Hours);
                if (clocked <= 0)
                {
                    var projectTasks = await _uow.Tasks.GetByProjectIdAsync(projectId.Value);
                    estimatedFallback = projectTasks
                        .Where(t => t.AssignedEmployeeId == userId)
                        .Sum(t => t.EstimatedHours ?? 0m);
                }
            }
            else
            {
                clocked = await _uow.TimeEntries.SumHoursByUserAsync(userId);
                if (clocked <= 0)
                {
                    var tasks = await _uow.Tasks.GetByEmployeeIdAsync(userId);
                    estimatedFallback = tasks.Sum(t => t.EstimatedHours ?? 0m);
                }
            }

            var usesClocked = clocked > 0;
            if (!usesClocked)
                hours = estimatedFallback;
            else
                hours = clocked;

            var rate = profile?.HourlyRate ?? 25m;
            var monthly = profile?.MonthlySalary;
            var cost = monthly.HasValue && monthly > 0 && hours == 0
                ? monthly.Value
                : hours * rate;

            return new PayrollEmployeeLineDto
            {
                UserId = userId,
                FullName = u?.FullName ?? "Unknown",
                HourlyRate = rate,
                MonthlySalary = monthly,
                LoggedHours = hours,
                ClockedHours = clocked,
                EstimatedHoursFallback = estimatedFallback,
                HoursSource = usesClocked ? "Clocked" : "Estimated",
                EstimatedCost = cost,
                EmployeeLevel = profile?.EmployeeLevel ?? "Junior",
            };
        }
    }
}
