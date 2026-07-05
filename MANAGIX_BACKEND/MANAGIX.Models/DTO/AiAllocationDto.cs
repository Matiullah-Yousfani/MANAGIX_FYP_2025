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

        // PHASE 1: workload signals sent to the LLM AND used by the deterministic post-pass.
        public decimal CurrentLoadHours { get; set; }
        public decimal WeeklyCapacityHours { get; set; } = 40m;
        public double RecentApprovalRate { get; set; } = 0.5;
        public string EmployeeLevel { get; set; } = "Junior";
        public decimal? HourlyRate { get; set; }
        public int CompletedProjectsCount { get; set; }
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
        public int ConfidenceScore { get; set; }
        public List<string> MatchingSkills { get; set; } = new();
        public int ActiveTasks { get; set; }
        public decimal CurrentLoadHours { get; set; }
        public string? ExperienceSummary { get; set; }
        /// <summary>False when QA workload exceeds threshold.</summary>
        public bool IsRecommendedForRole { get; set; } = true;
    }

    public class SuggestTeamResponseDto
    {
        public List<TeamSuggestionDto> Team { get; set; } = new();
    }

    public class TeamPoolMemberDto
    {
        public string UserId { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public List<string> Skills { get; set; } = new();
    }

    public class TeamOptionDto
    {
        public string Label { get; set; } = string.Empty;
        public string SuggestedTeamName { get; set; } = string.Empty;
        public List<TeamSuggestionDto> Team { get; set; } = new();
        /// <summary>True for the option best suited to this project (shown in UI).</summary>
        public bool IsRecommended { get; set; }
        /// <summary>Deterministic fit score for this lineup (higher = better).</summary>
        public double FitScore { get; set; }
    }

    public class SuggestTeamOptionsResponseDto
    {
        public List<TeamOptionDto> Options { get; set; } = new();
        /// <summary>Suggested developer count (always plus exactly 1 QA).</summary>
        public int SuggestedDeveloperCount { get; set; }
        public List<TeamPoolMemberDto> AvailableQa { get; set; } = new();
        public List<TeamPoolMemberDto> AvailableEmployees { get; set; } = new();
        /// <summary>Why fewer than 3 options or pool constraints (unassigned-only).</summary>
        public string? AvailabilityMessage { get; set; }
    }

    // Feature 2: Suggest Employees
    public class SuggestEmployeesRequestDto
    {
        public string ProjectDescription { get; set; } = string.Empty;
        /// <summary>When set, only members of the team assigned to this project are considered.</summary>
        public Guid? ProjectId { get; set; }

        // PHASE 1: When false (default), employees already on a different active project are filtered out.
        // The manager can set this to true (with confirmation) for the rare cross-staffing case.
        public bool IncludeAlreadyAssigned { get; set; } = false;
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
        /// <summary>When set (e.g. Kanban per-task), suggest for this task even if it already has an assignee.</summary>
        public Guid? TaskId { get; set; }
    }

    public class TaskAssignmentDto
    {
        public string TaskId { get; set; } = string.Empty;
        public string UserId { get; set; } = string.Empty;
        public string TaskTitle { get; set; } = string.Empty;
        public string EmployeeName { get; set; } = string.Empty;
        public string Reason { get; set; } = string.Empty;
        public int Confidence { get; set; }

        // PHASE 1: when the deterministic post-pass overrides the LLM, we surface the score breakdown
        // so the manager can see *why* this person was chosen. Omitted when LLM was kept as-is.
        public double? ScoreSkill { get; set; }
        public double? ScoreCapacity { get; set; }
        public double? ScoreApproval { get; set; }
        public double? ScoreTotal { get; set; }
        public bool OverrodeLlm { get; set; }
        public DateTime? TaskDeadline { get; set; }
        public string? SuggestedDueDate { get; set; }
    }

    public class SuggestTaskAllocationResponseDto
    {
        public List<TaskAssignmentDto> TaskAssignments { get; set; } = new();
    }

    public class ApplyTaskAssignmentsRequestDto
    {
        public Guid ProjectId { get; set; }
        public List<TaskAssignmentDto> TaskAssignments { get; set; } = new();
    }

    public class ApplyTaskAssignmentsResultDto
    {
        public int Applied { get; set; }
        public int Failed { get; set; }
        public List<string> Errors { get; set; } = new();
    }
}
