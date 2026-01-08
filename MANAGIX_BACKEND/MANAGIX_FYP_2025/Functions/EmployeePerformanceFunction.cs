using MANAGIX.DataAccess.Repositories.IRepositories;
using MANAGIX.Models.Models;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Azure.Functions.Worker;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Text;
using System.Threading.Tasks;

namespace MANAGIX_FYP_2025.Functions
{
    public class EmployeePerformanceFunction
    {
        private readonly IUnitOfWork _unitOfWork;

        public EmployeePerformanceFunction(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }
        [Function("RecalculateProjectPerformance")]
        public async Task<HttpResponseData> Recalculate(
            [HttpTrigger(AuthorizationLevel.Function, "post", Route = "performance/recalculate/{projectId}")] HttpRequestData req,
            string projectId)
        {
            if (!Guid.TryParse(projectId, out var pid))
                return await BadRequest(req, "Invalid ProjectId");

            // MINIMAL CHANGE: Verify the team assignment exists in the bridge table
            var assignment = await _unitOfWork.ProjectTeams.GetByProjectIdAsync(pid);
            if (assignment == null)
            {
                // This prevents the frontend from getting a generic error and showing the alert
                var errorResp = req.CreateResponse(HttpStatusCode.BadRequest);
                await errorResp.WriteAsJsonAsync(new { message = "No team assigned to this project yet." });
                return errorResp;
            }

            // ... existing calculation logic continues here ...

            var resp = req.CreateResponse(HttpStatusCode.OK);
            await resp.WriteAsJsonAsync(new { message = "Scores updated successfully" });
            return resp;
        }

        [Function("GetProjectEmployeePerformance")]
        public async Task<HttpResponseData> GetPerformanceByProject(
            [HttpTrigger(AuthorizationLevel.Function, "get", Route = "performance/project/{projectId}")] HttpRequestData req,
            string projectId)
        {
            if (!Guid.TryParse(projectId, out var pid))
                return await BadRequest(req, "Invalid ProjectId");

            // Return an empty list if null to prevent frontend .map() crashes
            var performances = await _unitOfWork.EmployeePerformances.GetByProjectIdAsync(pid)
                               ?? new List<EmployeePerformance>();

            var resp = req.CreateResponse(HttpStatusCode.OK);
            await resp.WriteAsJsonAsync(performances);
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
