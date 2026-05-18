using MANAGIX.Models.DTO;
using System;
using System.Threading.Tasks;

namespace MANAGIX.Services
{
    public interface IAiAllocationService
    {
        Task<SuggestTeamResponseDto> SuggestBestTeamAsync(Guid projectId);

        // PHASE 1: New `includeAlreadyAssigned` flag (default false) — exclude employees on other active projects.
        Task<SuggestEmployeesResponseDto> SuggestEmployeesAsync(string projectDescription, Guid? projectId = null, bool includeAlreadyAssigned = false);

        Task<SuggestTaskAllocationResponseDto> SuggestTaskAllocationAsync(Guid projectId);
    }
}
