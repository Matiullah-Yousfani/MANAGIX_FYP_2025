using MANAGIX.DataAccess.Repositories.IRepositories;
using MANAGIX.Services;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using System;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;

namespace MANAGIX_FYP_2025.Functions
{
    public class EmployeePerformanceFunction
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IEmployeePerformanceService _performance;
        private static readonly JsonSerializerOptions _json = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            PropertyNameCaseInsensitive = true,
        };

        public EmployeePerformanceFunction(IUnitOfWork unitOfWork, IEmployeePerformanceService performance)
        {
            _unitOfWork = unitOfWork;
            _performance = performance;
        }

        [Function("RecalculateProjectPerformance")]
        public async Task<HttpResponseData> Recalculate(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "performance/recalculate/{projectId}")] HttpRequestData req,
            string projectId)
        {
            if (!Guid.TryParse(projectId, out var pid))
                return await BadRequest(req, "Invalid ProjectId");

            try
            {
                await _performance.RecalculateProjectAsync(pid);
                var resp = req.CreateResponse(HttpStatusCode.OK);
                await resp.WriteAsJsonAsync(new { message = "Scores updated successfully" });
                return resp;
            }
            catch (InvalidOperationException ex)
            {
                return await BadRequest(req, ex.Message);
            }
        }

        [Function("GetProjectEmployeePerformance")]
        public async Task<HttpResponseData> GetPerformanceByProject(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "performance/project/{projectId}")] HttpRequestData req,
            string projectId)
        {
            if (!Guid.TryParse(projectId, out var pid))
                return await BadRequest(req, "Invalid ProjectId");

            try
            {
                await _performance.RecalculateProjectAsync(pid);
            }
            catch (InvalidOperationException)
            {
                /* no team yet — return empty */
            }

            var performances = await _unitOfWork.EmployeePerformances.GetByProjectIdAsync(pid)
                               ?? new System.Collections.Generic.List<MANAGIX.Models.Models.EmployeePerformance>();

            var lines = new System.Collections.Generic.List<object>();
            foreach (var perf in performances)
            {
                var user = await _unitOfWork.Users.GetByIdAsync(perf.EmployeeId);
                lines.Add(new
                {
                    employeeId = perf.EmployeeId,
                    projectId = perf.ProjectId,
                    employeeName = user?.FullName ?? "Unknown",
                    tasksAssigned = perf.TasksAssigned,
                    tasksCompleted = perf.TasksCompleted,
                    approvalRate = Math.Round(perf.ApprovalRate * 100, 1),
                });
            }

            var resp = req.CreateResponse(HttpStatusCode.OK);
            resp.Headers.Add("Content-Type", "application/json");
            await resp.WriteStringAsync(JsonSerializer.Serialize(lines, _json));
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
