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
using Azure;
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

            var team = new Team { Name = dto.Name, CreatedBy = Guid.NewGuid(), CreatedAt = DateTime.UtcNow };
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

            var team = await _unitOfWork.Teams.GetByIdAsync(dto.TeamId);
            if (team == null)
            {
                var notFound = req.CreateResponse(HttpStatusCode.NotFound);
                await notFound.WriteAsJsonAsync(new { message = "Team not found" });
                return notFound;
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

            try
            {
                var projectTeam = new ProjectTeam
                {
                    ProjectId = pid,
                    TeamId = dto.TeamId
                };

                await _unitOfWork.ProjectTeams.AddAsync(projectTeam);
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

            var teamEmployee = new TeamEmployee { TeamId = tid, EmployeeId = dto.EmployeeId };
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

            /* --- MINIMAL CHANGE START: Resolve Project Titles for each team --- */
            var resultList = new List<object>();

            foreach (var t in teams)
            {
                // Use the existing GetByProjectIdAsync check logic to find assignments
                // We look for any project where this team is assigned
                var projectForTeam = allProjects.FirstOrDefault(p => {
                    var assignment = _unitOfWork.ProjectTeams.GetByProjectIdAsync(p.ProjectId).Result;
                    return assignment?.TeamId == t.TeamId;
                });

                resultList.Add(new
                {
                    t.TeamId,
                    t.Name,
                    t.CreatedAt,
                    t.CreatedBy,
                    ProjectTitle = projectForTeam?.Title ?? "N/A - Unassigned"
                });
            }
            /* --- MINIMAL CHANGE END --- */

            var resp = req.CreateResponse(HttpStatusCode.OK);
            await resp.WriteAsJsonAsync(resultList);
            return resp;
        }
        private async Task<HttpResponseData> BadRequest(HttpRequestData req, string message)
        {
            var resp = req.CreateResponse(HttpStatusCode.BadRequest);
            await resp.WriteAsJsonAsync(new { message });
            return resp;
        }

    }
}
