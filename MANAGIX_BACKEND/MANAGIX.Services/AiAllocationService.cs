using MANAGIX.DataAccess.Repositories.IRepositories;
using MANAGIX.Models.DTO;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace MANAGIX.Services
{
    public class AiAllocationService : IAiAllocationService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly HttpClient _httpClient;
        private const string AI_SERVICE_URL = "http://localhost:8002";

        private static readonly JsonSerializerOptions _jsonOptions = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            PropertyNameCaseInsensitive = true
        };

        public AiAllocationService(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
            _httpClient = new HttpClient
            {
                Timeout = TimeSpan.FromMinutes(2)
            };
        }

        // ── Helper: Get single employee info ──
        private async Task<EmployeeInfoDto> GetEmployeeInfoAsync(Guid userId, string name)
        {
            var skills = await _unitOfWork.ResumeSkills.GetByUserIdAsync(userId);
            var experiences = await _unitOfWork.ResumeExperiences.GetByUserIdAsync(userId);
            var tasks = await _unitOfWork.Tasks.GetByEmployeeIdAsync(userId);

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
                ActiveTasks = tasks.Count(t => t.Status == "Todo" || t.Status == "InProgress")
            };
        }

        // ── Helper: Get all employees info ──
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

        // ── Feature 1: Suggest Best Team ──
        public async Task<SuggestTeamResponseDto> SuggestBestTeamAsync(Guid projectId)
        {
            var project = await _unitOfWork.Projects.GetByIdAsync(projectId);
            if (project == null)
                throw new Exception($"Project with ID {projectId} not found.");

            var employees = await GetAllEmployeesInfoAsync();

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
                var response = await _httpClient.PostAsync($"{AI_SERVICE_URL}/suggest-team", content);
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
                }

                return result ?? new SuggestTeamResponseDto();
            }
            catch (TaskCanceledException)
            {
                throw new TaskCanceledException("AI service request timed out. Please try again.");
            }
            catch (HttpRequestException ex)
            {
                throw new HttpRequestException($"Cannot connect to AI service at {AI_SERVICE_URL}. Error: {ex.Message}", ex);
            }
        }

        // ── Feature 2: Suggest Employees ──
        public async Task<SuggestEmployeesResponseDto> SuggestEmployeesAsync(string projectDescription)
        {
            var employees = await GetAllEmployeesInfoAsync();

            var payload = new
            {
                projectDescription = projectDescription,
                employees = employees
            };

            var json = JsonSerializer.Serialize(payload, _jsonOptions);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            try
            {
                var response = await _httpClient.PostAsync($"{AI_SERVICE_URL}/suggest-employees", content);
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
                }

                return result ?? new SuggestEmployeesResponseDto();
            }
            catch (TaskCanceledException)
            {
                throw new TaskCanceledException("AI service request timed out. Please try again.");
            }
            catch (HttpRequestException ex)
            {
                throw new HttpRequestException($"Cannot connect to AI service at {AI_SERVICE_URL}. Error: {ex.Message}", ex);
            }
        }

        // ── Feature 3: Suggest Task Allocation ──
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

            var taskDtos = pendingTasks.Select(t => new
            {
                taskId = t.TaskId.ToString(),
                title = t.Title,
                description = t.Description ?? string.Empty,
                status = t.Status
            }).ToList();

            var payload = new
            {
                tasks = taskDtos,
                teamMembers = teamMembers
            };

            var json = JsonSerializer.Serialize(payload, _jsonOptions);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            try
            {
                var response = await _httpClient.PostAsync($"{AI_SERVICE_URL}/suggest-task-allocation", content);
                response.EnsureSuccessStatusCode();

                var responseBody = await response.Content.ReadAsStringAsync();
                var result = JsonSerializer.Deserialize<SuggestTaskAllocationResponseDto>(responseBody, _jsonOptions);

                if (result?.TaskAssignments != null)
                {
                    var memberLookup = teamMembers.ToDictionary(m => m.UserId.ToString(), m => m.Name);
                    var memberByName = teamMembers.ToDictionary(m => m.Name.ToLower(), m => m.UserId.ToString());
                    var taskLookup = pendingTasks.ToDictionary(t => t.TaskId.ToString(), t => t.Title);

                    foreach (var assignment in result.TaskAssignments)
                    {
                        // Fix userId if LLM returned a non-UUID value (e.g. "user1", name, etc.)
                        if (!Guid.TryParse(assignment.UserId, out _))
                        {
                            // Try matching by index: "user1" -> index 0, "user2" -> index 1, etc.
                            var numStr = new string(assignment.UserId.Where(char.IsDigit).ToArray());
                            if (int.TryParse(numStr, out int idx) && idx >= 1 && idx <= teamMembers.Count)
                            {
                                assignment.UserId = teamMembers[idx - 1].UserId.ToString();
                            }
                            // Try matching by name
                            else if (memberByName.TryGetValue(assignment.UserId.ToLower(), out var realId))
                            {
                                assignment.UserId = realId;
                            }
                            // Fallback: assign to first available member
                            else if (teamMembers.Count > 0)
                            {
                                assignment.UserId = teamMembers[0].UserId.ToString();
                            }
                        }

                        if (memberLookup.TryGetValue(assignment.UserId, out var empName))
                            assignment.EmployeeName = empName;
                        if (taskLookup.TryGetValue(assignment.TaskId, out var taskTitle))
                            assignment.TaskTitle = taskTitle;
                    }
                }

                return result ?? new SuggestTaskAllocationResponseDto();
            }
            catch (TaskCanceledException)
            {
                throw new TaskCanceledException("AI service request timed out. Please try again.");
            }
            catch (HttpRequestException ex)
            {
                throw new HttpRequestException($"Cannot connect to AI service at {AI_SERVICE_URL}. Error: {ex.Message}", ex);
            }
        }
    }
}
