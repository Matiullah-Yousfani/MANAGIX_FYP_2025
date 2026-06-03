using MANAGIX.DataAccess.Repositories.IRepositories;
using MANAGIX.Models.DTO;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace MANAGIX.Services
{
    public interface IManagerScopeService
    {
        Task<HashSet<Guid>> GetScopedMemberIdsAsync(Guid managerId);
        Task<bool> ManagerOwnsProjectAsync(Guid managerId, Guid projectId);
        Task<bool> IsMemberInManagerScopeAsync(Guid managerId, Guid memberUserId);
        Task<List<ManagerTeamMemberDto>> GetScopedTeamMembersAsync(Guid managerId);
    }

    /// <summary>
    /// Employees (and QA) on teams linked to projects owned by the manager (Project.CreatedBy).
    /// </summary>
    public class ManagerScopeService : IManagerScopeService
    {
        private readonly IUnitOfWork _uow;

        public ManagerScopeService(IUnitOfWork uow) => _uow = uow;

        public async Task<HashSet<Guid>> GetScopedMemberIdsAsync(Guid managerId)
        {
            var members = await GetScopedTeamMembersAsync(managerId);
            return members.Select(m => m.UserId).ToHashSet();
        }

        public async Task<bool> ManagerOwnsProjectAsync(Guid managerId, Guid projectId)
        {
            var project = await _uow.Projects.GetByIdAsync(projectId);
            return project != null && project.CreatedBy == managerId;
        }

        public async Task<bool> IsMemberInManagerScopeAsync(Guid managerId, Guid memberUserId)
        {
            var scoped = await GetScopedMemberIdsAsync(managerId);
            return scoped.Contains(memberUserId);
        }

        public async Task<List<ManagerTeamMemberDto>> GetScopedTeamMembersAsync(Guid managerId)
        {
            var projects = await _uow.Projects.GetByManagerIdAsync(managerId);
            if (projects.Count == 0)
                return new List<ManagerTeamMemberDto>();

            var memberIds = new HashSet<Guid>();
            foreach (var p in projects)
            {
                var pt = await _uow.ProjectTeams.GetByProjectIdAsync(p.ProjectId);
                if (pt == null) continue;

                var teamEmployees = await _uow.TeamEmployees.GetEmployeesByTeamIdAsync(pt.TeamId);
                foreach (var te in teamEmployees)
                    memberIds.Add(te.EmployeeId);
            }

            var result = new List<ManagerTeamMemberDto>();
            foreach (var id in memberIds.OrderBy(x => x))
            {
                var user = await _uow.Users.GetByIdAsync(id);
                if (user != null)
                {
                    result.Add(new ManagerTeamMemberDto
                    {
                        UserId = id,
                        FullName = user.FullName,
                    });
                }
            }

            return result;
        }
    }
}
