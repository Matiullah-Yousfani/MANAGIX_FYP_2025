using MANAGIX.Models.DTO;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace MANAGIX.Services
{
    public interface IAiProjectPlannerService
    {
        Task<AiProjectPlanResponseDto> GeneratePlanAsync(
            AiProjectPlanRequestDto request,
            IReadOnlyList<string> methodologyNames);
    }
}
