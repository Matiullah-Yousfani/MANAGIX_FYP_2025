using MANAGIX.DataAccess.Repositories.IRepositories;
using MANAGIX.Models.DTO;
using MANAGIX.Models.Models;
using MANAGIX.Utility;
using System.Linq;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Azure.Functions.Worker;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;

namespace MANAGIX_FYP_2025.Functions
{
    public class MilestoneFunction
    {
        private readonly IUnitOfWork _unitOfWork;

        public MilestoneFunction(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        // POST /milestones
        [Function("CreateMilestone")]
        public async Task<HttpResponseData> CreateMilestone(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "milestones")] HttpRequestData req)
        {
            try
            {
                string body = await new StreamReader(req.Body).ReadToEndAsync();
                var dto = JsonSerializer.Deserialize<MilestoneCreateDto>(body,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                if (dto == null || dto.ProjectId == Guid.Empty || string.IsNullOrWhiteSpace(dto.Title))
                {
                    var badResp = req.CreateResponse(HttpStatusCode.BadRequest);
                    await badResp.WriteAsJsonAsync(new { message = "Invalid data" });
                    return badResp;
                }

                var project = await _unitOfWork.Projects.GetByIdAsync(dto.ProjectId);
                if (project == null)
                {
                    var badResp = req.CreateResponse(HttpStatusCode.BadRequest);
                    await badResp.WriteAsJsonAsync(new { message = "Project not found." });
                    return badResp;
                }

                if (project.IsClosed)
                {
                    var badResp = req.CreateResponse(HttpStatusCode.BadRequest);
                    await badResp.WriteAsJsonAsync(new { message = "Cannot add milestones to a closed project." });
                    return badResp;
                }

                if (dto.BudgetAllocated < 0)
                {
                    var badResp = req.CreateResponse(HttpStatusCode.BadRequest);
                    await badResp.WriteAsJsonAsync(new { message = "Milestone budget cannot be negative." });
                    return badResp;
                }

                dto.Title = dto.Title.Trim();
                var existingForProject = await _unitOfWork.Milestones.GetByProjectIdAsync(dto.ProjectId);
                if (existingForProject.Any(m => string.Equals(m.Title, dto.Title, StringComparison.OrdinalIgnoreCase)))
                {
                    var conflict = req.CreateResponse(HttpStatusCode.Conflict);
                    await conflict.WriteAsJsonAsync(new { message = "A milestone with this title already exists for the project." });
                    return conflict;
                }

                if (CalendarDate.IsBeforeUtcCalendarToday(dto.Deadline))
                {
                    var badResp = req.CreateResponse(HttpStatusCode.BadRequest);
                    await badResp.WriteAsJsonAsync(new { message = "Milestone deadline must be today or a future date." });
                    return badResp;
                }

                if (CalendarDate.IsAfterCalendarDate(dto.Deadline, project.Deadline))
                {
                    var badResp = req.CreateResponse(HttpStatusCode.BadRequest);
                    await badResp.WriteAsJsonAsync(new { message = "Milestone deadline cannot be after the project deadline." });
                    return badResp;
                }

                var milestone = new Milestone
                {
                    ProjectId = dto.ProjectId,
                    Title = dto.Title,
                    Description = dto.Description,
                    Deadline = dto.Deadline,
                    BudgetAllocated = dto.BudgetAllocated,
                    Status = "Pending"
                };

                await _unitOfWork.Milestones.AddAsync(milestone);
                await _unitOfWork.CompleteAsync();

                var resp = req.CreateResponse(HttpStatusCode.Created);
                await resp.WriteAsJsonAsync(milestone);
                return resp;
            }
            catch (Exception ex)
            {
                var err = req.CreateResponse(HttpStatusCode.InternalServerError);
                await err.WriteAsJsonAsync(new { message = "Server error", detail = ex.Message });
                return err;
            }
        }

        [Function("GetMilestoneById")]
        public async Task<HttpResponseData> GetMilestoneById(
    [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "milestones/{milestoneId}")]
    HttpRequestData req,
    string milestoneId)
        {
            if (!Guid.TryParse(milestoneId, out var mid))
                return await BadRequest(req, "Invalid Milestone ID");

            var milestone = await _unitOfWork.Milestones.GetByIdAsync(mid);
            if (milestone == null)
                return await BadRequest(req, "Milestone not found");

            var resp = req.CreateResponse(HttpStatusCode.OK);
            await resp.WriteAsJsonAsync(milestone);
            return resp;
        }


        [Function("UpdateMilestone")]
        public async Task<HttpResponseData> UpdateMilestone(
    [HttpTrigger(AuthorizationLevel.Anonymous, "put", Route = "milestones/{milestoneId}")]
    HttpRequestData req,
    string milestoneId)
        {
            if (!Guid.TryParse(milestoneId, out var mid))
                return await BadRequest(req, "Invalid Milestone ID");

            string body = await new StreamReader(req.Body).ReadToEndAsync();
            var dto = JsonSerializer.Deserialize<MilestoneUpdateDto>(body,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            if (dto == null)
                return await BadRequest(req, "Invalid data");

            var milestone = await _unitOfWork.Milestones.GetByIdAsync(mid);
            if (milestone == null)
                return await BadRequest(req, "Milestone not found");

            var proj = await _unitOfWork.Projects.GetByIdAsync(milestone.ProjectId);
            if (proj != null && proj.IsClosed)
                return await BadRequest(req, "Cannot update milestone: project is closed.");

            if (string.IsNullOrWhiteSpace(dto.Title))
                return await BadRequest(req, "Milestone title is required.");

            if (dto.BudgetAllocated < 0)
                return await BadRequest(req, "Milestone budget cannot be negative.");

            var trimmedTitle = dto.Title.Trim();
            var siblings = await _unitOfWork.Milestones.GetByProjectIdAsync(milestone.ProjectId);
            if (siblings.Any(m => m.MilestoneId != mid && string.Equals(m.Title, trimmedTitle, StringComparison.OrdinalIgnoreCase)))
                return await BadRequest(req, "Another milestone with this title already exists for the project.");

            if (dto.Deadline != default && CalendarDate.IsBeforeUtcCalendarToday(dto.Deadline))
                return await BadRequest(req, "Milestone deadline must be today or a future date.");

            if (proj != null && dto.Deadline != default && CalendarDate.IsAfterCalendarDate(dto.Deadline, proj.Deadline))
                return await BadRequest(req, "Milestone deadline cannot be after the project deadline.");

            milestone.Title = trimmedTitle;
            milestone.Description = dto.Description;
            if (dto.Deadline != default)
                milestone.Deadline = dto.Deadline;
            milestone.BudgetAllocated = dto.BudgetAllocated;
            milestone.Status = dto.Status;

            _unitOfWork.Milestones.Update(milestone);
            await _unitOfWork.CompleteAsync();

            var resp = req.CreateResponse(HttpStatusCode.OK);
            await resp.WriteAsJsonAsync(milestone);
            return resp;
        }

        [Function("DeleteMilestone")]
        public async Task<HttpResponseData> DeleteMilestone(
    [HttpTrigger(AuthorizationLevel.Anonymous, "delete", Route = "milestones/{milestoneId}")]
    HttpRequestData req,
    string milestoneId)
        {
            if (!Guid.TryParse(milestoneId, out var mid))
                return await BadRequest(req, "Invalid Milestone ID");

            var milestone = await _unitOfWork.Milestones.GetByIdAsync(mid);
            if (milestone == null)
                return await BadRequest(req, "Milestone not found");

            var tasks = await _unitOfWork.Tasks.GetByMilestoneIdAsync(mid);
            if (tasks != null && tasks.Count > 0)
                return await BadRequest(req, "Remove or reassign all tasks under this milestone before deleting it.");

            _unitOfWork.Milestones.Remove(milestone);
            await _unitOfWork.CompleteAsync();

            var resp = req.CreateResponse(HttpStatusCode.OK);
            await resp.WriteAsJsonAsync(new { message = "Milestone deleted successfully" });
            return resp;
        }

        private async Task<HttpResponseData> BadRequest(HttpRequestData req, string message)
        {
            var resp = req.CreateResponse(HttpStatusCode.BadRequest);
            await resp.WriteAsJsonAsync(new { message });
            return resp;
        }

        [Function("CloseMilestone")]
        public async Task<HttpResponseData> CloseMilestone(
    [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "milestones/{milestoneId}/close")] HttpRequestData req,
    string milestoneId)
        {
            if (!Guid.TryParse(milestoneId, out var mid))
                return await BadRequest(req, "Invalid MilestoneId");

            string body = await new StreamReader(req.Body).ReadToEndAsync();
            var dto = JsonSerializer.Deserialize<CloseMilestoneDto>(body, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            if (dto == null) return await BadRequest(req, "Invalid data");

            var milestone = await _unitOfWork.Milestones.GetByIdAsync(mid);
            if (milestone == null) return await BadRequest(req, "Milestone not found");

            var p = await _unitOfWork.Projects.GetByIdAsync(milestone.ProjectId);
            if (p != null && p.IsClosed)
                return await BadRequest(req, "Cannot close milestone: project is closed.");

            if (string.Equals(milestone.Status, "Completed", StringComparison.OrdinalIgnoreCase))
                return await BadRequest(req, "Milestone is already completed.");

            var mTasks = await _unitOfWork.Tasks.GetByMilestoneIdAsync(mid);
            if (mTasks != null && mTasks.Count > 0)
            {
                var incomplete = mTasks.Where(t =>
                {
                    var n = TaskWorkflow.Normalize(t.Status);
                    return n != TaskWorkflow.Approved && n != TaskWorkflow.Done;
                }).ToList();
                if (incomplete.Count > 0)
                    return await BadRequest(req,
                        $"Cannot complete milestone: {incomplete.Count} task(s) are not finished (must be Done or Approved).");
            }

            milestone.Status = "Completed";
            milestone.CompletedAt = DateTime.UtcNow;
            // Optional: store comment somewhere if needed

            _unitOfWork.Milestones.Update(milestone);
            await _unitOfWork.CompleteAsync();

            var resp = req.CreateResponse(HttpStatusCode.OK);
            await resp.WriteAsJsonAsync(new { message = "Milestone closed successfully" });
            return resp;
        }


        // GET /milestones/project/{projectId}
        [Function("GetMilestonesByProject")]
        public async Task<HttpResponseData> GetMilestonesByProject(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "milestones/project/{projectId}")] HttpRequestData req,
            string projectId)
        {
            if (!Guid.TryParse(projectId, out Guid projId))
            {
                var badResp = req.CreateResponse(HttpStatusCode.BadRequest);
                await badResp.WriteAsJsonAsync(new { message = "Invalid Project ID" });
                return badResp;
            }

            var milestones = await _unitOfWork.Milestones.GetByProjectIdAsync(projId);
            var resp = req.CreateResponse(HttpStatusCode.OK);
            await resp.WriteAsJsonAsync(milestones);
            return resp;
        }
    }
}
