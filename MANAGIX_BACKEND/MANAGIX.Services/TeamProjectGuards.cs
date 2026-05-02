using MANAGIX.DataAccess.Repositories.IRepositories;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace MANAGIX.Services
{
    public static class TeamProjectGuards
    {
        /// <summary>
        /// True if the project's assigned team contains this employee.
        /// </summary>
        public static async Task<bool> EmployeeBelongsToProjectTeamAsync(
            IUnitOfWork uow,
            Guid employeeId,
            Guid projectId)
        {
            var pt = await uow.ProjectTeams.GetByProjectIdAsync(projectId);
            if (pt == null)
                return false;

            var members = await uow.TeamEmployees.GetEmployeesByTeamIdAsync(pt.TeamId);
            return members.Any(m => m.EmployeeId == employeeId);
        }
    }
}
