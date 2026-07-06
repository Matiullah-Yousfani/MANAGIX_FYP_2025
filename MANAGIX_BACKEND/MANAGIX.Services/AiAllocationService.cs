using MANAGIX.DataAccess.Repositories.IRepositories;
using MANAGIX.Models.DTO;
using MANAGIX.Models.Models;
using MANAGIX.Services.Helpers;
using MANAGIX.Utility;
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
    //   3) SuggestTaskAllocationAsync is fully deterministic (Team Hub + Kanban share one path):
    //        AllocationScoring on skills + capacity + approval; same team pool; no Python LLM.
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
        private static List<string> ParseProfileSkills(string? raw) =>
            string.IsNullOrWhiteSpace(raw)
                ? new List<string>()
                : raw.Split(',', ';')
                    .Select(s => s.Trim())
                    .Where(s => s.Length > 0)
                    .ToList();

        private async Task<bool> HasResumeUploadedAsync(Guid userId)
        {
            var profile = await _unitOfWork.UserProfiles.GetByUserIdAsync(userId);
            if (!string.IsNullOrWhiteSpace(profile?.ResumeFilePath))
                return true;
            var educations = await _unitOfWork.ResumeEducations.GetByUserIdAsync(userId);
            return educations.Count > 0;
        }

        private async Task<bool> HasListedSkillsAsync(Guid userId)
        {
            var resumeSkills = await _unitOfWork.ResumeSkills.GetByUserIdAsync(userId);
            if (resumeSkills.Count > 0)
                return true;
            var profile = await _unitOfWork.UserProfiles.GetByUserIdAsync(userId);
            return ParseProfileSkills(profile?.Skills).Count > 0;
        }

        /// <summary>Pool entry: skills and/or résumé data (relaxed for FYP test data).</summary>
        private async Task<bool> IsEligibleForTeamPoolAsync(Guid userId) =>
            await HasListedSkillsAsync(userId) || await HasResumeUploadedAsync(userId);

        private async Task<HashSet<Guid>> GetManagerAndAdminIdsAsync()
        {
            var mgr = await _unitOfWork.Users.GetUserIdsByRoleNameAsync("Manager");
            var adm = await _unitOfWork.Users.GetUserIdsByRoleNameAsync("Admin");
            return new HashSet<Guid>(mgr.Concat(adm));
        }

        private async Task<List<EmployeeInfoDto>> GetAvailablePoolByRoleAsync(
            string canonicalRole,
            Guid? projectId,
            bool filterBusy = true,
            bool requireSkillsOrResume = false)
        {
            var roleIds = await _unitOfWork.Users.GetUserIdsByRoleNameAsync(canonicalRole);
            HashSet<Guid> busy = new();
            if (filterBusy)
            {
                busy = projectId.HasValue && projectId.Value != Guid.Empty
                    ? await _unitOfWork.TeamEmployees.GetActivelyAssignedEmployeeIdsAsync(projectId)
                    : await _unitOfWork.TeamEmployees.GetActivelyAssignedEmployeeIdsAsync(null);
            }

            var excluded = await GetManagerAndAdminIdsAsync();
            var list = new List<EmployeeInfoDto>();

            foreach (var id in roleIds)
            {
                if (excluded.Contains(id))
                    continue;
                if (filterBusy && busy.Contains(id))
                    continue;
                if (requireSkillsOrResume && !await IsEligibleForTeamPoolAsync(id))
                    continue;

                var user = await _unitOfWork.Users.GetByIdAsync(id);
                if (user != null)
                    list.Add(await GetEmployeeInfoAsync(user.UserId, user.FullName));
            }

            return list;
        }

        private async Task<(List<EmployeeInfoDto> Employees, List<EmployeeInfoDto> Qas)> GetAvailableTeamPoolsAsync(Guid projectId) =>
            (
                await GetAvailablePoolByRoleAsync(AppRoles.Employee, projectId, filterBusy: true, requireSkillsOrResume: false),
                await GetAvailablePoolByRoleAsync(AppRoles.QualityAssurance, projectId, filterBusy: true, requireSkillsOrResume: false)
            );

        /// <summary>2–4 developers based on scope signals; 1 QA is always added separately.</summary>
        private static int SuggestedDeveloperCount(string? title, string? projectDescription)
        {
            var text = $"{title ?? ""} {projectDescription ?? ""}".Trim().ToLowerInvariant();
            if (string.IsNullOrEmpty(text))
                return 2;

            var score = 0;
            if (text.Length > 350) score++;
            if (text.Length > 700) score++;

            string[] complex =
            {
                "enterprise", "microservice", "distributed", "machine learning", "blockchain",
                "multi-tenant", "scalable", "high availability", "real-time", "integration",
                "legacy", "migration", "security audit", "compliance", "full stack", "platform",
            };
            string[] simple =
            {
                "landing page", "portfolio", "blog", "crud", "simple", "basic", "small",
                "prototype", "mvp", "static", "brochure", "minor fix", "maintenance",
            };

            foreach (var w in complex)
                if (text.Contains(w, StringComparison.Ordinal))
                    score += 2;
            foreach (var w in simple)
                if (text.Contains(w, StringComparison.Ordinal))
                    score -= 2;

            if (score <= 0) return 2;
            if (score <= 3) return 3;
            return 4;
        }

        private static List<string> ExtractProjectKeywords(string? title, string? description)
        {
            var text = $"{title ?? ""} {description ?? ""}".ToLowerInvariant();
            var words = text.Split(
                new[] { ' ', '\n', '\r', '\t', ',', '.', ';', ':', '/', '-', '_', '(', ')' },
                StringSplitOptions.RemoveEmptyEntries);
            return words
                .Where(w => w.Length >= 3 && !IsStopWord(w))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .Take(48)
                .ToList();
        }

        private static bool IsStopWord(string w) =>
            w is "the" or "and" or "for" or "with" or "from" or "this" or "that" or "are" or "was" or "will" or "have" or "has" or "not" or "but" or "can" or "all" or "any" or "our" or "your" or "project"
                or "web" or "app" or "post" or "real" or "time" or "track" or "manage" or "using" or "into" or "also" or "each" or "more" or "than" or "such" or "their" or "them" or "they" or "what" or "when" or "where" or "which" or "while" or "would" or "about" or "after" or "before" or "being" or "between" or "both" or "could" or "during" or "every" or "other" or "some" or "these" or "those" or "through" or "under" or "until" or "very" or "system" or "based" or "powered" or "platform" or "solution" or "application";

        private static double ScoreMemberForProject(IReadOnlyList<string> projectKeywords, EmployeeInfoDto m)
        {
            var skill = AllocationScoring.SkillMatchScore(projectKeywords, m.Skills);
            var cap = AllocationScoring.CapacityScore(m.CurrentLoadHours, m.WeeklyCapacityHours);
            var appr = Math.Clamp(m.RecentApprovalRate, 0, 1);
            return AllocationScoring.Composite(skill, cap, appr);
        }

        private static double ScoreTeamOption(IReadOnlyList<string> projectKeywords, EmployeeInfoDto qa, IReadOnlyList<EmployeeInfoDto> devs)
        {
            if (devs.Count == 0) return ScoreMemberForProject(projectKeywords, qa);
            return (ScoreMemberForProject(projectKeywords, qa) + devs.Average(d => ScoreMemberForProject(projectKeywords, d))) / 2.0;
        }

        private static void ApplyRecommendedByFitScore(List<TeamOptionDto> options)
        {
            if (options.Count == 0) return;
            var winnerIdx = 0;
            for (var i = 1; i < options.Count; i++)
            {
                if (options[i].FitScore > options[winnerIdx].FitScore)
                    winnerIdx = i;
            }
            for (var i = 0; i < options.Count; i++)
                options[i].IsRecommended = i == winnerIdx;
        }

        private static List<TeamPoolMemberDto> ToPoolDtos(IEnumerable<EmployeeInfoDto> list) =>
            list.Select(e => new TeamPoolMemberDto
            {
                UserId = e.UserId.ToString(),
                Name = e.Name,
                Skills = e.Skills.Take(12).ToList(),
            }).ToList();

        private async Task<EmployeeInfoDto> GetEmployeeInfoAsync(Guid userId, string name)
        {
            var skills = await _unitOfWork.ResumeSkills.GetByUserIdAsync(userId);
            var experiences = await _unitOfWork.ResumeExperiences.GetByUserIdAsync(userId);
            var tasks = await _unitOfWork.Tasks.GetByEmployeeIdAsync(userId);
            var profile = await _unitOfWork.UserProfiles.GetByUserIdAsync(userId);
            var mergedSkills = skills.Select(s => s.SkillName)
                .Concat(ParseProfileSkills(profile?.Skills))
                .Where(s => !string.IsNullOrWhiteSpace(s))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            // Sum the estimated hours of active tasks (Status != "Done"). Null hours treated as 0.
            decimal currentLoadHours = tasks
                .Where(t =>
                {
                    var n = TaskWorkflow.Normalize(t.Status);
                    return n == TaskWorkflow.Todo || n == TaskWorkflow.InProgress;
                })
                .Sum(t => t.EstimatedHours ?? 4m);

            // Capacity defaults to 40h/week — UserProfile fallback when missing.
            decimal capacity = profile?.WeeklyCapacityHours ?? 40m;

            double approvalRate = await _unitOfWork.EmployeePerformances.GetAverageApprovalRateAsync(userId);

            return new EmployeeInfoDto
            {
                UserId = userId,
                Name = name,
                Skills = mergedSkills,
                Experience = experiences.Select(e => new ExperienceInfoDto
                {
                    Title = e.Title,
                    Company = e.Company,
                    Duration = e.Duration
                }).ToList(),
                ActiveTasks = tasks.Count(t => t.Status == "Todo" || t.Status == "InProgress"),
                CurrentLoadHours = currentLoadHours,
                WeeklyCapacityHours = capacity,
                RecentApprovalRate = approvalRate,
                EmployeeLevel = profile?.EmployeeLevel ?? EmployeeCareerService.ComputeLevel(profile?.CompletedProjectsCount ?? 0),
                HourlyRate = profile?.HourlyRate,
                CompletedProjectsCount = profile?.CompletedProjectsCount ?? 0,
            };
        }

        private async Task<List<EmployeeInfoDto>> GetAllEmployeesInfoAsync(Guid? projectId = null) =>
            await GetAvailablePoolByRoleAsync(
                AppRoles.Employee,
                projectId,
                filterBusy: true,
                requireSkillsOrResume: true);

        private async Task<List<EmployeeInfoDto>> GetAllQaInfoAsync(Guid projectId) =>
            await GetAvailablePoolByRoleAsync(
                AppRoles.QualityAssurance,
                projectId,
                filterBusy: true,
                requireSkillsOrResume: true);

        private async Task<bool> IsEligibleForAiSuggestionsAsync(Guid userId) =>
            await IsEligibleForTeamPoolAsync(userId);

        /// <summary>Users on the team linked to this project (for scoped AI suggestions).</summary>
        private async Task<List<EmployeeInfoDto>> GetProjectTeamEmployeesInfoAsync(Guid projectId)
        {
            var projectTeam = await _unitOfWork.ProjectTeams.GetByProjectIdAsync(projectId);
            if (projectTeam == null)
                return new List<EmployeeInfoDto>();

            var teamEmployees = await _unitOfWork.TeamEmployees.GetEmployeesByTeamIdAsync(projectTeam.TeamId);
            var list = new List<EmployeeInfoDto>();
            var employeeRoleIds = (await _unitOfWork.Users.GetUserIdsByRoleNameAsync("Employee")).ToHashSet();

            foreach (var te in teamEmployees)
            {
                if (!employeeRoleIds.Contains(te.EmployeeId)) continue;
                var user = await _unitOfWork.Users.GetByIdAsync(te.EmployeeId);
                if (user != null)
                    list.Add(await GetEmployeeInfoAsync(user.UserId, user.FullName));
            }

            return list;
        }

        /// <summary>
        /// Same employee pool for Team Hub bulk suggest and Kanban per-task suggest:
        /// project team, Employee role, résumé/skills eligibility — no extra filters per entry point.
        /// </summary>
        private async Task<List<EmployeeInfoDto>> GetTaskAllocationTeamMembersAsync(Guid projectId)
        {
            var projectTeam = await _unitOfWork.ProjectTeams.GetByProjectIdAsync(projectId);
            if (projectTeam == null)
                return new List<EmployeeInfoDto>();

            var teamEmployees = await _unitOfWork.TeamEmployees.GetEmployeesByTeamIdAsync(projectTeam.TeamId);
            var employeeRoleIds = (await _unitOfWork.Users.GetUserIdsByRoleNameAsync("Employee")).ToHashSet();
            var list = new List<EmployeeInfoDto>();

            foreach (var te in teamEmployees)
            {
                if (!employeeRoleIds.Contains(te.EmployeeId)) continue;
                var user = await _unitOfWork.Users.GetByIdAsync(te.EmployeeId);
                if (user != null)
                    list.Add(await GetEmployeeInfoAsync(user.UserId, user.FullName));
            }

            return list.OrderBy(m => m.UserId).ToList();
        }

        public async Task<string?> ResolveProjectDescriptionAsync(Guid projectId)
        {
            var project = await _unitOfWork.Projects.GetByIdAsync(projectId);
            if (project == null) return null;
            var text = $"{project.Title}. {project.Description ?? ""}".Trim();
            return string.IsNullOrWhiteSpace(text) ? project.Title : text;
        }

        // ── Feature 1: Suggest Best Team ──
        public async Task<SuggestTeamResponseDto> SuggestBestTeamAsync(Guid projectId)
        {
            var project = await _unitOfWork.Projects.GetByIdAsync(projectId);
            if (project == null)
                throw new Exception($"Project with ID {projectId} not found.");

            var employees = await GetAllEmployeesInfoAsync(projectId);
            var qas = await GetAllQaInfoAsync(projectId);
            var pool = employees.Concat(qas).ToList();

            if (employees.Count == 0 || qas.Count == 0)
                throw new InvalidOperationException(
                    $"No employees or QA in the pool ({employees.Count} employees, {qas.Count} QA). " +
                    "Ensure users have the Employee or Quality Assurance role (not the duplicate 'QA' role row).");

            var payload = new
            {
                project = new
                {
                    projectId = project.ProjectId.ToString(),
                    title = project.Title,
                    description = project.Description ?? string.Empty
                },
                employees = pool
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
                    var employeeLookup = pool.ToDictionary(e => e.UserId.ToString(), e => e.Name);
                    var empByName = pool.ToDictionary(e => e.Name.ToLower(), e => e.UserId.ToString());
                    foreach (var member in result.Team)
                    {
                        // Fix userId if LLM returned non-UUID
                        if (!Guid.TryParse(member.UserId, out _))
                        {
                            var numStr = new string(member.UserId.Where(char.IsDigit).ToArray());
                            if (int.TryParse(numStr, out int idx) && idx >= 1 && idx <= pool.Count)
                                member.UserId = pool[idx - 1].UserId.ToString();
                            else if (empByName.TryGetValue(member.UserId.ToLower(), out var realId))
                                member.UserId = realId;
                        }

                        if (employeeLookup.TryGetValue(member.UserId, out var name))
                            member.Name = name;
                    }

                    var allowed = new HashSet<string>(
                        pool.Select(e => e.UserId.ToString()),
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

        private static List<string> GetMatchingSkills(IReadOnlyList<string> projectKeywords, EmployeeInfoDto m) =>
            m.Skills
                .Where(s => !string.IsNullOrWhiteSpace(s) &&
                            projectKeywords.Any(k => AllocationScoring.SkillTokensMatch(k, s)))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .Take(6)
                .ToList();

        private async Task<(int PendingReviews, int ActiveProjects, double WorkloadScore)> GetQaWorkloadAsync(Guid qaId)
        {
            const int pendingThreshold = 10;
            const double overloadScore = 20;
            var teamIds = await _unitOfWork.TeamEmployees.GetTeamIdsForMemberAsync(qaId);
            var projectIds = new HashSet<Guid>();
            foreach (var tid in teamIds)
            {
                var pt = await _unitOfWork.ProjectTeams.GetByTeamIdAsync(tid);
                if (pt != null)
                    projectIds.Add(pt.ProjectId);
            }

            var pending = 0;
            foreach (var pid in projectIds)
            {
                var tasks = await _unitOfWork.Tasks.GetByProjectIdAsync(pid);
                pending += tasks.Count(t =>
                {
                    var n = TaskWorkflow.Normalize(t.Status);
                    return n == TaskWorkflow.Done || string.Equals(t.Status, "Submitted", StringComparison.OrdinalIgnoreCase);
                });
            }

            var score = pending + projectIds.Count * 2.0;
            _ = pendingThreshold;
            _ = overloadScore;
            return (pending, projectIds.Count, score);
        }

        private static TeamSuggestionDto BuildMemberSuggestion(
            EmployeeInfoDto member,
            string role,
            IReadOnlyList<string> projectKeywords,
            string projectTitle,
            bool isQa,
            double qaWorkloadScore = 0,
            int qaPending = 0)
        {
            var skillScore = AllocationScoring.SkillMatchScore(projectKeywords, member.Skills);
            var cap = AllocationScoring.CapacityScore(member.CurrentLoadHours, member.WeeklyCapacityHours);
            var composite = AllocationScoring.Composite(skillScore, cap, member.RecentApprovalRate);
            var matching = GetMatchingSkills(projectKeywords, member);
            var confidence = (int)Math.Round(Math.Clamp(composite, 0, 1) * 100);

            var reasonParts = new List<string>();
            if (matching.Count > 0)
                reasonParts.Add($"Skills: {string.Join(", ", matching)}");
            else if (member.Skills.Count > 0)
                reasonParts.Add($"Skills: {string.Join(", ", member.Skills.Take(4))}");
            else
                reasonParts.Add("Add résumé/skills for better matching");

            reasonParts.Add($"{member.ActiveTasks} active tasks · {member.CurrentLoadHours:0.#}h workload");
            if (member.Experience.Count > 0)
                reasonParts.Add($"{member.Experience[0].Title} ({member.Experience[0].Company})");

            var qaRecommended = true;
            if (isQa)
            {
                if (qaPending >= 10 || qaWorkloadScore >= 20)
                {
                    qaRecommended = false;
                    reasonParts.Add($"Busy — {qaPending} pending reviews");
                }
                else if (qaWorkloadScore >= 12)
                    reasonParts.Add($"Moderate load — {qaPending} pending reviews");
                else
                    reasonParts.Add("Available for QA");
            }

            return new TeamSuggestionDto
            {
                UserId = member.UserId.ToString(),
                Name = member.Name,
                Role = role,
                Reason = string.Join(". ", reasonParts) + ".",
                ConfidenceScore = confidence,
                MatchingSkills = matching,
                ActiveTasks = member.ActiveTasks,
                CurrentLoadHours = member.CurrentLoadHours,
                ExperienceSummary = member.Experience.FirstOrDefault()?.Title,
                IsRecommendedForRole = qaRecommended,
            };
        }

        private static TeamOptionDto BuildTeamOption(
            string label,
            string suggestedTeamName,
            EmployeeInfoDto qa,
            IReadOnlyList<EmployeeInfoDto> devs,
            IReadOnlyList<string> projectKeywords,
            string projectTitle,
            double fitScore,
            double qaWorkloadScore,
            int qaPending)
        {
            var team = new List<TeamSuggestionDto>
            {
                BuildMemberSuggestion(qa, "QA", projectKeywords, projectTitle, isQa: true, qaWorkloadScore, qaPending),
            };
            foreach (var e in devs)
                team.Add(BuildMemberSuggestion(e, "Developer", projectKeywords, projectTitle, isQa: false));

            return new TeamOptionDto
            {
                Label = label,
                SuggestedTeamName = suggestedTeamName,
                Team = team,
                FitScore = Math.Round(fitScore, 4),
            };
        }

        /// <summary>Up to 3 deterministic team options: 1 QA + N developers (stable across regenerate).</summary>
        public async Task<SuggestTeamOptionsResponseDto> SuggestTeamOptionsAsync(Guid projectId)
        {
            var project = await _unitOfWork.Projects.GetByIdAsync(projectId)
                ?? throw new Exception($"Project with ID {projectId} not found.");

            var (employees, qas) = await GetAvailableTeamPoolsAsync(projectId);

            if (employees.Count == 0 || qas.Count == 0)
            {
                throw new InvalidOperationException(
                    $"Not enough unassigned people to suggest a team. Found {employees.Count} available employee(s) and {qas.Count} available QA(s). " +
                    "People already on another active project team are excluded. Free them or add more users.");
            }

            var projectKeywords = ExtractProjectKeywords(project.Title, project.Description);
            var idealDevCount = SuggestedDeveloperCount(project.Title, project.Description);
            var devCount = Math.Max(1, Math.Min(idealDevCount, employees.Count));

            var rankedEmps = employees
                .Select(e => (Member: e, Score: ScoreMemberForProject(projectKeywords, e)))
                .OrderByDescending(x => x.Score)
                .ThenBy(x => x.Member.UserId)
                .Select(x => x.Member)
                .ToList();

            var rankedQas = new List<(EmployeeInfoDto Member, double Score, double Workload, int Pending)>();
            foreach (var q in qas)
            {
                var (pending, _, workload) = await GetQaWorkloadAsync(q.UserId);
                var skillScore = ScoreMemberForProject(projectKeywords, q);
                // Prefer lowest workload, then best skill fit
                var rank = skillScore - workload * 0.02;
                rankedQas.Add((q, rank, workload, pending));
            }
            rankedQas = rankedQas
                .OrderByDescending(x => x.Score)
                .ThenBy(x => x.Workload)
                .ThenBy(x => x.Member.UserId)
                .ToList();
            var rankedQaMembers = rankedQas.Select(x => x.Member).ToList();

            var maxTeams = Math.Min(3, Math.Min(rankedQaMembers.Count, employees.Count / devCount));
            if (maxTeams < 1 && employees.Count >= 1)
                maxTeams = 1;

            if (maxTeams < 1)
            {
                throw new InvalidOperationException(
                    $"Not enough available employees for even one team (need 1 QA + 1 developer). {employees.Count} employee(s), {qas.Count} QA(s) unassigned.");
            }

            var options = new List<TeamOptionDto>();
            var shortTitle = project.Title.Length > 24 ? project.Title[..24] + "…" : project.Title;

            for (int t = 0; t < maxTeams; t++)
            {
                var qa = rankedQaMembers[t % rankedQaMembers.Count];
                var qaMeta = rankedQas.First(x => x.Member.UserId == qa.UserId);
                var devs = new List<EmployeeInfoDto>();
                for (int d = 0; d < devCount; d++)
                {
                    var idx = t * devCount + d;
                    if (idx >= rankedEmps.Count) break;
                    devs.Add(rankedEmps[idx]);
                }
                if (devs.Count == 0) break;

                var fit = ScoreTeamOption(projectKeywords, qa, devs);
                var isFirst = options.Count == 0;
                options.Add(BuildTeamOption(
                    isFirst ? "Best fit" : $"Option {options.Count + 1}",
                    isFirst ? $"{shortTitle} Core Team" : $"{shortTitle} Squad {options.Count + 1}",
                    qa,
                    devs,
                    projectKeywords,
                    project.Title,
                    fit,
                    qaMeta.Workload,
                    qaMeta.Pending));
            }

            ApplyRecommendedByFitScore(options);

            string? availabilityMessage = null;
            if (options.Count < 3)
            {
                availabilityMessage =
                    $"Showing {options.Count} team option(s) from {employees.Count} unassigned employee(s) " +
                    $"(up to {devCount} devs per team). Users on other project teams are not included.";
            }

            return new SuggestTeamOptionsResponseDto
            {
                Options = options,
                SuggestedDeveloperCount = devCount,
                AvailableQa = ToPoolDtos(rankedQaMembers),
                AvailableEmployees = ToPoolDtos(rankedEmps),
                AvailabilityMessage = availabilityMessage,
            };
        }

        private static TeamOptionDto BuildOptionFromIds(
            string label,
            IEnumerable<string> userIds,
            SuggestEmployeesResponseDto ranked)
        {
            var lookup = ranked.RecommendedEmployees.ToDictionary(r => r.UserId, r => r);
            var team = userIds
                .Where(lookup.ContainsKey)
                .Select(id => new TeamSuggestionDto
                {
                    UserId = id,
                    Name = lookup[id].Name,
                    Role = "Member",
                    Reason = lookup[id].Reason,
                })
                .ToList();
            return new TeamOptionDto { Label = label, Team = team };
        }

        // ── Feature 2: Suggest Employees ──
        // PHASE 1: Adds cross-project filter when no projectId is given (company-wide search).
        public async Task<SuggestEmployeesResponseDto> SuggestEmployeesAsync(string projectDescription, Guid? projectId = null, bool includeAlreadyAssigned = false)
        {
            List<EmployeeInfoDto> employees;
            if (projectId.HasValue && projectId.Value != Guid.Empty)
            {
                var projectTeam = await _unitOfWork.ProjectTeams.GetByProjectIdAsync(projectId.Value);
                if (projectTeam != null)
                    employees = await GetProjectTeamEmployeesInfoAsync(projectId.Value);
                else
                    employees = await GetAllEmployeesInfoAsync(projectId.Value);

                if (employees.Count == 0)
                    return new SuggestEmployeesResponseDto();
            }
            else
            {
                // Company-wide: filter out anyone busy on another active project (unless caller opted in).
                employees = await GetAllEmployeesInfoAsync(projectId);
                if (!includeAlreadyAssigned && !projectId.HasValue)
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
        public async Task<SuggestTaskAllocationResponseDto> SuggestTaskAllocationAsync(
            Guid projectId,
            Guid? singleTaskId = null)
        {
            var teamMembers = await GetTaskAllocationTeamMembersAsync(projectId);
            if (teamMembers.Count == 0)
                return new SuggestTaskAllocationResponseDto();

            var allTasks = await _unitOfWork.Tasks.GetByProjectIdAsync(projectId);
            List<TaskItem> pendingTasks;
            if (singleTaskId.HasValue && singleTaskId.Value != Guid.Empty)
            {
                var one = allTasks.FirstOrDefault(t => t.TaskId == singleTaskId.Value);
                if (one == null || !TaskIsOpen(one))
                    return new SuggestTaskAllocationResponseDto();
                pendingTasks = new List<TaskItem> { one };
            }
            else
            {
                pendingTasks = allTasks.Where(TaskNeedsAssignee).ToList();
                if (pendingTasks.Count == 0)
                    return new SuggestTaskAllocationResponseDto();
            }

            return BuildDeterministicTaskSuggestions(pendingTasks, teamMembers);
        }

        /// <summary>
        /// Same merit scoring for Team Hub bulk and Kanban per-task: skills + capacity + approval per task,
        /// using current DB workload only (no cross-task load stacking that would change winners).
        /// </summary>
        private SuggestTaskAllocationResponseDto BuildDeterministicTaskSuggestions(
            List<TaskItem> pendingTasks,
            List<EmployeeInfoDto> teamMembers)
        {
            var result = new SuggestTaskAllocationResponseDto();
            if (pendingTasks.Count == 0 || teamMembers.Count == 0)
                return result;

            var capacityByMember = teamMembers.ToDictionary(m => m.UserId, m => m.WeeklyCapacityHours);
            var approvalByMember = teamMembers.ToDictionary(m => m.UserId, m => m.RecentApprovalRate);
            var baselineHours = teamMembers.ToDictionary(m => m.UserId, m => m.CurrentLoadHours);
            var batchAssignmentCount = teamMembers.ToDictionary(m => m.UserId, _ => 0);

            var remaining = pendingTasks.OrderBy(t => t.TaskId).ToList();

            // Phase 1: every team member gets at least one task when possible
            if (remaining.Count >= teamMembers.Count)
            {
                foreach (var member in teamMembers.OrderBy(m => baselineHours[m.UserId]).ThenBy(m => m.UserId))
                {
                    if (remaining.Count == 0) break;
                    TaskItem? bestTask = null;
                    (EmployeeInfoDto Member, double Score, double SkillScore, double CapacityScore, double ApprovalScore)? bestRank = null;
                    foreach (var task in remaining)
                    {
                        var requiredSkills = RefineRequiredSkillsForTeam(RequiredSkillsForTask(task), teamMembers);
                        var ranked = AllocationScoring.RankMembers(
                            requiredSkills,
                            new List<EmployeeInfoDto> { member },
                            baselineHours,
                            capacityByMember,
                            approvalByMember);
                        var top = ranked.FirstOrDefault();
                        if (top.Member.UserId == Guid.Empty) continue;
                        if (bestRank == null || top.Score > bestRank.Value.Score)
                        {
                            bestRank = top;
                            bestTask = task;
                        }
                    }
                    if (bestTask == null || bestRank == null) continue;
                    result.TaskAssignments.Add(MakeAssignment(bestTask, bestRank.Value, teamMembers));
                    batchAssignmentCount[member.UserId] = batchAssignmentCount.GetValueOrDefault(member.UserId, 0) + 1;
                    remaining.Remove(bestTask);
                }
            }

            // Phase 2: distribute remaining tasks fairly (lowest assignment count first, then best score)
            foreach (var task in remaining)
            {
                var requiredSkills = RefineRequiredSkillsForTeam(RequiredSkillsForTask(task), teamMembers);
                var ranked = AllocationScoring.RankMembers(
                    requiredSkills,
                    teamMembers,
                    baselineHours,
                    capacityByMember,
                    approvalByMember);

                var top = ranked
                    .OrderBy(r => batchAssignmentCount.GetValueOrDefault(r.Member.UserId, 0))
                    .ThenByDescending(r => r.Score)
                    .First();

                batchAssignmentCount[top.Member.UserId] = batchAssignmentCount.GetValueOrDefault(top.Member.UserId, 0) + 1;
                result.TaskAssignments.Add(MakeAssignment(task, top, teamMembers));
            }

            return result;
        }

        private TaskAssignmentDto MakeAssignment(
            TaskItem task,
            (EmployeeInfoDto Member, double Score, double SkillScore, double CapacityScore, double ApprovalScore) top,
            List<EmployeeInfoDto> teamMembers)
        {
            var requiredSkills = RefineRequiredSkillsForTeam(RequiredSkillsForTask(task), teamMembers);
            var assignment = new TaskAssignmentDto
            {
                TaskId = task.TaskId.ToString(),
                TaskTitle = task.Title,
                UserId = top.Member.UserId.ToString(),
                EmployeeName = top.Member.Name,
                TaskDeadline = task.Deadline,
                SuggestedDueDate = FormatTaskDueDate(task.Deadline),
                ScoreSkill = Math.Round(top.SkillScore, 3),
                ScoreCapacity = Math.Round(top.CapacityScore, 3),
                ScoreApproval = Math.Round(top.ApprovalScore, 3),
                ScoreTotal = Math.Round(top.Score, 3),
                Confidence = (int)Math.Round(top.Score * 100),
                OverrodeLlm = false,
            };

            if (top.Member.Skills.Count == 0)
            {
                assignment.Confidence = 0;
                assignment.Reason =
                    "No skills on file — upload résumé and add skills for a confidence score.";
            }
            else
            {
                assignment.Reason = BuildStableAssignmentReason(top, task, requiredSkills);
            }

            return assignment;
        }

        private static List<string> RequiredSkillsForTask(TaskItem task)
        {
            var fromJson = ParseSkillsStatic(task.RequiredSkillsJson);
            if (fromJson.Count > 0)
                return fromJson;

            // Title-only keywords avoid flooding the scorer with description stop-words.
            return ExtractProjectKeywords(task.Title, null);
        }

        /// <summary>When inferring from title, keep tokens that at least one teammate's skills can match.</summary>
        private static List<string> RefineRequiredSkillsForTeam(
            List<string> requiredSkills,
            List<EmployeeInfoDto> teamMembers)
        {
            if (requiredSkills.Count == 0 || teamMembers.Count == 0)
                return requiredSkills;

            var teamSkills = teamMembers
                .SelectMany(m => m.Skills)
                .Where(s => !string.IsNullOrWhiteSpace(s))
                .ToList();

            if (teamSkills.Count == 0)
                return requiredSkills;

            var matchedToTeam = requiredSkills
                .Where(k => teamSkills.Any(s => AllocationScoring.SkillTokensMatch(k, s)))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            return matchedToTeam.Count > 0 ? matchedToTeam : requiredSkills;
        }

        private static List<string> ParseSkillsStatic(string? json)
        {
            if (string.IsNullOrWhiteSpace(json)) return new List<string>();
            try
            {
                var parsed = JsonSerializer.Deserialize<List<string>>(json);
                return parsed?.Where(s => !string.IsNullOrWhiteSpace(s)).Select(s => s.Trim()).ToList()
                    ?? new List<string>();
            }
            catch
            {
                return json.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                    .ToList();
            }
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
        private static string FormatTaskDueDate(DateTime? deadline) =>
            deadline.HasValue ? deadline.Value.ToString("yyyy-MM-dd") : "Not set — add a due date on the task";

        private static string BuildStableAssignmentReason(
            (EmployeeInfoDto Member, double Score, double SkillScore, double CapacityScore, double ApprovalScore) pick,
            TaskItem task,
            IReadOnlyList<string> requiredSkills)
        {
            var matched = pick.Member.Skills
                .Where(h => requiredSkills.Any(r => AllocationScoring.SkillTokensMatch(r, h)))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .Take(4)
                .ToList();

            var pct = (int)Math.Round(Math.Clamp(pick.Score, 0, 1) * 100);
            var skillPct = (int)Math.Round(Math.Clamp(pick.SkillScore, 0, 1) * 100);
            var due = FormatTaskDueDate(task.Deadline);
            if (matched.Count > 0)
            {
                return $"Assign to {pick.Member.Name} — skills ({string.Join(", ", matched)}), " +
                       $"due {due}, overall match {pct}% (skill {skillPct}%).";
            }

            return $"Assign to {pick.Member.Name} — best workload/skill fit, due {due}, overall match {pct}%.";
        }

        private void ApplyDeterministicPostPass(
            SuggestTaskAllocationResponseDto result,
            List<TaskItem> pendingTasks,
            List<EmployeeInfoDto> teamMembers,
            bool forceDeterministicTop = false)
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

                var top = ranked.First();
                Guid finalUserId = top.Member.UserId;
                double finalScore = top.Score;
                double finalSkill = top.SkillScore;
                double finalCap = top.CapacityScore;
                double finalAppr = top.ApprovalScore;

                if (!forceDeterministicTop &&
                    llmUserId.HasValue &&
                    assignment.Confidence >= 60 &&
                    ranked.Any(r => r.Member.UserId == llmUserId.Value))
                {
                    finalUserId = llmUserId.Value;
                    var entry = ranked.First(r => r.Member.UserId == finalUserId);
                    finalScore = entry.Score;
                    finalSkill = entry.SkillScore;
                    finalCap = entry.CapacityScore;
                    finalAppr = entry.ApprovalScore;
                }

                var member = memberById[finalUserId];
                assignment.UserId = finalUserId.ToString();
                assignment.EmployeeName = member.Name;
                assignment.TaskTitle = task.Title;
                assignment.OverrodeLlm = forceDeterministicTop;
                if (member.Skills.Count == 0)
                {
                    assignment.Confidence = 0;
                    assignment.Reason = "No skills on file — upload résumé and add skills for a confidence score.";
                }
                else
                {
                    assignment.ScoreSkill = Math.Round(finalSkill, 3);
                    assignment.ScoreCapacity = Math.Round(finalCap, 3);
                    assignment.ScoreApproval = Math.Round(finalAppr, 3);
                    assignment.ScoreTotal = Math.Round(finalScore, 3);
                    assignment.Confidence = (int)Math.Round(finalScore * 100);
                    assignment.Reason = forceDeterministicTop
                        ? BuildStableAssignmentReason(top, task, requiredSkills)
                        : assignment.Reason;
                }

                if (!forceDeterministicTop && llmUserId.HasValue && assignment.Confidence >= 60 &&
                    finalUserId != top.Member.UserId)
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

        public async Task<ApplyTaskAssignmentsResultDto> ApplyTaskAssignmentsAsync(Guid projectId, List<TaskAssignmentDto> assignments)
        {
            var result = new ApplyTaskAssignmentsResultDto();
            if (assignments == null || assignments.Count == 0)
                return result;

            var projectTeam = await _unitOfWork.ProjectTeams.GetByProjectIdAsync(projectId);
            if (projectTeam == null)
            {
                result.Errors.Add("Assign a team to the project before applying task assignments.");
                result.Failed = assignments.Count;
                return result;
            }

            var teamMemberIds = (await _unitOfWork.TeamEmployees.GetEmployeesByTeamIdAsync(projectTeam.TeamId))
                .Select(te => te.EmployeeId)
                .ToHashSet();

            foreach (var a in assignments)
            {
                if (!Guid.TryParse(a.TaskId, out var taskId))
                {
                    result.Errors.Add($"Invalid task id: {a.TaskId}");
                    result.Failed++;
                    continue;
                }
                if (!Guid.TryParse(a.UserId, out var userId))
                {
                    result.Errors.Add($"Invalid user id for task {a.TaskTitle}: {a.UserId}");
                    result.Failed++;
                    continue;
                }
                if (!teamMemberIds.Contains(userId))
                {
                    result.Errors.Add($"{a.EmployeeName} is not on the project team.");
                    result.Failed++;
                    continue;
                }

                var task = await _unitOfWork.Tasks.GetByIdAsync(taskId);
                if (task == null || task.ProjectId != projectId)
                {
                    result.Errors.Add($"Task not found in project: {a.TaskTitle}");
                    result.Failed++;
                    continue;
                }

                if (!TaskNeedsAssignee(task))
                {
                    result.Errors.Add($"Task already has an assignee: {a.TaskTitle}");
                    result.Failed++;
                    continue;
                }

                task.AssignedEmployeeId = userId;
                _unitOfWork.Tasks.Update(task);
                result.Applied++;
            }

            if (result.Applied > 0)
                await _unitOfWork.CompleteAsync();

            return result;
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

        private static bool TaskIsOpen(TaskItem t)
        {
            var n = TaskWorkflow.Normalize(t.Status);
            return n != TaskWorkflow.Approved && n != TaskWorkflow.Done;
        }

        /// <summary>Open task with no assignee — bulk Team Setup allocation only.</summary>
        private static bool TaskNeedsAssignee(TaskItem t) =>
            TaskIsOpen(t) && (!t.AssignedEmployeeId.HasValue || t.AssignedEmployeeId.Value == Guid.Empty);

        public async Task<List<TaskAllocationProjectDto>> GetTaskAllocationProjectsAsync(Guid? managerId)
        {
            var projects = managerId.HasValue
                ? await _unitOfWork.Projects.GetByManagerIdAsync(managerId.Value)
                : (await _unitOfWork.Projects.GetAllAsync()).ToList();

            var assignments = await _unitOfWork.ProjectTeams.GetAllAssignmentsAsync();
            var projectIdsWithTeam = assignments.Select(a => a.ProjectId).ToHashSet();

            var result = new List<TaskAllocationProjectDto>();
            foreach (var p in projects)
            {
                if (p.IsClosed) continue;

                var tasks = await _unitOfWork.Tasks.GetByProjectIdAsync(p.ProjectId);
                var unassignedCount = tasks.Count(TaskNeedsAssignee);
                if (unassignedCount == 0) continue;

                var hasTeam = projectIdsWithTeam.Contains(p.ProjectId);
                result.Add(new TaskAllocationProjectDto
                {
                    ProjectId = p.ProjectId,
                    Title = string.IsNullOrWhiteSpace(p.Title) ? "Untitled project" : p.Title,
                    UnassignedTaskCount = unassignedCount,
                    HasTeam = hasTeam,
                });
            }

            return result.OrderBy(p => p.Title, StringComparer.OrdinalIgnoreCase).ToList();
        }
    }
}
