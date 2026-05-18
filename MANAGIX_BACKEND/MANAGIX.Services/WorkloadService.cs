using MANAGIX.DataAccess.Repositories.IRepositories;
using MANAGIX.Models.DTO;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace MANAGIX.Services
{
    // PHASE 3: Workload math implementation.
    //
    // Definitions (kept consistent with AiAllocationService scoring):
    //   • Active task     = Status != "Done"
    //   • Total hours     = Σ Task.EstimatedHours (null treated as 0)
    //   • Capacity        = UserProfile.WeeklyCapacityHours (default 40)
    //   • Utilization     = TotalHours / CapacityHours (1.0 = at-capacity)
    public class WorkloadService : IWorkloadService
    {
        private readonly IUnitOfWork _unitOfWork;

        public WorkloadService(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        public async Task<WorkloadEntryDto> GetEmployeeLoadAsync(Guid userId)
        {
            var user = await _unitOfWork.Users.GetByIdAsync(userId);
            var profile = await _unitOfWork.UserProfiles.GetByUserIdAsync(userId);
            var tasks = await _unitOfWork.Tasks.GetByEmployeeIdAsync(userId);

            var active = tasks.Where(t => t.Status != "Done").ToList();
            var totalHours = active.Sum(t => t.EstimatedHours ?? 0m);
            var capacity = profile?.WeeklyCapacityHours ?? 40m;
            var distinctProjects = active.Select(t => t.ProjectId).Distinct().Count();

            return new WorkloadEntryDto
            {
                UserId = userId,
                FullName = user?.FullName ?? "(unknown)",
                ActiveTaskCount = active.Count,
                TotalEstimatedHours = totalHours,
                CapacityHours = capacity,
                UtilizationPct = capacity > 0m ? (double)(totalHours / capacity) : 0,
                ProjectsAssigned = distinctProjects,
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
                var entry = await GetEmployeeLoadAsync(te.EmployeeId);
                dto.Members.Add(entry);
            }

            dto.TotalProjectHours = dto.Members.Sum(m => m.TotalEstimatedHours);
            dto.TotalProjectCapacity = dto.Members.Sum(m => m.CapacityHours);
            dto.ProjectUtilizationPct = dto.TotalProjectCapacity > 0m
                ? (double)(dto.TotalProjectHours / dto.TotalProjectCapacity)
                : 0;

            return dto;
        }

        public async Task<List<WorkloadEntryDto>> GetOverloadedEmployeesAsync(double threshold = 0.9)
        {
            var users = await _unitOfWork.Users.GetAllAsync();
            var entries = new List<WorkloadEntryDto>();
            foreach (var u in users)
            {
                var entry = await GetEmployeeLoadAsync(u.UserId);
                if (entry.UtilizationPct >= threshold)
                    entries.Add(entry);
            }
            return entries
                .OrderByDescending(e => e.UtilizationPct)
                .ToList();
        }
    }
}
