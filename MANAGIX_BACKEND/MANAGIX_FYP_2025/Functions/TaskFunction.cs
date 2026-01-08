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
        [Function("SubmitTask")]
        public async Task<HttpResponseData> SubmitTask(
      [HttpTrigger(AuthorizationLevel.Function, "post", Route = "tasks/{taskId}/submit")] HttpRequestData req,
      string taskId)
        {
            try
            {
                if (!Guid.TryParse(taskId, out var tid))
                    return await BadRequest(req, "Invalid TaskId");

                if (!req.Headers.TryGetValues("userId", out var userHeaderValues) || !userHeaderValues.Any())
                    return await BadRequest(req, "User ID header is missing.");

                var userIdString = userHeaderValues.First();
                var body = await new StreamReader(req.Body).ReadToEndAsync();
                var dto = JsonSerializer.Deserialize<TaskSubmissionDto>(body, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                if (dto == null || string.IsNullOrEmpty(dto.FileBase64))
                    return await BadRequest(req, "Invalid data or missing file");

                // 1. Setup Paths
                var fileBytes = Convert.FromBase64String(dto.FileBase64);
                var projectRoot = @"D:\FYP-Project\MANAGIX_FYP_2025\MANAGIX_BACKEND\MANAGIX_FYP_2025";
                var uploadPath = Path.Combine(projectRoot, "wwwroot", "tasks");

                if (!Directory.Exists(uploadPath)) Directory.CreateDirectory(uploadPath);

                // 2. Generate File Name with correct extension
                var extension = Path.GetExtension(dto.FileName) ?? ".dat";
                var fileName = $"{tid}_{DateTime.UtcNow.Ticks}{extension}";
                var physicalPath = Path.Combine(uploadPath, fileName);

                // 3. Save file to Disk
                await File.WriteAllBytesAsync(physicalPath, fileBytes);

                // 4. Create Database Record with URL instead of physical path
                var submission = new TaskSubmission
                {
                    TaskId = tid,
                    SubmittedBy = Guid.Parse(userIdString),
                    FilePath = $"/tasks/{fileName}", // Store the URL path
                    Comment = dto.Comment,
                    Status = "Submitted",
                    SubmittedAt = DateTime.UtcNow
                };

                await _unitOfWork.TaskSubmissions.AddAsync(submission);

                // 5. Update Task Status
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
            catch (Exception ex)
            {
                var errorResp = req.CreateResponse(HttpStatusCode.InternalServerError);
                await errorResp.WriteStringAsync($"Internal Error: {ex.Message}");
                return errorResp;
            }
        }


        // ✅ NEW: GET /tasks/{taskId}/submission -> Fetches the file for the Manager
        [Function("GetTaskSubmission")]
        public async Task<HttpResponseData> GetTaskSubmission(
    [HttpTrigger(AuthorizationLevel.Function, "get", Route = "tasks/{taskId}/submission")] HttpRequestData req,
    string taskId)
        {
            try
            {
                if (!Guid.TryParse(taskId, out var tid))
                    return await BadRequest(req, "Invalid TaskId");

                // 1. Fetch submission
                var submission = await _unitOfWork.TaskSubmissions.GetByTaskIdAsync(tid);
                if (submission == null)
                    return await NotFound(req, "No submission record found.");

                // 2. Build file path
                var projectRoot = @"D:\FYP-Project\MANAGIX_FYP_2025\MANAGIX_BACKEND\MANAGIX_FYP_2025";
                var physicalPath = Path.Combine(projectRoot, "wwwroot", submission.FilePath?.TrimStart('/') ?? "");

                string? base64File = null;
                string? fileName = null;

                if (!string.IsNullOrEmpty(submission.FilePath) && File.Exists(physicalPath))
                {
                    var fileBytes = await File.ReadAllBytesAsync(physicalPath);
                    base64File = Convert.ToBase64String(fileBytes);
                    fileName = Path.GetFileName(physicalPath);
                }

                // 3. Build response
                var responsePayload = new
                {
                    submissionId = submission.SubmissionId,
                    taskId = submission.TaskId,
                    submittedBy = submission.SubmittedBy,
                    submittedAt = submission.SubmittedAt,

                    status = submission.Status,
                    comment = submission.Comment,
                    qaComment = submission.QAComment,
                    reviewedAt = submission.ReviewedAt,

                    fileName,
                    fileBase64 = base64File
                };

                var resp = req.CreateResponse(HttpStatusCode.OK);
                await resp.WriteAsJsonAsync(responsePayload);
                return resp;
            }
            catch (Exception ex)
            {
                var errorResp = req.CreateResponse(HttpStatusCode.InternalServerError);
                await errorResp.WriteStringAsync($"Internal Error: {ex.Message}");
                return errorResp;
            }
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

        // ✅ GET /tasks/project/{projectId} -> Get all tasks for a specific project
        [Function("GetTasksByProject")]
        public async Task<HttpResponseData> GetTasksByProject(
            [HttpTrigger(AuthorizationLevel.Function, "get", Route = "tasks/project/{projectId}")] HttpRequestData req,
            string projectId)
        {
            if (!Guid.TryParse(projectId, out var pid))
                return await BadRequest(req, "Invalid ProjectId");

            // This method should exist in your TaskRepository via UnitOfWork
            var tasks = await _unitOfWork.Tasks.GetByProjectIdAsync(pid);

            var resp = req.CreateResponse(HttpStatusCode.OK);
            await resp.WriteAsJsonAsync(tasks);
            return resp;
        }

        //create task
        [Function("CreateTask")]
        public async Task<HttpResponseData> CreateTask(
         [HttpTrigger(AuthorizationLevel.Function, "post", Route = "tasks")] HttpRequestData req)
        {
            try
            {
                var body = await new StreamReader(req.Body).ReadToEndAsync();
                var dto = JsonSerializer.Deserialize<TaskCreateDto>(body, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                if (dto == null || string.IsNullOrWhiteSpace(dto.Title))
                {
                    var badResp = req.CreateResponse(HttpStatusCode.BadRequest);
                    await badResp.WriteAsJsonAsync(new { message = "Task title is required." });
                    return badResp;
                }

                // Logic: Create the new TaskItem using the ProjectId from the frontend
                var newTask = new TaskItem
                {
                    TaskId = Guid.NewGuid(),
                    ProjectId = dto.ProjectId,
                    MilestoneId = dto.MilestoneId, // Can be null if not selected
                    Title = dto.Title,
                    Description = dto.Description,
                    Status = "Pending",
                    AssignedEmployeeId = dto.AssignedEmployeeId,
                    CreatedAt = DateTime.UtcNow
                };

                await _unitOfWork.Tasks.AddAsync(newTask); // Uses your TaskRepository
                await _unitOfWork.CompleteAsync();

                var resp = req.CreateResponse(HttpStatusCode.Created);
                await resp.WriteAsJsonAsync(newTask);
                return resp;
            }
            catch (Exception ex)
            {
                var errorResp = req.CreateResponse(HttpStatusCode.InternalServerError);
                await errorResp.WriteAsJsonAsync(new { message = "Server Error", details = ex.Message });
                return errorResp;
            }
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
