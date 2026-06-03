using MANAGIX.DataAccess.Repositories.IRepositories;
using MANAGIX.Models.DTO;
using MANAGIX.Utility;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace MANAGIX.Services
{
    public class WorkloadService : IWorkloadService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IManagerScopeService _scope;

        public WorkloadService(IUnitOfWork unitOfWork, IManagerScopeService scope)
        {
            _unitOfWork = unitOfWork;
            _scope = scope;
        }

        private static bool IsActiveTask(string? status)
        {
            var n = TaskWorkflow.Normalize(status);
            return n == TaskWorkflow.Todo || n == TaskWorkflow.InProgress;
        }

        public async Task<WorkloadEntryDto> GetEmployeeLoadAsync(Guid userId, Guid? projectId = null)
        {
            var user = await _unitOfWork.Users.GetByIdAsync(userId);
            var profile = await _unitOfWork.UserProfiles.GetByUserIdAsync(userId);
            var tasks = await _unitOfWork.Tasks.GetByEmployeeIdAsync(userId);

            if (projectId.HasValue && projectId.Value != Guid.Empty)
                tasks = tasks.Where(t => t.ProjectId == projectId.Value).ToList();

            var active = tasks.Where(t => IsActiveTask(t.Status)).ToList();
            var totalHours = active.Sum(t => t.EstimatedHours ?? 4m);
            var capacity = profile?.WeeklyCapacityHours ?? 40m;
            var distinctProjects = active.Select(t => t.ProjectId).Distinct().Count();

            var weekStart = DateTime.UtcNow.Date.AddDays(-(int)DateTime.UtcNow.DayOfWeek);
            var clockedWeek = await _unitOfWork.TimeEntries.SumHoursByUserAsync(userId, weekStart);
            var usesClocked = clockedWeek > 0m;
            var utilizationBase = usesClocked ? clockedWeek : totalHours;

            return new WorkloadEntryDto
            {
                UserId = userId,
                FullName = user?.FullName ?? "(unknown)",
                ActiveTaskCount = active.Count,
                TotalEstimatedHours = totalHours,
                CapacityHours = capacity,
                UtilizationPct = capacity > 0m ? (double)(utilizationBase / capacity) : 0,
                ProjectsAssigned = distinctProjects,
                ClockedHoursThisWeek = clockedWeek,
                UsesClockedHours = usesClocked,
            };
        }

        public async Task<ProjectWorkloadDto> GetProjectWorkloadAsync(Guid projectId)
        {
            var dto = new ProjectWorkloadDto { ProjectId = projectId };

            var projectTeam = await _unitOfWork.ProjectTeams.GetByProjectIdAsync(projectId);
            if (projectTeam == null) return dto;

            var teamEmployees = await _unitOfWork.TeamEmployees.GetEmployeesByTeamIdAsync(projectTeam.TeamId);
            foreach (var te in teamEmployees)
            {
                var entry = await GetEmployeeLoadAsync(te.EmployeeId, projectId);
                dto.Members.Add(entry);
            }

            dto.TotalProjectHours = dto.Members.Sum(m => m.TotalEstimatedHours);
            dto.TotalProjectCapacity = dto.Members.Sum(m => m.CapacityHours);
            dto.ProjectUtilizationPct = dto.TotalProjectCapacity > 0m
                ? (double)(dto.TotalProjectHours / dto.TotalProjectCapacity)
                : 0;

            return dto;
        }

        public async Task<List<WorkloadEntryDto>> GetTeamWorkloadAsync(Guid? managerId)
        {
            IEnumerable<Guid> ids;
            if (managerId.HasValue && managerId.Value != Guid.Empty)
            {
                ids = await _scope.GetScopedMemberIdsAsync(managerId.Value);
            }
            else
            {
                ids = await _unitOfWork.Users.GetUserIdsByRoleNameAsync("Employee");
            }

            var entries = new List<WorkloadEntryDto>();
            foreach (var id in ids.OrderBy(x => x))
                entries.Add(await GetEmployeeLoadAsync(id));

            return entries.OrderByDescending(e => e.UtilizationPct).ToList();
        }

        public async Task<List<WorkloadEntryDto>> GetOverloadedEmployeesAsync(double threshold = 0.9, Guid? managerId = null)
        {
            var all = await GetTeamWorkloadAsync(managerId);
            if (threshold <= 0)
                return all;

            return all
                .Where(e => e.UtilizationPct >= threshold)
                .OrderByDescending(e => e.UtilizationPct)
                .ToList();
        }
    }
}
