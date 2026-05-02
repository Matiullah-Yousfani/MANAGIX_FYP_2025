using System;
using System.Collections.Generic;

namespace MANAGIX.Models.DTO
{
    public class AiPlannerTaskItemDto
    {
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
    }

    public class AiPlannerMilestoneItemDto
    {
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public int DeadlineOffsetDays { get; set; }
        public double BudgetPercentage { get; set; }
        public List<AiPlannerTaskItemDto> Tasks { get; set; } = new();
    }

    /// <summary>Incoming request from the SPA; methodology options are filled by the API from DB.</summary>
    public class AiProjectPlanRequestDto
    {
        public string ProjectName { get; set; } = string.Empty;
        public string ProjectDescription { get; set; } = string.Empty;
        public string Deadline { get; set; } = string.Empty;
        public double Budget { get; set; }
    }

    public class AiProjectPlanResponseDto
    {
        public string? SuggestedMethodology { get; set; }
        public string? MethodologyRationale { get; set; }
        /// <summary>Matched project methodology row in the database when the suggested name lines up.</summary>
        public Guid? SuggestedModelId { get; set; }
        public List<AiPlannerMilestoneItemDto> Milestones { get; set; } = new();
    }
}
