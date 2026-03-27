using MANAGIX.Models.DTO;
using System;
using System.Threading.Tasks;

namespace MANAGIX.Services
{
    public interface IAiAllocationService
    {
        Task<SuggestTeamResponseDto> SuggestBestTeamAsync(Guid projectId);
        Task<SuggestEmployeesResponseDto> SuggestEmployeesAsync(string projectDescription);
        Task<SuggestTaskAllocationResponseDto> SuggestTaskAllocationAsync(Guid projectId);
    }
}
