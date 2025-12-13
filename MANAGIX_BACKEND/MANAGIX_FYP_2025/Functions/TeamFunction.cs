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
    }
}
