using MANAGIX.DataAccess.Repositories.IRepositories;
using MANAGIX.Utility;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace MANAGIX.Services
{
    public static class TeamCompositionValidator
    {
        public static async Task<(bool Ok, string? Message)> ValidateEmployeeAndQaAsync(IUnitOfWork uow, Guid teamId)
        {
            var members = await uow.TeamEmployees.GetEmployeesByTeamIdAsync(teamId);
            if (members.Count == 0)
                return (false, "Team must include at least one Employee and one QA.");

            var employeeIds = (await uow.Users.GetUserIdsByRoleNameAsync("Employee")).ToHashSet();
            var qaIds = (await uow.Users.GetUserIdsByRoleNameAsync(AppRoles.QualityAssurance)).ToHashSet();
            var excluded = (await uow.Users.GetUserIdsByRoleNameAsync("Manager"))
                .Concat(await uow.Users.GetUserIdsByRoleNameAsync("Admin"))
                .ToHashSet();

            var hasEmployee = members.Any(m =>
                employeeIds.Contains(m.EmployeeId) && !excluded.Contains(m.EmployeeId));
            var hasQa = members.Any(m =>
                qaIds.Contains(m.EmployeeId) && !excluded.Contains(m.EmployeeId));

            if (!hasEmployee || !hasQa)
                return (false, "Team must include at least one Employee and one QA before it can be used on a project.");

            return (true, null);
        }
    }
}
