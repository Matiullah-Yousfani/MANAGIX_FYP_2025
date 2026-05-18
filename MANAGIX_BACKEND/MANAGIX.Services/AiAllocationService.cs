using MANAGIX.DataAccess.Repositories.IRepositories;
using MANAGIX.Models.DTO;
using MANAGIX.Models.Models;
using MANAGIX.Services.Helpers;
using Microsoft.Extensions.Configuration;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace MANAGIX.Services
{
    // ─────────────────────────────────────────────────────────────────────────────
    // PHASE 1 REWRITE NOTES (read this first)
    //
    // What the user reported as broken:
    //   • Same employee suggested for multiple projects.
    //   • AI not assigning tasks to employees properly (silent fallbacks, no skill awareness).
    //   • Employee can sit on multiple active projects (DB-side; fixed by Phase 0 + filter here).
    //
    // Fixes in this file:
    //   1) GetAllEmployeesInfoAsync now also enriches CurrentLoadHours, WeeklyCapacityHours,
    //      RecentApprovalRate so the LLM AND the post-pass scoring have proper signals.
    //   2) SuggestEmployeesAsync filters out employees already on a *different* active project
    //      unless the manager explicitly opts in (`includeAlreadyAssigned`).
    //   3) SuggestTaskAllocationAsync runs a deterministic post-pass via AllocationScoring:
    //        – If LLM returned an out-of-team UUID OR confidence < 60, the score wins.
    //        – After all assignments, members projected over 120% utilisation get rebalanced:
    //          their lowest-priority extra task moves to the next best ranked member.
    //        – The DTO now exposes the score breakdown so the manager understands the choice.
    //   4) The old "fallback to teamMembers[0]" branch is gone — it caused non-deterministic
    //      assignments and masked bad LLM output.
    // ─────────────────────────────────────────────────────────────────────────────
    public class AiAllocationService : IAiAllocationService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly HttpClient _httpClient;
        private readonly string _aiServiceUrl;

        private static readonly JsonSerializerOptions _jsonOptions = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            PropertyNameCaseInsensitive = true
        };

        public AiAllocationService(IUnitOfWork unitOfWork, IConfiguration configuration)
        {
            _unitOfWork = unitOfWork;
            // Use 127.0.0.1 by default: on Windows, "localhost" may resolve to ::1 while Python binds IPv4 only.
            _aiServiceUrl = (configuration["AiAllocationUrl"] ?? "http://127.0.0.1:8002").TrimEnd('/');
            _httpClient = new HttpClient
            {
                Timeout = TimeSpan.FromMinutes(2)
            };
        }

        // ────────────────────────────────────────────────────────────────────
        // PHASE 1: Enriched employee dossier sent to the LLM.
        // Adds CurrentLoadHours / WeeklyCapacityHours / RecentApprovalRate.
        // ────────────────────────────────────────────────────────────────────
        private async Task<EmployeeInfoDto> GetEmployeeInfoAsync(Guid userId, string name)
        {
            var skills = await _unitOfWork.ResumeSkills.GetByUserIdAsync(userId);
            var experiences = await _unitOfWork.ResumeExperiences.GetByUserIdAsync(userId);
            var tasks = await _unitOfWork.Tasks.GetByEmployeeIdAsync(userId);
            var profile = await _unitOfWork.UserProfiles.GetByUserIdAsync(userId);

            // Sum the estimated hours of active tasks (Status != "Done"). Null hours treated as 0.
            decimal currentLoadHours = tasks
                .Where(t => t.Status != "Done")
                .Sum(t => t.EstimatedHours ?? 0m);

            // Capacity defaults to 40h/week — UserProfile fallback when missing.
            decimal capacity = profile?.WeeklyCapacityHours ?? 40m;

            double approvalRate = await _unitOfWork.EmployeePerformances.GetAverageApprovalRateAsync(userId);

            return new EmployeeInfoDto
            {
                UserId = userId,
                Name = name,
                Skills = skills.Select(s => s.SkillName).ToList(),
                Experience = experiences.Select(e => new ExperienceInfoDto
                {
                    Title = e.Title,
                    Company = e.Company,
                    Duration = e.Duration
                }).ToList(),
                ActiveTasks = tasks.Count(t => t.Status == "Todo" || t.Status == "InProgress"),
                CurrentLoadHours = currentLoadHours,
                WeeklyCapacityHours = capacity,
                RecentApprovalRate = approvalRate
            };
        }

        private async Task<List<EmployeeInfoDto>> GetAllEmployeesInfoAsync()
        {
            var users = await _unitOfWork.Users.GetAllAsync();
            var employeeList = new List<EmployeeInfoDto>();

            foreach (var user in users)
            {
                var info = await GetEmployeeInfoAsync(user.UserId, user.FullName);
                employeeList.Add(info);
            }

            return employeeList;
        }

        /// <summary>Users on the team linked to this project (for scoped AI suggestions).</summary>
        private async Task<List<EmployeeInfoDto>> GetProjectTeamEmployeesInfoAsync(Guid projectId)
        {
            var projectTeam = await _unitOfWork.ProjectTeams.GetByProjectIdAsync(projectId);
            if (projectTeam == null)
                return new List<EmployeeInfoDto>();

            var teamEmployees = await _unitOfWork.TeamEmployees.GetEmployeesByTeamIdAsync(projectTeam.TeamId);
            var list = new List<EmployeeInfoDto>();
            foreach (var te in teamEmployees)
            {
                var user = await _unitOfWork.Users.GetByIdAsync(te.EmployeeId);
                if (user != null)
                    list.Add(await GetEmployeeInfoAsync(user.UserId, user.FullName));
            }

            return list;
        }

        // ── Feature 1: Suggest Best Team ──
        public async Task<SuggestTeamResponseDto> SuggestBestTeamAsync(Guid projectId)
        {
            var project = await _unitOfWork.Projects.GetByIdAsync(projectId);
            if (project == null)
                throw new Exception($"Project with ID {projectId} not found.");

            // PHASE 1: Pool is everyone NOT already on another active project. Single-active rule
            // means a project can only recruit free employees + its own current members.
            var allEmployees = await GetAllEmployeesInfoAsync();
            var busy = await _unitOfWork.TeamEmployees.GetActivelyAssignedEmployeeIdsAsync(projectId);
            var employees = allEmployees.Where(e => !busy.Contains(e.UserId)).ToList();

            var payload = new
            {
                project = new
                {
                    projectId = project.ProjectId.ToString(),
                    title = project.Title,
                    description = project.Description ?? string.Empty
                },
                employees = employees
            };

            var json = JsonSerializer.Serialize(payload, _jsonOptions);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            try
            {
                var response = await _httpClient.PostAsync($"{_aiServiceUrl}/suggest-team", content);
                response.EnsureSuccessStatusCode();

                var responseBody = await response.Content.ReadAsStringAsync();
                var result = JsonSerializer.Deserialize<SuggestTeamResponseDto>(responseBody, _jsonOptions);

                if (result?.Team != null)
                {
                    var employeeLookup = employees.ToDictionary(e => e.UserId.ToString(), e => e.Name);
                    var empByName = employees.ToDictionary(e => e.Name.ToLower(), e => e.UserId.ToString());
                    foreach (var member in result.Team)
                    {
                        // Fix userId if LLM returned non-UUID
                        if (!Guid.TryParse(member.UserId, out _))
                        {
                            var numStr = new string(member.UserId.Where(char.IsDigit).ToArray());
                            if (int.TryParse(numStr, out int idx) && idx >= 1 && idx <= employees.Count)
                                member.UserId = employees[idx - 1].UserId.ToString();
                            else if (empByName.TryGetValue(member.UserId.ToLower(), out var realId))
                                member.UserId = realId;
                        }

                        if (employeeLookup.TryGetValue(member.UserId, out var name))
                            member.Name = name;
                    }

                    // PHASE 1: Hard constraint — drop any LLM result outside the eligible pool.
                    var allowed = new HashSet<string>(
                        employees.Select(e => e.UserId.ToString()),
                        StringComparer.OrdinalIgnoreCase);
                    result.Team = result.Team
                        .Where(t => !string.IsNullOrWhiteSpace(t.UserId) && allowed.Contains(t.UserId))
                        .ToList();
                }

                return result ?? new SuggestTeamResponseDto();
            }
            catch (TaskCanceledException)
            {
                throw new TaskCanceledException("AI service request timed out. Please try again.");
            }
            catch (HttpRequestException ex)
            {
                throw new HttpRequestException($"Cannot connect to AI allocation service at {_aiServiceUrl}. Is it running? ({ex.Message})", ex);
            }
        }

        // ── Feature 2: Suggest Employees ──
        // PHASE 1: Adds cross-project filter when no projectId is given (company-wide search).
        public async Task<SuggestEmployeesResponseDto> SuggestEmployeesAsync(string projectDescription, Guid? projectId = null, bool includeAlreadyAssigned = false)
        {
            List<EmployeeInfoDto> employees;
            if (projectId.HasValue && projectId.Value != Guid.Empty)
            {
                // Scoped: only the project's existing team members. (No cross-project filter needed —
                // by definition they're already on this project.)
                employees = await GetProjectTeamEmployeesInfoAsync(projectId.Value);
                if (employees.Count == 0)
                    return new SuggestEmployeesResponseDto();
            }
            else
            {
                // Company-wide: filter out anyone busy on another active project (unless caller opted in).
                employees = await GetAllEmployeesInfoAsync();
                if (!includeAlreadyAssigned)
                {
                    var busyIds = await _unitOfWork.TeamEmployees.GetActivelyAssignedEmployeeIdsAsync(excludeProjectId: null);
                    employees = employees.Where(e => !busyIds.Contains(e.UserId)).ToList();
                    if (employees.Count == 0)
                        return new SuggestEmployeesResponseDto();
                }
            }

            var payload = new
            {
                projectDescription = projectDescription,
                employees = employees
            };

            var json = JsonSerializer.Serialize(payload, _jsonOptions);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            try
            {
                var response = await _httpClient.PostAsync($"{_aiServiceUrl}/suggest-employees", content);
                response.EnsureSuccessStatusCode();

                var responseBody = await response.Content.ReadAsStringAsync();
                var result = JsonSerializer.Deserialize<SuggestEmployeesResponseDto>(responseBody, _jsonOptions);

                if (result?.RecommendedEmployees != null)
                {
                    var employeeLookup = employees.ToDictionary(e => e.UserId.ToString(), e => e.Name);
                    var empByName = employees.ToDictionary(e => e.Name.ToLower(), e => e.UserId.ToString());
                    foreach (var rec in result.RecommendedEmployees)
                    {
                        // Fix userId if LLM returned non-UUID
                        if (!Guid.TryParse(rec.UserId, out _))
                        {
                            var numStr = new string(rec.UserId.Where(char.IsDigit).ToArray());
                            if (int.TryParse(numStr, out int idx) && idx >= 1 && idx <= employees.Count)
                                rec.UserId = employees[idx - 1].UserId.ToString();
                            else if (empByName.TryGetValue(rec.UserId.ToLower(), out var realId))
                                rec.UserId = realId;
                        }

                        if (employeeLookup.TryGetValue(rec.UserId, out var name))
                            rec.Name = name;
                    }

                    var allowed = new HashSet<string>(
                        employees.Select(e => e.UserId.ToString()),
                        StringComparer.OrdinalIgnoreCase);
                    result.RecommendedEmployees = result.RecommendedEmployees
                        .Where(r => !string.IsNullOrWhiteSpace(r.UserId) && allowed.Contains(r.UserId))
                        .ToList();
                }

                return result ?? new SuggestEmployeesResponseDto();
            }
            catch (TaskCanceledException)
            {
                throw new TaskCanceledException("AI service request timed out. Please try again.");
            }
            catch (HttpRequestException ex)
            {
                throw new HttpRequestException($"Cannot connect to AI allocation service at {_aiServiceUrl}. Is it running? ({ex.Message})", ex);
            }
        }

        // ── Feature 3: Suggest Task Allocation ──
        // PHASE 1: Deterministic post-pass (AllocationScoring) replaces the silent fallback.
        public async Task<SuggestTaskAllocationResponseDto> SuggestTaskAllocationAsync(Guid projectId)
        {
            var projectTeam = await _unitOfWork.ProjectTeams.GetByProjectIdAsync(projectId);
            if (projectTeam == null)
                return new SuggestTaskAllocationResponseDto();

            var teamEmployees = await _unitOfWork.TeamEmployees.GetEmployeesByTeamIdAsync(projectTeam.TeamId);
            var teamMembers = new List<EmployeeInfoDto>();

            foreach (var te in teamEmployees)
            {
                var user = await _unitOfWork.Users.GetByIdAsync(te.EmployeeId);
                if (user != null)
                {
                    var info = await GetEmployeeInfoAsync(user.UserId, user.FullName);
                    teamMembers.Add(info);
                }
            }

            if (teamMembers.Count == 0)
                return new SuggestTaskAllocationResponseDto();

            var allTasks = await _unitOfWork.Tasks.GetByProjectIdAsync(projectId);
            var pendingTasks = allTasks.Where(t => t.Status != "Done").ToList();

            if (pendingTasks.Count == 0)
                return new SuggestTaskAllocationResponseDto();

            // PHASE 1: Build the enriched payload — title/description plus skill tags + effort + priority.
            var taskDtos = pendingTasks.Select(t => new
            {
                taskId = t.TaskId.ToString(),
                title = t.Title,
                description = t.Description ?? string.Empty,
                status = t.Status,
                priority = t.Priority ?? "Medium",
                estimatedHours = t.EstimatedHours ?? 0m,
                requiredSkills = ParseSkills(t.RequiredSkillsJson)
            }).ToList();

            var payload = new
            {
                tasks = taskDtos,
                teamMembers = teamMembers
            };

            var json = JsonSerializer.Serialize(payload, _jsonOptions);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            SuggestTaskAllocationResponseDto? result;
            try
            {
                var response = await _httpClient.PostAsync($"{_aiServiceUrl}/suggest-task-allocation", content);
                response.EnsureSuccessStatusCode();

                var responseBody = await response.Content.ReadAsStringAsync();
                result = JsonSerializer.Deserialize<SuggestTaskAllocationResponseDto>(responseBody, _jsonOptions);
            }
            catch (TaskCanceledException)
            {
                throw new TaskCanceledException("AI service request timed out. Please try again.");
            }
            catch (HttpRequestException ex)
            {
                throw new HttpRequestException($"Cannot connect to AI allocation service at {_aiServiceUrl}. Is it running? ({ex.Message})", ex);
            }

            result ??= new SuggestTaskAllocationResponseDto();

            // ────────────────────────────────────────────────────────────────
            // PHASE 1: DETERMINISTIC POST-PASS
            // ────────────────────────────────────────────────────────────────
            ApplyDeterministicPostPass(result, pendingTasks, teamMembers);

            return result;
        }

        // ────────────────────────────────────────────────────────────────────
        // PHASE 1: Post-pass logic — extracted for testability and clarity.
        //
        // Steps:
        //   1) Resolve LLM userId quirks (numeric, name, etc.) into real Guids.
        //   2) For each task, compute the deterministic ranking via AllocationScoring.
        //   3) If LLM userId is invalid OR Confidence < 60 → use the top-ranked member.
        //      Mark the assignment with OverrodeLlm = true and embed score breakdown.
        //   4) Project the resulting per-member load. If anyone exceeds 120% capacity,
        //      pull their *lowest-priority* extra task and reassign it to the next best
        //      ranked member that's still under capacity.
        // ────────────────────────────────────────────────────────────────────
        private void ApplyDeterministicPostPass(
            SuggestTaskAllocationResponseDto result,
            List<TaskItem> pendingTasks,
            List<EmployeeInfoDto> teamMembers)
        {
            if (result.TaskAssignments == null) result.TaskAssignments = new List<TaskAssignmentDto>();

            var memberById = teamMembers.ToDictionary(m => m.UserId);
            var memberByIdString = teamMembers.ToDictionary(m => m.UserId.ToString(), m => m);
            var memberByName = teamMembers
                .GroupBy(m => m.Name.ToLowerInvariant())
                .ToDictionary(g => g.Key, g => g.First());
            var allowedIds = teamMembers.Select(m => m.UserId).ToHashSet();
            var taskById = pendingTasks.ToDictionary(t => t.TaskId.ToString(), t => t);

            // Lookup tables for AllocationScoring.
            var capacityByMember = teamMembers.ToDictionary(m => m.UserId, m => m.WeeklyCapacityHours);
            var approvalByMember = teamMembers.ToDictionary(m => m.UserId, m => m.RecentApprovalRate);

            // currentHoursByMember starts from the member's existing load and accumulates as we assign.
            var currentHoursByMember = teamMembers.ToDictionary(m => m.UserId, m => m.CurrentLoadHours);

            // Make sure every pending task has an assignment row — fill gaps.
            var assignmentByTaskId = result.TaskAssignments.ToDictionary(a => a.TaskId, a => a);
            foreach (var task in pendingTasks)
            {
                if (!assignmentByTaskId.ContainsKey(task.TaskId.ToString()))
                {
                    var fresh = new TaskAssignmentDto
                    {
                        TaskId = task.TaskId.ToString(),
                        TaskTitle = task.Title,
                        UserId = string.Empty,
                        Confidence = 0
                    };
                    result.TaskAssignments.Add(fresh);
                    assignmentByTaskId[task.TaskId.ToString()] = fresh;
                }
            }

            // Pass 1: resolve / score each assignment.
            foreach (var assignment in result.TaskAssignments)
            {
                if (!taskById.TryGetValue(assignment.TaskId, out var task)) continue;

                var requiredSkills = ParseSkills(task.RequiredSkillsJson);

                // Try to interpret what the LLM said.
                Guid? llmUserId = null;
                if (Guid.TryParse(assignment.UserId, out var parsed) && allowedIds.Contains(parsed))
                {
                    llmUserId = parsed;
                }
                else if (!string.IsNullOrWhiteSpace(assignment.UserId))
                {
                    // Numeric like "user1" → index lookup.
                    var digits = new string(assignment.UserId.Where(char.IsDigit).ToArray());
                    if (int.TryParse(digits, out int idx) && idx >= 1 && idx <= teamMembers.Count)
                        llmUserId = teamMembers[idx - 1].UserId;
                    // Or by name.
                    else if (memberByName.TryGetValue(assignment.UserId.Trim().ToLowerInvariant(), out var byName))
                        llmUserId = byName.UserId;
                }

                // Deterministic ranking — best member first.
                var ranked = AllocationScoring.RankMembers(
                    requiredSkills,
                    teamMembers,
                    currentHoursByMember,
                    capacityByMember,
                    approvalByMember);

                bool override_ = false;
                Guid finalUserId;
                double finalScore, finalSkill, finalCap, finalAppr;

                // LLM signal is trusted only if: in-team AND confidence ≥ 60.
                if (llmUserId.HasValue && assignment.Confidence >= 60)
                {
                    finalUserId = llmUserId.Value;
                    var entry = ranked.FirstOrDefault(r => r.Member.UserId == finalUserId);
                    finalScore = entry.Score;
                    finalSkill = entry.SkillScore;
                    finalCap = entry.CapacityScore;
                    finalAppr = entry.ApprovalScore;
                }
                else
                {
                    // Override with the deterministic top scorer.
                    var top = ranked.First();
                    finalUserId = top.Member.UserId;
                    finalScore = top.Score;
                    finalSkill = top.SkillScore;
                    finalCap = top.CapacityScore;
                    finalAppr = top.ApprovalScore;
                    override_ = true;
                }

                // Update the dto.
                var member = memberById[finalUserId];
                assignment.UserId = finalUserId.ToString();
                assignment.EmployeeName = member.Name;
                assignment.TaskTitle = task.Title;
                assignment.OverrodeLlm = override_;
                assignment.ScoreSkill = Math.Round(finalSkill, 3);
                assignment.ScoreCapacity = Math.Round(finalCap, 3);
                assignment.ScoreApproval = Math.Round(finalAppr, 3);
                assignment.ScoreTotal = Math.Round(finalScore, 3);

                if (override_)
                {
                    var note = " Overridden by deterministic skill/capacity scoring.";
                    assignment.Reason = string.IsNullOrWhiteSpace(assignment.Reason)
                        ? note.TrimStart()
                        : assignment.Reason + note;
                }

                // Project the additional load on the chosen member.
                currentHoursByMember[finalUserId] = currentHoursByMember[finalUserId] + (task.EstimatedHours ?? 0m);
            }

            // Pass 2: rebalance overloaded members.
            // Threshold = 1.20 * capacity. Any member above pulls their lowest-priority extra,
            // reassigning to the highest-scoring member still under their own threshold.
            for (int safety = 0; safety < teamMembers.Count * 2; safety++)
            {
                var overloaded = teamMembers
                    .FirstOrDefault(m => currentHoursByMember[m.UserId] > m.WeeklyCapacityHours * 1.20m);
                if (overloaded == null) break;

                // Find this member's worst-fit assignment (lowest priority + lowest score).
                int Rank(string? p) => p switch
                {
                    "Critical" => 4, "High" => 3, "Medium" => 2, "Low" => 1, _ => 2
                };
                var theirAssignments = result.TaskAssignments
                    .Where(a => a.UserId == overloaded.UserId.ToString())
                    .Join(pendingTasks, a => a.TaskId, t => t.TaskId.ToString(), (a, t) => (a, t))
                    .OrderBy(x => Rank(x.t.Priority))
                    .ThenBy(x => x.a.ScoreTotal ?? 0)
                    .ToList();

                if (theirAssignments.Count == 0) break; // can't fix; bail out.

                var (moveAssignment, moveTask) = theirAssignments.First();

                // Recompute ranking *for this task* with current load — pick best alternative.
                var altRanked = AllocationScoring.RankMembers(
                    ParseSkills(moveTask.RequiredSkillsJson),
                    teamMembers,
                    currentHoursByMember,
                    teamMembers.ToDictionary(m => m.UserId, m => m.WeeklyCapacityHours),
                    teamMembers.ToDictionary(m => m.UserId, m => m.RecentApprovalRate));

                var alt = altRanked.FirstOrDefault(r =>
                    r.Member.UserId != overloaded.UserId &&
                    currentHoursByMember[r.Member.UserId] + (moveTask.EstimatedHours ?? 0m)
                        <= r.Member.WeeklyCapacityHours * 1.20m);

                if (alt.Member == null) break; // no slack anywhere; stop trying.

                // Apply the move.
                currentHoursByMember[overloaded.UserId] -= (moveTask.EstimatedHours ?? 0m);
                currentHoursByMember[alt.Member.UserId] += (moveTask.EstimatedHours ?? 0m);

                moveAssignment.UserId = alt.Member.UserId.ToString();
                moveAssignment.EmployeeName = alt.Member.Name;
                moveAssignment.OverrodeLlm = true;
                moveAssignment.ScoreSkill = Math.Round(alt.SkillScore, 3);
                moveAssignment.ScoreCapacity = Math.Round(alt.CapacityScore, 3);
                moveAssignment.ScoreApproval = Math.Round(alt.ApprovalScore, 3);
                moveAssignment.ScoreTotal = Math.Round(alt.Score, 3);
                var rebalanceNote = " Rebalanced to keep workload under 120%.";
                moveAssignment.Reason = string.IsNullOrWhiteSpace(moveAssignment.Reason)
                    ? rebalanceNote.TrimStart()
                    : moveAssignment.Reason + rebalanceNote;
            }
        }

        // PHASE 1: tolerant JSON skill-array parser. Accepts null/empty/legacy non-JSON.
        private static List<string> ParseSkills(string? json)
        {
            if (string.IsNullOrWhiteSpace(json)) return new List<string>();
            try
            {
                var parsed = JsonSerializer.Deserialize<List<string>>(json, _jsonOptions);
                return parsed ?? new List<string>();
            }
            catch
            {
                // Legacy free-text fallback: comma-separated.
                return json.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList();
            }
        }
    }
}
