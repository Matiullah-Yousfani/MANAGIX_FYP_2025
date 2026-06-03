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

        public static async Task<string?> GetActiveAssignmentBlockReasonAsync(
            IUnitOfWork uow,
            Guid employeeId,
            Guid? forTeamId = null)
        {
            var active = await uow.TeamEmployees.GetActiveAssignmentAsync(employeeId);
            if (active == null) return null;
            if (forTeamId.HasValue && active.TeamId == forTeamId.Value) return null;
            return "Employee is already on an active project team and cannot join another until that project is closed.";
        }

        public static async Task ActivateTeamForProjectAsync(IUnitOfWork uow, Guid teamId, Guid projectId)
        {
            var members = await uow.TeamEmployees.GetEmployeesByTeamIdAsync(teamId);
            foreach (var te in members)
            {
                te.ProjectId = projectId;
                te.IsActive = true;
                uow.TeamEmployees.Update(te);
            }
        }

        public static async Task ReleaseTeamFromProjectAsync(IUnitOfWork uow, Guid projectId)
        {
            var pt = await uow.ProjectTeams.GetByProjectIdAsync(projectId);
            if (pt == null) return;

            var members = await uow.TeamEmployees.GetEmployeesByTeamIdAsync(pt.TeamId);
            foreach (var te in members)
            {
                te.ProjectId = null;
                te.IsActive = false;
                uow.TeamEmployees.Update(te);
            }

            uow.ProjectTeams.Remove(pt);
        }
    }
}
