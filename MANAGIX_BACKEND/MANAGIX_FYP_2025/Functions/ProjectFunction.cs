using MANAGIX.DataAccess.Repositories.IRepositories;
using MANAGIX.Models.DTO;
using MANAGIX.Models.Models;
using MANAGIX.Services;
using MANAGIX.Utility;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace MANAGIX_FYP_2025.Functions
{
    public class ProjectFunction
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IProjectClosureReportService _closureReports;
        private readonly IProjectTimelineService _timeline;
        private static readonly JsonSerializerOptions _json = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            PropertyNameCaseInsensitive = true,
        };

        public ProjectFunction(
            IUnitOfWork unitOfWork,
            IProjectClosureReportService closureReports,
            IProjectTimelineService timeline)
        {
            _unitOfWork = unitOfWork;
            _closureReports = closureReports;
            _timeline = timeline;
        }

        [Function("CreateProject")]
        public async Task<HttpResponseData> CreateProject(
      [HttpTrigger(AuthorizationLevel.Function, "post", Route = "projects")] HttpRequestData req)
        {
            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var dto = JsonSerializer.Deserialize<ProjectCreateDto>(body, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (dto == null || string.IsNullOrWhiteSpace(dto.Title) || dto.ModelId == Guid.Empty)
            {
                var badResp = req.CreateResponse(HttpStatusCode.BadRequest);
                await badResp.WriteAsJsonAsync(new { message = "Invalid data: Project Title and Model are required." });
                return badResp;
            }

            dto.Title = dto.Title.Trim();

            if (dto.ManagerId == Guid.Empty)
            {
                var badResp = req.CreateResponse(HttpStatusCode.BadRequest);
                await badResp.WriteAsJsonAsync(new { message = "ManagerId is required." });
                return badResp;
            }

            if (dto.Budget < 0)
            {
                var badResp = req.CreateResponse(HttpStatusCode.BadRequest);
                await badResp.WriteAsJsonAsync(new { message = "Budget cannot be negative." });
                return badResp;
            }

            var modelEntity = await _unitOfWork.ProjectModels.GetByIdAsync(dto.ModelId);
            if (modelEntity == null)
            {
                var badResp = req.CreateResponse(HttpStatusCode.BadRequest);
                await badResp.WriteAsJsonAsync(new { message = "Invalid project model (ModelId not found)." });
                return badResp;
            }

            var managerUser = await _unitOfWork.Users.GetByIdAsync(dto.ManagerId);
            if (managerUser == null)
            {
                var badResp = req.CreateResponse(HttpStatusCode.BadRequest);
                await badResp.WriteAsJsonAsync(new { message = "Manager user not found." });
                return badResp;
            }

            var canOwnProject = managerUser.UserRoles?.Any(ur =>
                ur.Role != null &&
                (string.Equals(ur.Role.RoleName, "Manager", StringComparison.OrdinalIgnoreCase) ||
                 string.Equals(ur.Role.RoleName, "Admin", StringComparison.OrdinalIgnoreCase))) == true;
            if (!canOwnProject)
            {
                var badResp = req.CreateResponse(HttpStatusCode.BadRequest);
                await badResp.WriteAsJsonAsync(new { message = "Project owner must be a Manager or Admin." });
                return badResp;
            }

            if (CalendarDate.IsBeforeUtcCalendarToday(dto.Deadline))
            {
                var badResp = req.CreateResponse(HttpStatusCode.BadRequest);
                await badResp.WriteAsJsonAsync(new { message = "Project deadline must be today or a future date." });
                return badResp;
            }

            if (await _unitOfWork.Projects.ExistsByTitleAsync(dto.Title, null))
            {
                var conflict = req.CreateResponse(HttpStatusCode.Conflict);
                await conflict.WriteAsJsonAsync(new { message = "A project with this title already exists. Choose a unique project name." });
                return conflict;
            }

            var project = new Project
            {
                Title = dto.Title,
                Description = dto.Description,
                Deadline = dto.Deadline,
                Budget = dto.Budget,
                ModelId = dto.ModelId, // <--- MAP THE NEW COLUMN HERE
                Status = "New",
                CreatedAt = DateTime.UtcNow,
                CreatedBy = dto.ManagerId
            };

            await _unitOfWork.Projects.AddAsync(project);
            await _unitOfWork.CompleteAsync();

            var resp = req.CreateResponse(HttpStatusCode.Created);
            await resp.WriteAsJsonAsync(project);
            return resp;
        }


        [Function("GetAdminProjectDetailPage")]
        public async Task<HttpResponseData> GetProjectDetailForAdminAsync(
         [HttpTrigger(AuthorizationLevel.Function, "get", Route = "projects/admin/{projectId}")] HttpRequestData req,
         string projectId)
        {
            if (!Guid.TryParse(projectId, out var pid))
                return await BadRequest(req, "Invalid ProjectId");

            var project = await _unitOfWork.Projects.GetByIdAsync(pid);
            if (project == null)
                return await BadRequest(req, "Project not found");

            // Milestones
            var milestones = await _unitOfWork.Milestones.GetByProjectIdAsync(pid);

            // Tasks
            var tasks = await _unitOfWork.Tasks.GetByProjectIdAsync(pid);

            // Single Team
            var projectTeam = await _unitOfWork.ProjectTeams.GetByProjectIdAsync(pid);
            Team? team = null;
            if (projectTeam != null)
            {
                team = await _unitOfWork.Teams.GetByIdAsync(projectTeam.TeamId);
            }

            // Members
            var members = new List<User>();
            if (team != null)
            {
                var teamEmployees = await _unitOfWork.TeamEmployees.GetEmployeesByTeamIdAsync(team.TeamId);
                foreach (var te in teamEmployees)
                {
                    var user = await _unitOfWork.Users.GetByIdAsync(te.EmployeeId);
                    if (user != null) members.Add(user);
                }
            }

            var projectDetailDto = new ProjectDetailAdminDto
            {
                ProjectId = project.ProjectId,
                Title = project.Title,
                Description = project.Description,
                Deadline = project.Deadline,
                Budget = project.Budget,
                Status = project.Status,
                Milestones = milestones.Select(m => new MilestoneDto
                {
                    MilestoneId = m.MilestoneId,
                    Title = m.Title,
                    Deadline = m.Deadline,
                    Status = m.Status
                }).ToList(),
                Tasks = tasks.Select(t => new TaskItemDto
                {
                    TaskId = t.TaskId,
                    Title = t.Title,
                    Status = t.Status,
                    AssignedEmployeeId = t.AssignedEmployeeId
                }).ToList(),
                Teams = team != null ? new List<TeamDto>
        {
            new TeamDto { TeamId = team.TeamId, Name = team.Name }
        } : new List<TeamDto>(),
                Members = members.Select(u => new UserDto
                {
                    UserId = u.UserId,
                    FullName = u.FullName,
                    Email = u.Email
                }).ToList()
            };

            var resp = req.CreateResponse(HttpStatusCode.OK);
            await resp.WriteAsJsonAsync(projectDetailDto);
            return resp;
        }


        [Function("DeleteProject")]
        public async Task<HttpResponseData> DeleteProject(
    [HttpTrigger(AuthorizationLevel.Function, "delete", Route = "projects/{projectId}")]
    HttpRequestData req,
    string projectId)
        {
            if (!Guid.TryParse(projectId, out var pid))
                return await BadRequest(req, "Invalid ProjectId");

            var project = await _unitOfWork.Projects.GetByIdAsync(pid);
            if (project == null)
                return await BadRequest(req, "Project not found");

            var tasks = await _unitOfWork.Tasks.GetByProjectIdAsync(pid);
            foreach (var t in tasks)
            {
                var sub = await _unitOfWork.TaskSubmissions.GetByTaskIdAsync(t.TaskId);
                if (sub != null)
                    _unitOfWork.TaskSubmissions.Remove(sub);
                _unitOfWork.Tasks.Remove(t);
            }

            var milestones = await _unitOfWork.Milestones.GetByProjectIdAsync(pid);
            foreach (var m in milestones)
                _unitOfWork.Milestones.Remove(m);

            var perfs = await _unitOfWork.EmployeePerformances.GetByProjectIdAsync(pid);
            foreach (var p in perfs)
                _unitOfWork.EmployeePerformances.Remove(p);

            var pt = await _unitOfWork.ProjectTeams.GetByProjectIdAsync(pid);
            if (pt != null)
            {
                var teamId = pt.TeamId;
                var teamMembers = await _unitOfWork.TeamEmployees.GetEmployeesByTeamIdAsync(teamId);
                foreach (var m in teamMembers)
                    _unitOfWork.TeamEmployees.Remove(m);

                _unitOfWork.ProjectTeams.Remove(pt);

                var team = await _unitOfWork.Teams.GetByIdAsync(teamId);
                if (team != null)
                    _unitOfWork.Teams.Remove(team);
            }

            _unitOfWork.Projects.Remove(project);
            await _unitOfWork.CompleteAsync();

            var resp = req.CreateResponse(HttpStatusCode.OK);
            await resp.WriteAsJsonAsync(new { message = "Project deleted successfully" });
            return resp;
        }


        [Function("GetProjectsByManager")]
        public async Task<HttpResponseData> GetProjectsByManager(
    [HttpTrigger(AuthorizationLevel.Function, "get", Route = "projects/manager/{managerId}")]
    HttpRequestData req,
    string managerId)
        {
            if (!Guid.TryParse(managerId, out var mid))
                return await BadRequest(req, "Invalid ManagerId");

            var projects = await _unitOfWork.Projects.GetByManagerIdAsync(mid);

            var resp = req.CreateResponse(HttpStatusCode.OK);
            await resp.WriteAsJsonAsync(projects);
            return resp;
        }


        [Function("GetProjects")]
        public async Task<HttpResponseData> GetProjects(
            [HttpTrigger(AuthorizationLevel.Function, "get", Route = "projects")] HttpRequestData req)
        {
            var projects = await _unitOfWork.Projects.GetAllAsync();
            var resp = req.CreateResponse(HttpStatusCode.OK);
            await resp.WriteAsJsonAsync(projects);
            return resp;
        }


        [Function("CloseProject")]
        public async Task<HttpResponseData> CloseProject(
    [HttpTrigger(AuthorizationLevel.Function, "post", Route = "projects/{projectId}/close")] HttpRequestData req,
    string projectId)
        {
            if (!Guid.TryParse(projectId, out var pid))
                return await BadRequest(req, "Invalid ProjectId");

            string body = await new StreamReader(req.Body).ReadToEndAsync();
            var dto = JsonSerializer.Deserialize<CloseProjectDto>(body, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            if (dto == null) return await BadRequest(req, "Invalid data");

            var project = await _unitOfWork.Projects.GetByIdAsync(pid);
            if (project == null) return await BadRequest(req, "Project not found");

            if (project.IsClosed)
                return await BadRequest(req, "Project is already closed.");

            var projectTasks = await _unitOfWork.Tasks.GetByProjectIdAsync(pid);
            var hasActiveWork = projectTasks.Any(t =>
            {
                var n = TaskWorkflow.Normalize(t.Status);
                return n == TaskWorkflow.Todo || n == TaskWorkflow.InProgress;
            });
            if (hasActiveWork)
                return await BadRequest(req, "Cannot close project while tasks are still Todo or InProgress.");

            project.IsClosed = true;
            project.ClosedAt = DateTime.UtcNow;
            project.Status = "Completed";

            var pt = await _unitOfWork.ProjectTeams.GetByProjectIdAsync(pid);
            if (pt != null)
            {
                var members = await _unitOfWork.TeamEmployees.GetEmployeesByTeamIdAsync(pt.TeamId);
                foreach (var te in members)
                {
                    var profile = await _unitOfWork.UserProfiles.GetByUserIdAsync(te.EmployeeId);
                    if (profile != null)
                    {
                        profile.CompletedProjectsCount += 1;
                        profile.EmployeeLevel = EmployeeCareerService.ComputeLevel(profile.CompletedProjectsCount);
                        _unitOfWork.UserProfiles.Update(profile);
                    }
                }
            }

            await ProjectSkillsSyncService.SyncAssigneeSkillsOnProjectCloseAsync(_unitOfWork, pid);

            await TeamProjectGuards.ReleaseTeamFromProjectAsync(_unitOfWork, pid);

            _unitOfWork.Projects.Update(project);
            await _unitOfWork.CompleteAsync();

            var resp = req.CreateResponse(HttpStatusCode.OK);
            await resp.WriteAsJsonAsync(new { message = "Project closed successfully" });
            return resp;
        }

        [Function("GetProjectDashboard")]
        public async Task<HttpResponseData> GetProjectDashboard(
            [HttpTrigger(AuthorizationLevel.Function, "get", Route = "projects/{projectId}/dashboard")] HttpRequestData req,
            string projectId)
        {
            if (!Guid.TryParse(projectId, out var pid))
                return await BadRequest(req, "Invalid ProjectId");

            var project = await _unitOfWork.Projects.GetByIdAsync(pid);
            if (project == null) return await BadRequest(req, "Project not found");

            // Fetch the team assignment from the bridge table
            var teamAssignment = await _unitOfWork.ProjectTeams.GetByProjectIdAsync(pid);
            var tasks = await _unitOfWork.Tasks.GetByProjectIdAsync(pid);
            var milestones = await _unitOfWork.Milestones.GetByProjectIdAsync(pid);

            int completedCount = tasks.Count(t =>
                TaskWorkflow.Normalize(t.Status) == TaskWorkflow.Approved ||
                t.Status == "Completed");

            int completedMilestones = milestones.Count(m =>
                string.Equals(m.Status, "Completed", StringComparison.OrdinalIgnoreCase));

            var dashboard = new ProjectDashboardDto
            {
                ProjectId = pid,
                TeamId = teamAssignment?.TeamId,
                TotalTasks = tasks.Count,
                CompletedTasks = completedCount,
                PendingTasks = tasks.Count - completedCount,
                TotalMilestones = milestones.Count,
                CompletedMilestones = completedMilestones,
                ProgressPercentage = tasks.Count > 0
                    ? Math.Round((double)completedCount / tasks.Count * 100, 2)
                    : 0
            };

            var resp = req.CreateResponse(HttpStatusCode.OK);
            await resp.WriteAsJsonAsync(dashboard);
            return resp;
        }

        [Function("GetProjectClosureReport")]
        public async Task<HttpResponseData> GetClosureReport(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "projects/{projectId}/closure-report")] HttpRequestData req,
            string projectId)
        {
            if (!Guid.TryParse(projectId, out var pid))
                return await BadRequest(req, "Invalid ProjectId");

            var report = await _closureReports.BuildAsync(pid);
            if (report == null) return await BadRequest(req, "Project not found");

            var resp = req.CreateResponse(HttpStatusCode.OK);
            await resp.WriteAsJsonAsync(report);
            return resp;
        }

        [Function("GetProjectTimeline")]
        public async Task<HttpResponseData> GetTimeline(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "projects/{projectId}/timeline")] HttpRequestData req,
            string projectId)
        {
            if (!Guid.TryParse(projectId, out var pid))
                return await BadRequest(req, "Invalid ProjectId");

            try
            {
                var timeline = await _timeline.GetAsync(pid);
                if (timeline == null) return await BadRequest(req, "Project not found");

                var resp = req.CreateResponse(HttpStatusCode.OK);
                resp.Headers.Add("Content-Type", "application/json; charset=utf-8");
                await resp.WriteStringAsync(JsonSerializer.Serialize(timeline, _json));
                return resp;
            }
            catch (Exception ex)
            {
                var err = req.CreateResponse(HttpStatusCode.InternalServerError);
                await err.WriteAsJsonAsync(new { message = "Timeline failed", detail = ex.Message });
                return err;
            }
        }

        private async Task<HttpResponseData> BadRequest(HttpRequestData req, string message)
        {
            var resp = req.CreateResponse(HttpStatusCode.BadRequest);
            await resp.WriteAsJsonAsync(new { message });
            return resp;
        }

        [Function("GetProjectById")]
        public async Task<HttpResponseData> GetProjectById(
            [HttpTrigger(AuthorizationLevel.Function, "get", Route = "projects/{projectId}")] HttpRequestData req,
            string projectId)
        {
            if (!Guid.TryParse(projectId, out var id))
            {
                var badResp = req.CreateResponse(HttpStatusCode.BadRequest);
                await badResp.WriteAsJsonAsync(new { message = "Invalid ProjectId" });
                return badResp;
            }

            var project = await _unitOfWork.Projects.GetByIdAsync(id);
            if (project == null)
            {
                var notFoundResp = req.CreateResponse(HttpStatusCode.NotFound);
                await notFoundResp.WriteAsJsonAsync(new { message = "Project not found" });
                return notFoundResp;
            }
            var resp = req.CreateResponse(HttpStatusCode.OK);
            await resp.WriteAsJsonAsync(project);
            return resp;
        }


        [Function("UpdateProject")]
        public async Task<HttpResponseData> UpdateProject(
    [HttpTrigger(AuthorizationLevel.Function, "put", Route = "projects/{projectId}")] HttpRequestData req,
    string projectId)
        {
            if (!Guid.TryParse(projectId, out var pid))
                return await BadRequest(req, "Invalid ProjectId");

            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var dto = JsonSerializer.Deserialize<ProjectCreateDto>(body, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (dto == null) return await BadRequest(req, "Invalid data");

            var project = await _unitOfWork.Projects.GetByIdAsync(pid);
            if (project == null) return await BadRequest(req, "Project not found");

            if (project.IsClosed)
                return await BadRequest(req, "Project is closed and cannot be updated.");

            if (string.IsNullOrWhiteSpace(dto.Title))
                return await BadRequest(req, "Project title is required.");

            if (dto.Budget < 0)
                return await BadRequest(req, "Budget cannot be negative.");

            dto.Title = dto.Title.Trim();

            if (dto.Deadline != default && CalendarDate.IsBeforeUtcCalendarToday(dto.Deadline))
                return await BadRequest(req, "Deadline must be today or a future date.");

            if (!string.IsNullOrWhiteSpace(dto.Title) &&
                await _unitOfWork.Projects.ExistsByTitleAsync(dto.Title, pid))
                return await BadRequest(req, "Another project with this title already exists for this manager.");

            project.Title = dto.Title;
            project.Description = dto.Description;
            if (dto.Deadline != default)
                project.Deadline = dto.Deadline;
            project.Budget = dto.Budget;

            _unitOfWork.Projects.Update(project);
            await _unitOfWork.CompleteAsync();

            var resp = req.CreateResponse(HttpStatusCode.OK);
            await resp.WriteAsJsonAsync(new { message = "Project updated successfully", project });
            return resp;
        }


        [Function("GetProjectsByEmployee")]
        public async Task<HttpResponseData> GetProjectsByEmployee(
    [HttpTrigger(AuthorizationLevel.Function, "get", Route = "projects/employee/{userId}")] HttpRequestData req,
    string userId)
        {
            if (!Guid.TryParse(userId, out var uid))
                return await BadRequest(req, "Invalid UserId format");

            // This will now compile because it is defined in IProjectRepository
            var projects = await _unitOfWork.Projects.GetProjectsByUserIdAsync(uid);

            var resp = req.CreateResponse(HttpStatusCode.OK);
            await resp.WriteAsJsonAsync(projects);
            return resp;
        }
        [Function("GetTeamByProjectId")]
        public async Task<HttpResponseData> GetTeamByProjectId(
    [HttpTrigger(AuthorizationLevel.Function, "get", Route = "projects/{projectId}/team")] HttpRequestData req,
    string projectId)
        {
            if (!Guid.TryParse(projectId, out var pid))
                return await BadRequest(req, "Invalid ProjectId");

            // Get the team assignment from the bridge table
            var projectTeam = await _unitOfWork.ProjectTeams.GetByProjectIdAsync(pid);

            if (projectTeam == null)
                return await BadRequest(req, "No team assigned to this project");

            // Get the actual team details
            var team = await _unitOfWork.Teams.GetByIdAsync(projectTeam.TeamId);
            if (team == null)
                return await BadRequest(req, "Team not found");

            var resp = req.CreateResponse(HttpStatusCode.OK);
            await resp.WriteAsJsonAsync(new
            {
                TeamId = team.TeamId,
                Name = team.Name
            });

            return resp;
        }



    }
}
