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

            project.IsClosed = true;
            project.ClosedAt = DateTime.UtcNow;
            project.Status = "Completed";
            // Optional: store dto.Comment somewhere

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

            var tasks = await _unitOfWork.Tasks.GetByProjectIdAsync(pid);
            var milestones = await _unitOfWork.Milestones.GetByProjectIdAsync(pid);

            var dashboard = new ProjectDashboardDto
            {
                ProjectId = pid,
                TotalTasks = tasks.Count,
                CompletedTasks = tasks.Count(t => t.Status == "Done"),
                PendingTasks = tasks.Count(t => t.Status != "Done"),
                TotalMilestones = milestones.Count,
                CompletedMilestones = milestones.Count(m => m.Status == "Completed"),
                ProgressPercentage = tasks.Count > 0 ? Math.Round((double)tasks.Count(t => t.Status == "Done") / tasks.Count * 100, 2) : 0
            };

            var resp = req.CreateResponse(HttpStatusCode.OK);
            await resp.WriteAsJsonAsync(dashboard);
            return resp;
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
    }
}
