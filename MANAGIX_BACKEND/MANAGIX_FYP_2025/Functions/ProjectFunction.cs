using MANAGIX.DataAccess.Repositories.IRepositories;
using MANAGIX.Models.DTO;
using MANAGIX.Models.Models;
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
        public ProjectFunction(IUnitOfWork unitOfWork) => _unitOfWork = unitOfWork;

        [Function("CreateProject")]
        public async Task<HttpResponseData> CreateProject(
            [HttpTrigger(AuthorizationLevel.Function, "post", Route = "projects")] HttpRequestData req)
        {
            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var dto = JsonSerializer.Deserialize<ProjectCreateDto>(body, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (dto == null || string.IsNullOrWhiteSpace(dto.Title))
            {
                var badResp = req.CreateResponse(HttpStatusCode.BadRequest);
                await badResp.WriteAsJsonAsync(new { message = "Invalid data" });
                return badResp;
            }

            var project = new Project
            {
                Title = dto.Title,
                Description = dto.Description,
                Deadline = dto.Deadline,
                Budget = dto.Budget,
                Status = "New",
                CreatedAt = DateTime.UtcNow,
                CreatedBy = Guid.NewGuid() // Replace with actual ManagerId
            };

            await _unitOfWork.Projects.AddAsync(project);
            await _unitOfWork.CompleteAsync();

            var resp = req.CreateResponse(HttpStatusCode.Created);
            await resp.WriteAsJsonAsync(project);
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
    }
}
