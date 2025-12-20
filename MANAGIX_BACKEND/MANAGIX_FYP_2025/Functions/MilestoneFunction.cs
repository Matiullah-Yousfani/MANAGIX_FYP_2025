using MANAGIX.DataAccess.Repositories.IRepositories;
using MANAGIX.Models.DTO;
using MANAGIX.Models.Models;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Azure.Functions.Worker;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Text;
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
            [HttpTrigger(AuthorizationLevel.Function, "post", Route = "milestones")] HttpRequestData req)
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
        private async Task<HttpResponseData> BadRequest(HttpRequestData req, string message)
        {
            var resp = req.CreateResponse(HttpStatusCode.BadRequest);
            await resp.WriteAsJsonAsync(new { message });
            return resp;
        }

        [Function("CloseMilestone")]
        public async Task<HttpResponseData> CloseMilestone(
    [HttpTrigger(AuthorizationLevel.Function, "post", Route = "milestones/{milestoneId}/close")] HttpRequestData req,
    string milestoneId)
        {
            if (!Guid.TryParse(milestoneId, out var mid))
                return await BadRequest(req, "Invalid MilestoneId");

            string body = await new StreamReader(req.Body).ReadToEndAsync();
            var dto = JsonSerializer.Deserialize<CloseMilestoneDto>(body, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            if (dto == null) return await BadRequest(req, "Invalid data");

            var milestone = await _unitOfWork.Milestones.GetByIdAsync(mid);
            if (milestone == null) return await BadRequest(req, "Milestone not found");

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
            [HttpTrigger(AuthorizationLevel.Function, "get", Route = "milestones/project/{projectId}")] HttpRequestData req,
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
