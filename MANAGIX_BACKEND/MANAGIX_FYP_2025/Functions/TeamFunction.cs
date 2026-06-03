using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using MANAGIX.DataAccess.Repositories.IRepositories;
using MANAGIX.Models.Models;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using System.Threading.Tasks;
using System.Net;
using System.IO;
using System.Text.Json;
using MANAGIX.Models.DTO;
using MANAGIX.Services;
using Microsoft.EntityFrameworkCore;

namespace MANAGIX_FYP_2025.Functions
{
    public class TeamFunction
    {
        private readonly IUnitOfWork _unitOfWork;
        public TeamFunction(IUnitOfWork unitOfWork) => _unitOfWork = unitOfWork;

        [Function("CreateTeam")]
        public async Task<HttpResponseData> CreateTeam(
            [HttpTrigger(AuthorizationLevel.Function, "post", Route = "teams")] HttpRequestData req)
        {
            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var dto = JsonSerializer.Deserialize<TeamCreateDto>(body, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            if (dto == null || string.IsNullOrWhiteSpace(dto.Name))
            {
                var badResp = req.CreateResponse(HttpStatusCode.BadRequest);
                await badResp.WriteAsJsonAsync(new { message = "Invalid data" });
                return badResp;
            }

            dto.Name = dto.Name.Trim();

            if (dto.CreatedBy == Guid.Empty)
            {
                var badResp = req.CreateResponse(HttpStatusCode.BadRequest);
                await badResp.WriteAsJsonAsync(new { message = "CreatedBy (manager id) is required." });
                return badResp;
            }

            var creator = await _unitOfWork.Users.GetByIdAsync(dto.CreatedBy);
            if (creator == null)
            {
                var badResp = req.CreateResponse(HttpStatusCode.BadRequest);
                await badResp.WriteAsJsonAsync(new { message = "Creating user not found." });
                return badResp;
            }

            var creatorOk = creator.UserRoles?.Any(ur =>
                ur.Role != null &&
                (string.Equals(ur.Role.RoleName, "Manager", StringComparison.OrdinalIgnoreCase) ||
                 string.Equals(ur.Role.RoleName, "Admin", StringComparison.OrdinalIgnoreCase))) == true;
            if (!creatorOk)
            {
                var badResp = req.CreateResponse(HttpStatusCode.BadRequest);
                await badResp.WriteAsJsonAsync(new { message = "Teams can only be created by a Manager or Admin." });
                return badResp;
            }

            var allTeams = await _unitOfWork.Teams.GetAllAsync();
            if (allTeams.Any(t => t.CreatedBy == dto.CreatedBy &&
                                   string.Equals(t.Name, dto.Name, StringComparison.OrdinalIgnoreCase)))
            {
                var conflict = req.CreateResponse(HttpStatusCode.Conflict);
                await conflict.WriteAsJsonAsync(new { message = "You already have a team with this name." });
                return conflict;
            }

            var team = new Team { Name = dto.Name, CreatedBy = dto.CreatedBy, CreatedAt = DateTime.UtcNow };
            await _unitOfWork.Teams.AddAsync(team);
            await _unitOfWork.CompleteAsync();

            var resp = req.CreateResponse(HttpStatusCode.Created);
            await resp.WriteAsJsonAsync(team);
            return resp;
        }
        [Function("AssignTeamToProject")]
        public async Task<HttpResponseData> AssignTeamToProject(
            [HttpTrigger(AuthorizationLevel.Function, "post", Route = "projects/{projectId}/assign-team")] HttpRequestData req,
            string projectId)
        {
            if (!Guid.TryParse(projectId, out var pid))
            {
                var badResp = req.CreateResponse(HttpStatusCode.BadRequest);
                await badResp.WriteAsJsonAsync(new { message = "Invalid ProjectId" });
                return badResp;
            }

            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var dto = JsonSerializer.Deserialize<AssignTeamDto>(body, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (dto == null || dto.TeamId == Guid.Empty)
            {
                var badResp = req.CreateResponse(HttpStatusCode.BadRequest);
                await badResp.WriteAsJsonAsync(new { message = "Invalid TeamId" });
                return badResp;
            }

            var project = await _unitOfWork.Projects.GetByIdAsync(pid);
            if (project == null)
            {
                var notFound = req.CreateResponse(HttpStatusCode.NotFound);
                await notFound.WriteAsJsonAsync(new { message = "Project not found" });
                return notFound;
            }

            if (project.IsClosed)
            {
                var closed = req.CreateResponse(HttpStatusCode.BadRequest);
                await closed.WriteAsJsonAsync(new { message = "Cannot assign a team to a closed project." });
                return closed;
            }

            var team = await _unitOfWork.Teams.GetByIdAsync(dto.TeamId);
            if (team == null)
            {
                var notFound = req.CreateResponse(HttpStatusCode.NotFound);
                await notFound.WriteAsJsonAsync(new { message = "Team not found" });
                return notFound;
            }

            var teamAlreadyBound = await _unitOfWork.ProjectTeams.GetByTeamIdAsync(dto.TeamId);
            if (teamAlreadyBound != null && teamAlreadyBound.ProjectId != pid)
            {
                var conflictTeam = req.CreateResponse(HttpStatusCode.Conflict);
                await conflictTeam.WriteAsJsonAsync(new { message = "Team is already assigned to another project." });
                return conflictTeam;
            }

            // Logical duplicate check
            var existingAssignment = await _unitOfWork.ProjectTeams.GetByProjectIdAsync(pid);
            if (existingAssignment != null)
            {
                var assignedTeam = await _unitOfWork.Teams.GetByIdAsync(existingAssignment.TeamId);

                var conflictResp = req.CreateResponse(HttpStatusCode.Conflict);
                await conflictResp.WriteAsJsonAsync(new
                {
                    message = "Project already assigned",
                    teamName = assignedTeam?.Name
                });
                return conflictResp;
            }

            var composition = await TeamCompositionValidator.ValidateEmployeeAndQaAsync(_unitOfWork, dto.TeamId);
            if (!composition.Ok)
            {
                var badComposition = req.CreateResponse(HttpStatusCode.BadRequest);
                await badComposition.WriteAsJsonAsync(new { message = composition.Message });
                return badComposition;
            }

            try
            {
                var projectTeam = new ProjectTeam
                {
                    ProjectId = pid,
                    TeamId = dto.TeamId
                };

                await _unitOfWork.ProjectTeams.AddAsync(projectTeam);
                await TeamProjectGuards.ActivateTeamForProjectAsync(_unitOfWork, dto.TeamId, pid);
                await _unitOfWork.CompleteAsync();
            }
            catch (DbUpdateException)
            {
                // Database safety net
                var existing = await _unitOfWork.ProjectTeams.GetByProjectIdAsync(pid);
                var assignedTeam = existing != null
                    ? await _unitOfWork.Teams.GetByIdAsync(existing.TeamId)
                    : null;

                var conflictResp = req.CreateResponse(HttpStatusCode.Conflict);
                await conflictResp.WriteAsJsonAsync(new
                {
                    message = "Project already assigned",
                    teamName = assignedTeam?.Name
                });
                return conflictResp;
            }

            var resp = req.CreateResponse(HttpStatusCode.OK);
            await resp.WriteAsJsonAsync(new { message = "Team assigned to project" });
            return resp;
        }




        [Function("AddEmployeeToTeam")]
        public async Task<HttpResponseData> AddEmployeeToTeam(
            [HttpTrigger(AuthorizationLevel.Function, "post", Route = "teams/{teamId}/add-employee")] HttpRequestData req,
            string teamId)
        {
            if (!Guid.TryParse(teamId, out var tid))
            {
                var badResp = req.CreateResponse(HttpStatusCode.BadRequest);
                await badResp.WriteAsJsonAsync(new { message = "Invalid TeamId" });
                return badResp;
            }

            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var dto = JsonSerializer.Deserialize<AddEmployeeToTeamDto>(body, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            if (dto == null || dto.EmployeeId == Guid.Empty)
            {
                var badResp = req.CreateResponse(HttpStatusCode.BadRequest);
                await badResp.WriteAsJsonAsync(new { message = "Invalid EmployeeId" });
                return badResp;
            }

            var employeeUser = await _unitOfWork.Users.GetByIdAsync(dto.EmployeeId);
            if (employeeUser == null)
            {
                var badResp = req.CreateResponse(HttpStatusCode.BadRequest);
                await badResp.WriteAsJsonAsync(new { message = "Employee user not found." });
                return badResp;
            }

            if (await _unitOfWork.TeamEmployees.ExistsAsync(tid, dto.EmployeeId))
            {
                var conflict = req.CreateResponse(HttpStatusCode.Conflict);
                await conflict.WriteAsJsonAsync(new { message = "Employee is already on this team." });
                return conflict;
            }

            var blockReason = await TeamProjectGuards.GetActiveAssignmentBlockReasonAsync(_unitOfWork, dto.EmployeeId, tid);
            if (blockReason != null)
            {
                var conflict = req.CreateResponse(HttpStatusCode.Conflict);
                await conflict.WriteAsJsonAsync(new { message = blockReason });
                return conflict;
            }

            var teamAssignmentForThisTeam = await _unitOfWork.ProjectTeams.GetByTeamIdAsync(tid);
            if (teamAssignmentForThisTeam != null)
            {
                var assignedToProject = await _unitOfWork.ProjectTeams.GetByProjectIdAsync(teamAssignmentForThisTeam.ProjectId);
                if (assignedToProject != null && assignedToProject.TeamId != tid)
                {
                    var memberOfAssigned = await _unitOfWork.TeamEmployees.ExistsAsync(assignedToProject.TeamId, dto.EmployeeId);
                    if (memberOfAssigned)
                    {
                        var conflict = req.CreateResponse(HttpStatusCode.Conflict);
                        await conflict.WriteAsJsonAsync(new
                        {
                            message = "Employee already belongs to another team on this project."
                        });
                        return conflict;
                    }
                }
            }

            var teamEmployee = new TeamEmployee
            {
                TeamId = tid,
                EmployeeId = dto.EmployeeId,
                IsActive = teamAssignmentForThisTeam != null,
                ProjectId = teamAssignmentForThisTeam?.ProjectId,
                CreatedAt = DateTime.UtcNow,
            };
            await _unitOfWork.TeamEmployees.AddAsync(teamEmployee);
            await _unitOfWork.CompleteAsync();

            var resp = req.CreateResponse(HttpStatusCode.OK);
            await resp.WriteAsJsonAsync(new { message = "Employee added to team" });
            return resp;
        }

        [Function("RemoveEmployeeFromTeam")]
        public async Task<HttpResponseData> RemoveEmployeeFromTeam(
    [HttpTrigger(AuthorizationLevel.Function, "delete", Route = "teams/{teamId}/remove-employee")]
    HttpRequestData req,
    string teamId)
        {
            if (!Guid.TryParse(teamId, out var tid))
                return await BadRequest(req, "Invalid TeamId");

            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var dto = JsonSerializer.Deserialize<RemoveEmployeeDto>(body,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            if (dto == null || dto.EmployeeId == Guid.Empty)
                return await BadRequest(req, "Invalid EmployeeId");

            var teamEmployee = await _unitOfWork.TeamEmployees.GetAsync(tid, dto.EmployeeId);
            if (teamEmployee == null)
                return await BadRequest(req, "Employee not in team");

            var pt = await _unitOfWork.ProjectTeams.GetByTeamIdAsync(tid);
            if (pt != null)
            {
                var projectTasks = await _unitOfWork.Tasks.GetByProjectIdAsync(pt.ProjectId);
                if (projectTasks.Any(t => t.AssignedEmployeeId == dto.EmployeeId))
                {
                    var conflict = req.CreateResponse(HttpStatusCode.Conflict);
                    await conflict.WriteAsJsonAsync(new
                    {
                        message = "Cannot remove employee: they have tasks assigned on this project."
                    });
                    return conflict;
                }
            }

            _unitOfWork.TeamEmployees.Remove(teamEmployee);
            await _unitOfWork.CompleteAsync();

            var resp = req.CreateResponse(HttpStatusCode.OK);
            await resp.WriteAsJsonAsync(new { message = "Employee removed from team" });
            return resp;
        }

        [Function("GetTeamDetails")]
        public async Task<HttpResponseData> GetTeamDetails(
    [HttpTrigger(AuthorizationLevel.Function, "get", Route = "teams/{teamId}")]
    HttpRequestData req,
    string teamId)
        {
            if (!Guid.TryParse(teamId, out var tid))
                return await BadRequest(req, "Invalid TeamId");

            var team = await _unitOfWork.Teams.GetByIdAsync(tid);
            if (team == null)
                return await BadRequest(req, "Team not found");

            var employees = await _unitOfWork.TeamEmployees.GetEmployeesByTeamIdAsync(tid);

            var resp = req.CreateResponse(HttpStatusCode.OK);
            await resp.WriteAsJsonAsync(new
            {
                team.TeamId,
                team.Name,
                team.CreatedAt,
                Employees = employees.Select(e => e.EmployeeId)
            });
            return resp;
        }

        [Function("GetTeamMembers")]
        public async Task<HttpResponseData> GetTeamMembers(
            [HttpTrigger(AuthorizationLevel.Function, "get", Route = "teams/{teamId}/members")] HttpRequestData req,
            string teamId)
        {
            if (!Guid.TryParse(teamId, out var tid))
                return await BadRequest(req, "Invalid TeamId");

            // 1. Get the list of all Employee mappings for this team
            var teamEmployeeMappings = await _unitOfWork.TeamEmployees.GetEmployeesByTeamIdAsync(tid);

            // 2. Extract just the Guids (EmployeeId/UserId)
            var employeeIds = teamEmployeeMappings.Select(te => te.EmployeeId).ToList();

            // 3. Fetch all users and filter for those whose ID is in our list
            var allUsers = await _unitOfWork.Users.GetAllAsync();
            var members = allUsers
                .Where(u => employeeIds.Contains(u.UserId))
                .Select(u => new {
                    u.UserId,
                    u.FullName,
                    u.Email
                }).ToList();

            var resp = req.CreateResponse(HttpStatusCode.OK);
            await resp.WriteAsJsonAsync(members);
            return resp;
        }

        [Function("GetAllTeams")]
        public async Task<HttpResponseData> GetAllTeams(
    [HttpTrigger(AuthorizationLevel.Function, "get", Route = "teams")] HttpRequestData req)
        {
            var teams = await _unitOfWork.Teams.GetAllAsync();
            var allProjects = await _unitOfWork.Projects.GetAllAsync();
            var assignments = await _unitOfWork.ProjectTeams.GetAllAssignmentsAsync();

            Guid? managerFilter = null;
            var managerRaw = req.Query["managerId"];
            if (!string.IsNullOrWhiteSpace(managerRaw) && Guid.TryParse(managerRaw, out var mid))
                managerFilter = mid;

            HashSet<Guid>? managerProjectIds = null;
            if (managerFilter.HasValue)
            {
                var mgrProjects = await _unitOfWork.Projects.GetByManagerIdAsync(managerFilter.Value);
                managerProjectIds = mgrProjects.Select(p => p.ProjectId).ToHashSet();
                teams = teams.Where(t => t.CreatedBy == managerFilter.Value).ToList();
            }

            var resultList = new List<object>();

            foreach (var t in teams)
            {
                var assignment = assignments.FirstOrDefault(a => a.TeamId == t.TeamId);
                if (managerFilter.HasValue && assignment != null && managerProjectIds != null &&
                    !managerProjectIds.Contains(assignment.ProjectId))
                    continue;

                var projectForTeam = assignment != null
                    ? allProjects.FirstOrDefault(p => p.ProjectId == assignment.ProjectId)
                    : null;

                var memberCount = (await _unitOfWork.TeamEmployees.GetEmployeesByTeamIdAsync(t.TeamId)).Count;

                resultList.Add(new
                {
                    t.TeamId,
                    t.Name,
                    t.CreatedAt,
                    t.CreatedBy,
                    projectId = assignment?.ProjectId,
                    ProjectTitle = projectForTeam?.Title ?? "N/A - Unassigned",
                    memberCount,
                });
            }

            var resp = req.CreateResponse(HttpStatusCode.OK);
            await resp.WriteAsJsonAsync(resultList);
            return resp;
        }

        [Function("DeleteTeam")]
        public async Task<HttpResponseData> DeleteTeam(
            [HttpTrigger(AuthorizationLevel.Function, "delete", Route = "teams/{teamId}")] HttpRequestData req,
            string teamId)
        {
            if (!Guid.TryParse(teamId, out var tid))
                return await BadRequest(req, "Invalid TeamId");

            var team = await _unitOfWork.Teams.GetByIdAsync(tid);
            if (team == null)
                return await BadRequest(req, "Team not found");

            var mappings = await _unitOfWork.TeamEmployees.GetEmployeesByTeamIdAsync(tid);
            if (mappings.Count > 0)
            {
                var assigned = await _unitOfWork.ProjectTeams.GetByTeamIdAsync(tid);
                if (assigned != null)
                {
                    var projectTasks = await _unitOfWork.Tasks.GetByProjectIdAsync(assigned.ProjectId);
                    var memberIds = mappings.Select(m => m.EmployeeId).ToHashSet();
                    if (projectTasks.Any(t => t.AssignedEmployeeId.HasValue && memberIds.Contains(t.AssignedEmployeeId.Value)))
                    {
                        var block = req.CreateResponse(HttpStatusCode.Conflict);
                        await block.WriteAsJsonAsync(new
                        {
                            message = "Cannot delete team: members still have tasks on the assigned project. Unassign tasks first."
                        });
                        return block;
                    }
                }

                var conflict = req.CreateResponse(HttpStatusCode.Conflict);
                await conflict.WriteAsJsonAsync(new
                {
                    message = "Remove all team members before deleting this team."
                });
                return conflict;
            }

            var projectLink = await _unitOfWork.ProjectTeams.GetByTeamIdAsync(tid);
            if (projectLink != null)
                await TeamProjectGuards.ReleaseTeamFromProjectAsync(_unitOfWork, projectLink.ProjectId);

            _unitOfWork.Teams.Remove(team);
            await _unitOfWork.CompleteAsync();

            var ok = req.CreateResponse(HttpStatusCode.OK);
            await ok.WriteAsJsonAsync(new
            {
                message = projectLink != null
                    ? "Team deleted. The project is available for assignment again."
                    : "Team deleted successfully."
            });
            return ok;
        }
        private async Task<HttpResponseData> BadRequest(HttpRequestData req, string message)
        {
            var resp = req.CreateResponse(HttpStatusCode.BadRequest);
            await resp.WriteAsJsonAsync(new { message });
            return resp;
        }

    }
}
