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

        [Function("GenerateEmployeePerformance")]
        public async Task<HttpResponseData> GeneratePerformance(
            [HttpTrigger(AuthorizationLevel.Function, "post", Route = "performance/{employeeId}/{projectId}")] HttpRequestData req,
            string employeeId,
            string projectId)
        {
            if (!Guid.TryParse(employeeId, out var eid) || !Guid.TryParse(projectId, out var pid))
                return await BadRequest(req, "Invalid IDs");

            int assignedTasks = await _unitOfWork.Tasks.CountAssignedTasksAsync(eid, pid);
            int completedTasks = await _unitOfWork.Tasks.CountCompletedTasksAsync(eid, pid);

            double approvalRate = assignedTasks > 0 ? Math.Round((double)completedTasks / assignedTasks * 100, 2) : 0;

            var performance = new EmployeePerformance
            {
                EmployeeId = eid,
                ProjectId = pid,
                TasksAssigned = assignedTasks,
                TasksCompleted = completedTasks,
                ApprovalRate = approvalRate
            };

            await _unitOfWork.EmployeePerformances.AddAsync(performance);
            await _unitOfWork.CompleteAsync();

            var resp = req.CreateResponse(HttpStatusCode.OK);
            await resp.WriteAsJsonAsync(performance);
            return resp;
        }

        [Function("GetProjectEmployeePerformance")]
        public async Task<HttpResponseData> GetPerformanceByProject(
            [HttpTrigger(AuthorizationLevel.Function, "get", Route = "performance/project/{projectId}")] HttpRequestData req,
            string projectId)
        {
            if (!Guid.TryParse(projectId, out var pid))
                return await BadRequest(req, "Invalid ProjectId");

            var performances = await _unitOfWork.EmployeePerformances.GetByProjectIdAsync(pid);

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
