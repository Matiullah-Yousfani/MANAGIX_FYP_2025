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
    public class TaskFunction
    {
        private readonly IUnitOfWork _unitOfWork;

        public TaskFunction(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        // ✅ GET /tasks/assigned-to-me
        [Function("GetAssignedTasks")]
        public async Task<HttpResponseData> GetAssignedTasks(
            [HttpTrigger(AuthorizationLevel.Function, "get", Route = "tasks/assigned-to-me")] HttpRequestData req)
        {
            var employeeId = Guid.Parse(req.Headers.GetValues("userId").First());
            var tasks = await _unitOfWork.Tasks.GetByEmployeeIdAsync(employeeId);

            var resp = req.CreateResponse(HttpStatusCode.OK);
            await resp.WriteAsJsonAsync(tasks);
            return resp;
        }

        // ✅ POST /tasks/{taskId}/submit
        [Function("SubmitTask")]
        public async Task<HttpResponseData> SubmitTask(
            [HttpTrigger(AuthorizationLevel.Function, "post", Route = "tasks/{taskId}/submit")] HttpRequestData req,
            string taskId)
        {
            if (!Guid.TryParse(taskId, out var tid))
                return await BadRequest(req, "Invalid TaskId");

            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var dto = JsonSerializer.Deserialize<TaskSubmissionDto>(body, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            if (dto == null) return await BadRequest(req, "Invalid data");

            var fileBytes = Convert.FromBase64String(dto.FileBase64);
            var filePath = Path.Combine("wwwroot/tasks", $"{tid}_{DateTime.UtcNow.Ticks}.dat");
            Directory.CreateDirectory("wwwroot/tasks");
            await File.WriteAllBytesAsync(filePath, fileBytes);

            var submission = new TaskSubmission
            {
                TaskId = tid,
                SubmittedBy = Guid.Parse(req.Headers.GetValues("userId").First()),
                FilePath = filePath,
                Comment = dto.Comment,
                Status = "Submitted"
            };

            await _unitOfWork.TaskSubmissions.AddAsync(submission);

            var task = await _unitOfWork.Tasks.GetByIdAsync(tid);
            if (task != null)
            {
                task.Status = "Submitted";
                _unitOfWork.Tasks.Update(task);
            }

            await _unitOfWork.CompleteAsync();

            var resp = req.CreateResponse(HttpStatusCode.OK);
            await resp.WriteAsJsonAsync(new { message = "Task submitted successfully" });
            return resp;
        }

        // ✅ GET /tasks/pending-review
        [Function("GetPendingSubmissions")]
        public async Task<HttpResponseData> GetPendingSubmissions(
            [HttpTrigger(AuthorizationLevel.Function, "get", Route = "tasks/pending-review")] HttpRequestData req)
        {
            var submissions = await _unitOfWork.TaskSubmissions.GetPendingSubmissionsAsync();

            var resp = req.CreateResponse(HttpStatusCode.OK);
            await resp.WriteAsJsonAsync(submissions);
            return resp;
        }

        // ✅ POST /tasks/{taskId}/approve
        [Function("ApproveTask")]
        public async Task<HttpResponseData> ApproveTask(
            [HttpTrigger(AuthorizationLevel.Function, "post", Route = "tasks/{taskId}/approve")] HttpRequestData req,
            string taskId)
        {
            return await ReviewTask(req, taskId, "Approved", "Done");
        }

        // ✅ POST /tasks/{taskId}/reject
        [Function("RejectTask")]
        public async Task<HttpResponseData> RejectTask(
            [HttpTrigger(AuthorizationLevel.Function, "post", Route = "tasks/{taskId}/reject")] HttpRequestData req,
            string taskId)
        {
            return await ReviewTask(req, taskId, "Rejected", "InProgress");
        }

        // 🔁 Shared review logic
        private async Task<HttpResponseData> ReviewTask(HttpRequestData req, string taskId, string submissionStatus, string taskStatus)
        {
            if (!Guid.TryParse(taskId, out var tid))
                return await BadRequest(req, "Invalid TaskId");

            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var dto = JsonSerializer.Deserialize<QAReviewDto>(body, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            if (dto == null) return await BadRequest(req, "Invalid data");

            var submission = await _unitOfWork.TaskSubmissions.GetByTaskIdAsync(tid);
            if (submission == null) return await BadRequest(req, "Submission not found");

            submission.Status = submissionStatus;
            submission.QAComment = dto.QAComment;
            submission.ReviewedAt = DateTime.UtcNow;

            var task = await _unitOfWork.Tasks.GetByIdAsync(tid);
            if (task != null)
            {
                task.Status = taskStatus;
                _unitOfWork.Tasks.Update(task);
            }

            _unitOfWork.TaskSubmissions.Update(submission);
            await _unitOfWork.CompleteAsync();

            var resp = req.CreateResponse(HttpStatusCode.OK);
            await resp.WriteAsJsonAsync(new { message = $"Task {submissionStatus.ToLower()}" });
            return resp;
        }
        // GET /tasks/{taskId} → Get task by ID
        [Function("GetTaskById")]
        public async Task<HttpResponseData> GetTaskById(
            [HttpTrigger(AuthorizationLevel.Function, "get", Route = "tasks/{taskId}")] HttpRequestData req,
            string taskId)
        {
            if (!Guid.TryParse(taskId, out var tid))
                return await BadRequest(req, "Invalid TaskId");

            var task = await _unitOfWork.Tasks.GetByIdAsync(tid);
            if (task == null) return await NotFound(req, "Task not found");

            var resp = req.CreateResponse(HttpStatusCode.OK);
            await resp.WriteAsJsonAsync(task);
            return resp;
        }

        [Function("UpdateTask")]
        public async Task<HttpResponseData> UpdateTask(
            [HttpTrigger(AuthorizationLevel.Function, "put", Route = "tasks/{taskId}")] HttpRequestData req,
            string taskId)
        {
            if (!Guid.TryParse(taskId, out var tid))
                return await BadRequest(req, "Invalid TaskId");

            string body = await new StreamReader(req.Body).ReadToEndAsync();
            var dto = JsonSerializer.Deserialize<TaskUpdateDto>(body, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            if (dto == null) return await BadRequest(req, "Invalid data");

            var task = await _unitOfWork.Tasks.GetByIdAsync(tid);
            if (task == null) return await NotFound(req, "Task not found");

            task.Title = dto.Title ?? task.Title;
            task.Description = dto.Description ?? task.Description;
            task.Status = dto.Status ?? task.Status;
            task.AssignedEmployeeId = dto.AssignedEmployeeId ?? task.AssignedEmployeeId;

            // Optional: add deadline if you want
            // task.Deadline = dto.Deadline ?? task.Deadline;

            _unitOfWork.Tasks.Update(task);
            await _unitOfWork.CompleteAsync();

            var resp = req.CreateResponse(HttpStatusCode.OK);
            await resp.WriteAsJsonAsync(task);
            return resp;
        }


        // DELETE /tasks/{taskId} → Delete task
        [Function("DeleteTask")]
        public async Task<HttpResponseData> DeleteTask(
            [HttpTrigger(AuthorizationLevel.Function, "delete", Route = "tasks/{taskId}")] HttpRequestData req,
            string taskId)
        {
            if (!Guid.TryParse(taskId, out var tid))
                return await BadRequest(req, "Invalid TaskId");

            var task = await _unitOfWork.Tasks.GetByIdAsync(tid);
            if (task == null) return await NotFound(req, "Task not found");

            _unitOfWork.Tasks.Remove(task);
            await _unitOfWork.CompleteAsync();

            var resp = req.CreateResponse(HttpStatusCode.OK);
            await resp.WriteAsJsonAsync(new { message = "Task deleted successfully" });
            return resp;
        }

        // GET /tasks/milestone/{milestoneId} → Get tasks by milestone
        [Function("GetTasksByMilestone")]
        public async Task<HttpResponseData> GetTasksByMilestone(
            [HttpTrigger(AuthorizationLevel.Function, "get", Route = "tasks/milestone/{milestoneId}")] HttpRequestData req,
            string milestoneId)
        {
            if (!Guid.TryParse(milestoneId, out var mid))
                return await BadRequest(req, "Invalid MilestoneId");

            var tasks = await _unitOfWork.Tasks.GetByMilestoneIdAsync(mid);

            var resp = req.CreateResponse(HttpStatusCode.OK);
            await resp.WriteAsJsonAsync(tasks);
            return resp;
        }


        private async Task<HttpResponseData> NotFound(HttpRequestData req, string message)
        {
            var resp = req.CreateResponse(HttpStatusCode.NotFound);
            await resp.WriteAsJsonAsync(new { message });
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
