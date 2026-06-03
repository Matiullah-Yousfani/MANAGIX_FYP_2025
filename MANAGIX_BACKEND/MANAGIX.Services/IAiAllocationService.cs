using MANAGIX.Models.DTO;
using System;
using System.Threading.Tasks;

namespace MANAGIX.Services
{
    public interface IAiAllocationService
    {
        Task<SuggestTeamResponseDto> SuggestBestTeamAsync(Guid projectId);
        Task<SuggestTeamOptionsResponseDto> SuggestTeamOptionsAsync(Guid projectId);

        // PHASE 1: New `includeAlreadyAssigned` flag (default false) — exclude employees on other active projects.
        Task<SuggestEmployeesResponseDto> SuggestEmployeesAsync(string projectDescription, Guid? projectId = null, bool includeAlreadyAssigned = false);

        Task<SuggestTaskAllocationResponseDto> SuggestTaskAllocationAsync(Guid projectId, Guid? singleTaskId = null);

        Task<ApplyTaskAssignmentsResultDto> ApplyTaskAssignmentsAsync(Guid projectId, List<TaskAssignmentDto> assignments);

        Task<string?> ResolveProjectDescriptionAsync(Guid projectId);

        /// <summary>Active projects with a team and at least one unassigned open task.</summary>
        Task<List<TaskAllocationProjectDto>> GetTaskAllocationProjectsAsync(Guid? managerId);
    }
}
