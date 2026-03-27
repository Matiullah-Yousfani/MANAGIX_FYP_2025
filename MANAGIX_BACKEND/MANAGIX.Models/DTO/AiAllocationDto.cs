using System;
using System.Collections.Generic;

namespace MANAGIX.Models.DTO
{
    // Shared DTOs
    public class EmployeeInfoDto
    {
        public Guid UserId { get; set; }
        public string Name { get; set; } = string.Empty;
        public List<string> Skills { get; set; } = new();
        public List<ExperienceInfoDto> Experience { get; set; } = new();
        public int ActiveTasks { get; set; }
    }

    public class ExperienceInfoDto
    {
        public string? Title { get; set; }
        public string? Company { get; set; }
        public string? Duration { get; set; }
    }

    // Feature 1: Suggest Team
    public class SuggestTeamRequestDto
    {
        public Guid ProjectId { get; set; }
    }

    public class TeamSuggestionDto
    {
        public string UserId { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string Reason { get; set; } = string.Empty;
    }

    public class SuggestTeamResponseDto
    {
        public List<TeamSuggestionDto> Team { get; set; } = new();
    }

    // Feature 2: Suggest Employees
    public class SuggestEmployeesRequestDto
    {
        public string ProjectDescription { get; set; } = string.Empty;
    }

    public class EmployeeRecommendationDto
    {
        public string UserId { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public int MatchScore { get; set; }
        public string Reason { get; set; } = string.Empty;
    }

    public class SuggestEmployeesResponseDto
    {
        public List<EmployeeRecommendationDto> RecommendedEmployees { get; set; } = new();
    }

    // Feature 3: Suggest Task Allocation
    public class SuggestTaskAllocationRequestDto
    {
        public Guid ProjectId { get; set; }
    }

    public class TaskAssignmentDto
    {
        public string TaskId { get; set; } = string.Empty;
        public string UserId { get; set; } = string.Empty;
        public string TaskTitle { get; set; } = string.Empty;
        public string EmployeeName { get; set; } = string.Empty;
        public string Reason { get; set; } = string.Empty;
        public int Confidence { get; set; }
    }

    public class SuggestTaskAllocationResponseDto
    {
        public List<TaskAssignmentDto> TaskAssignments { get; set; } = new();
    }
}
