using MANAGIX.DataAccess.Repositories.IRepositories;
using MANAGIX.Models.DTO;
using MANAGIX.Models.Models;
using MANAGIX.Services;
using MANAGIX.Utility;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Azure.Functions.Worker;
using System;
using System.Collections.Generic;
using System.IO;
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
        private readonly INotificationService _notifications;
        private readonly IEmployeePerformanceService _performance;

        public TaskFunction(
            IUnitOfWork unitOfWork,
            INotificationService notifications,
            IEmployeePerformanceService performance)
        {
            _unitOfWork = unitOfWork;
            _notifications = notifications;
            _performance = performance;
        }

        private static Guid ResolveCallerUserId(HttpRequestData req)
        {
            try
            {
                return req.GetUserId();
            }
            catch (UnauthorizedAccessException)
            {
                if (req.Headers.TryGetValues("userId", out var vals))
                {
                    var raw = vals.FirstOrDefault();
                    if (raw != null && Guid.TryParse(raw, out var id))
                        return id;
                }

                throw;
            }
        }

        private static bool CanViewOrEditTask(HttpRequestData req, TaskItem task, Guid callerId)
        {
            if (task.AssignedEmployeeId.HasValue && task.AssignedEmployeeId.Value == callerId)
                return true;
            return req.JwtHasAnyRole("Admin", "Manager", "QA");
        }

        private static bool IsEmployeeOnly(HttpRequestData req) =>
            req.JwtHasAnyRole("Employee") &&
            !req.JwtHasAnyRole("Admin", "Manager", "QA");

        private static List<TaskItem> FilterTasksForCaller(HttpRequestData req, List<TaskItem> tasks, Guid callerId)
        {
            if (!IsEmployeeOnly(req))
                return tasks;
            return tasks.Where(t => t.AssignedEmployeeId == callerId).ToList();
        }

        private static bool CanViewSubmission(HttpRequestData req, TaskItem task, Guid callerId)
        {
            if (req.JwtHasAnyRole("QA", "Manager", "Admin"))
                return true;
            return task.AssignedEmployeeId == callerId;
        }

        // ✅ GET /tasks/assigned-to-me
        [Function("GetAssignedTasks")]
        public async Task<HttpResponseData> GetAssignedTasks(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "tasks/assigned-to-me")] HttpRequestData req)
        {
            var employeeId = ResolveCallerUserId(req);
            var tasks = await _unitOfWork.Tasks.GetByEmployeeIdAsync(employeeId);

            var resp = req.CreateResponse(HttpStatusCode.OK);
            await resp.WriteAsJsonAsync(tasks);
            return resp;
        }
        [Function("SubmitTask")]
        public async Task<HttpResponseData> SubmitTask(
      [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "tasks/{taskId}/submit")] HttpRequestData req,
      string taskId)
        {
            try
            {
                if (!Guid.TryParse(taskId, out var tid))
                    return await BadRequest(req, "Invalid TaskId");

                Guid submitterId;
                try
                {
                    submitterId = ResolveCallerUserId(req);
                }
                catch (UnauthorizedAccessException)
                {
                    return await BadRequest(req, "Authorization required.");
                }

                var body = await new StreamReader(req.Body).ReadToEndAsync();
                var dto = JsonSerializer.Deserialize<TaskSubmissionDto>(body, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                if (dto == null || string.IsNullOrEmpty(dto.FileBase64))
                    return await BadRequest(req, "Invalid data or missing file");

                var fileBytes = Convert.FromBase64String(dto.FileBase64);
                const long maxBytes = 15L * 1024 * 1024;
                if (fileBytes.Length > maxBytes)
                    return await BadRequest(req, "File exceeds maximum allowed size (15 MB).");

                var allowedExt = new[] { ".pdf", ".doc", ".docx", ".txt", ".png", ".jpg", ".jpeg", ".zip" };
                var ext = Path.GetExtension(dto.FileName ?? "").ToLowerInvariant();
                if (string.IsNullOrEmpty(ext) || !allowedExt.Contains(ext))
                    return await BadRequest(req, "File type not allowed.");

                var taskForSubmit = await _unitOfWork.Tasks.GetByIdAsync(tid);
                if (taskForSubmit == null)
                    return await NotFound(req, "Task not found");

                var project = await _unitOfWork.Projects.GetByIdAsync(taskForSubmit.ProjectId);
                if (project == null)
                    return await BadRequest(req, "Project not found");
                if (project.IsClosed)
                    return await BadRequest(req, "Cannot submit work for a closed project.");

                if (!taskForSubmit.AssignedEmployeeId.HasValue)
                    return await BadRequest(req, "Task must be assigned before submission.");
                if (taskForSubmit.AssignedEmployeeId.Value != submitterId)
                    return await BadRequest(req, "Only the assigned employee can submit this task.");

                var normalized = TaskWorkflow.Normalize(taskForSubmit.Status);
                if (normalized != TaskWorkflow.InProgress)
                    return await BadRequest(req, "Task must be In Progress before submitting deliverables.");

                var existingSubmission = await _unitOfWork.TaskSubmissions.GetByTaskIdAsync(tid);
                if (existingSubmission != null)
                {
                    if (existingSubmission.Status == "Rejected" &&
                        TaskWorkflow.Normalize(taskForSubmit.Status) == TaskWorkflow.InProgress)
                    {
                        _unitOfWork.TaskSubmissions.Remove(existingSubmission);
                    }
                    else
                        return await BadRequest(req, "A submission already exists for this task.");
                }

                var uploadPath = Path.Combine(TaskUploadPathHelper.GetWwwRootDirectory(), "tasks");
                if (!Directory.Exists(uploadPath))
                    Directory.CreateDirectory(uploadPath);

                var extension = Path.GetExtension(dto.FileName) ?? ".dat";
                var storageName = $"{tid}_{DateTime.UtcNow.Ticks}{extension}";
                var physicalPath = Path.Combine(uploadPath, storageName);

                await File.WriteAllBytesAsync(physicalPath, fileBytes);

                var submission = new TaskSubmission
                {
                    TaskId = tid,
                    SubmittedBy = submitterId,
                    FilePath = $"/tasks/{storageName}",
                    FileName = dto.FileName?.Trim(),
                    Comment = dto.Comment,
                    Status = "Submitted",
                    SubmittedAt = DateTime.UtcNow
                };

                await _unitOfWork.TaskSubmissions.AddAsync(submission);

                taskForSubmit.Status = TaskWorkflow.Done;
                _unitOfWork.Tasks.Update(taskForSubmit);

                await _unitOfWork.CompleteAsync();

                var submitter = await _unitOfWork.Users.GetByIdAsync(submitterId);
                var qaIds = await _unitOfWork.Users.GetUserIdsByRoleNameAsync(AppRoles.QualityAssurance);
                if (qaIds.Count > 0)
                {
                    await _notifications.PublishToManyAsync(qaIds, new NotificationCreateDto
                    {
                        Type = "TaskSubmittedForReview",
                        Title = "Task ready for QA review",
                        Body = $"{submitter?.FullName ?? "Employee"} submitted \"{taskForSubmit.Title}\" on {project.Title}.",
                        Link = "/task-hub",
                    });
                }

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
    [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "tasks/{taskId}/submission")] HttpRequestData req,
    string taskId)
        {
            try
            {
                if (!Guid.TryParse(taskId, out var tid))
                    return await BadRequest(req, "Invalid TaskId");

                var task = await _unitOfWork.Tasks.GetByIdAsync(tid);
                if (task == null)
                    return await NotFound(req, "Task not found.");

                Guid callerId;
                try
                {
                    callerId = ResolveCallerUserId(req);
                }
                catch (UnauthorizedAccessException)
                {
                    return await BadRequest(req, "Authorization required.");
                }

                if (!CanViewSubmission(req, task, callerId))
                    return await BadRequest(req, "Not authorized to view this submission.");

                var submission = await _unitOfWork.TaskSubmissions.GetByTaskIdAsync(tid);
                if (submission == null)
                    return await NotFound(req, "No submission record found.");

                var physicalPath = TaskUploadPathHelper.ToPhysicalPath(submission.FilePath);

                string? base64File = null;
                var fileName = TaskUploadPathHelper.DisplayFileName(submission.FileName, submission.FilePath);

                if (!string.IsNullOrEmpty(physicalPath) && File.Exists(physicalPath))
                {
                    var fileBytes = await File.ReadAllBytesAsync(physicalPath);
                    base64File = Convert.ToBase64String(fileBytes);
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


        private async Task<HashSet<Guid>> GetProjectIdsForTeamMemberAsync(Guid userId)
        {
            var teamIds = await _unitOfWork.TeamEmployees.GetTeamIdsForMemberAsync(userId);
            if (teamIds.Count == 0)
                return new HashSet<Guid>();

            var assignments = await _unitOfWork.ProjectTeams.GetAllAssignmentsAsync();
            return assignments
                .Where(a => teamIds.Contains(a.TeamId))
                .Select(a => a.ProjectId)
                .ToHashSet();
        }

        // ✅ GET /tasks/pending-review
        [Function("GetPendingSubmissions")]
        public async Task<HttpResponseData> GetPendingSubmissions(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "tasks/pending-review")] HttpRequestData req)
        {
            if (!req.JwtHasAnyRole("QA", "Admin"))
            {
                var forbidden = req.CreateResponse(HttpStatusCode.Forbidden);
                await forbidden.WriteAsJsonAsync(new { message = "QA access only." });
                return forbidden;
            }

            var submissions = await _unitOfWork.TaskSubmissions.GetPendingSubmissionsAsync();

            if (req.JwtHasAnyRole("QA") && !req.JwtHasAnyRole("Admin"))
            {
                var qaId = ResolveCallerUserId(req);
                var projectIds = await GetProjectIdsForTeamMemberAsync(qaId);
                submissions = submissions
                    .Where(s => s.Task != null && projectIds.Contains(s.Task.ProjectId))
                    .ToList();
            }

            var resp = req.CreateResponse(HttpStatusCode.OK);
            await resp.WriteAsJsonAsync(submissions);
            return resp;
        }

        // ✅ GET /tasks/qa/done — all Done tasks on projects the QA belongs to
        [Function("GetQaDoneTasks")]
        public async Task<HttpResponseData> GetQaDoneTasks(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "tasks/qa/done")] HttpRequestData req)
        {
            if (!req.JwtHasAnyRole("QA", "Admin"))
            {
                var forbidden = req.CreateResponse(HttpStatusCode.Forbidden);
                await forbidden.WriteAsJsonAsync(new { message = "QA access only." });
                return forbidden;
            }

            HashSet<Guid> projectIds;
            if (req.JwtHasAnyRole("Admin"))
            {
                var all = await _unitOfWork.Projects.GetAllAsync();
                projectIds = all.Select(p => p.ProjectId).ToHashSet();
            }
            else
            {
                var qaId = ResolveCallerUserId(req);
                projectIds = await GetProjectIdsForTeamMemberAsync(qaId);
            }

            var result = new List<object>();
            foreach (var pid in projectIds)
            {
                var tasks = await _unitOfWork.Tasks.GetByProjectIdAsync(pid);
                foreach (var t in tasks.Where(t => TaskWorkflow.Normalize(t.Status) == TaskWorkflow.Done))
                {
                    var sub = await _unitOfWork.TaskSubmissions.GetByTaskIdAsync(t.TaskId);
                    result.Add(new
                    {
                        taskId = t.TaskId,
                        title = t.Title,
                        status = t.Status,
                        projectId = t.ProjectId,
                        assignedEmployeeId = t.AssignedEmployeeId,
                        submission = sub == null ? null : new
                        {
                            submissionId = sub.SubmissionId,
                            status = sub.Status,
                            fileName = TaskUploadPathHelper.DisplayFileName(sub.FileName, sub.FilePath),
                            submittedAt = sub.SubmittedAt,
                            comment = sub.Comment,
                        },
                    });
                }
            }

            var resp = req.CreateResponse(HttpStatusCode.OK);
            await resp.WriteAsJsonAsync(result);
            return resp;
        }

        // ✅ POST /tasks/{taskId}/approve
        [Function("ApproveTask")]
        public async Task<HttpResponseData> ApproveTask(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "tasks/{taskId}/approve")] HttpRequestData req,
            string taskId)
        {
            return await ReviewTask(req, taskId, "Approved", TaskWorkflow.Approved);
        }

        // ✅ POST /tasks/{taskId}/reject
        [Function("RejectTask")]
        public async Task<HttpResponseData> RejectTask(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "tasks/{taskId}/reject")] HttpRequestData req,
            string taskId)
        {
            return await ReviewTask(req, taskId, "Rejected", TaskWorkflow.InProgress);
        }

        // 🔁 Shared review logic
        private async Task<HttpResponseData> ReviewTask(HttpRequestData req, string taskId, string submissionStatus, string taskStatus)
        {
            if (!req.JwtHasAnyRole("QA", "Admin"))
            {
                var forbidden = req.CreateResponse(HttpStatusCode.Forbidden);
                await forbidden.WriteAsJsonAsync(new { message = "Only QA can approve or reject submissions." });
                return forbidden;
            }

            if (!Guid.TryParse(taskId, out var tid))
                return await BadRequest(req, "Invalid TaskId");

            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var dto = JsonSerializer.Deserialize<QAReviewDto>(body, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            if (dto == null) return await BadRequest(req, "Invalid data");

            var task = await _unitOfWork.Tasks.GetByIdAsync(tid);
            if (task == null) return await NotFound(req, "Task not found");

            if (!TaskWorkflow.IsQaReviewable(task.Status))
                return await BadRequest(req, "QA can only review tasks that are Done (ready for review).");

            var submission = await _unitOfWork.TaskSubmissions.GetByTaskIdAsync(tid);
            if (submission == null) return await BadRequest(req, "Submission not found");
            if (submission.Status != "Submitted")
                return await BadRequest(req, "Submission has already been reviewed.");

            submission.Status = submissionStatus;
            submission.QAComment = dto.QAComment;
            submission.ReviewedAt = DateTime.UtcNow;

            task.Status = taskStatus;
            _unitOfWork.Tasks.Update(task);

            _unitOfWork.TaskSubmissions.Update(submission);
            await _unitOfWork.CompleteAsync();

            if (taskStatus == TaskWorkflow.Approved && task.AssignedEmployeeId.HasValue)
            {
                try
                {
                    await _performance.RecalculateProjectAsync(task.ProjectId);
                }
                catch
                {
                    /* team may not exist yet */
                }
            }

            var resp = req.CreateResponse(HttpStatusCode.OK);
            await resp.WriteAsJsonAsync(new { message = $"Task {submissionStatus.ToLower()}" });
            return resp;
        }
        // GET /tasks/{taskId} → Get task by ID
        [Function("GetTaskById")]
        public async Task<HttpResponseData> GetTaskById(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "tasks/{taskId}")] HttpRequestData req,
            string taskId)
        {
            if (!Guid.TryParse(taskId, out var tid))
                return await BadRequest(req, "Invalid TaskId");

            var task = await _unitOfWork.Tasks.GetByIdAsync(tid);
            if (task == null) return await NotFound(req, "Task not found");

            Guid callerId;
            try
            {
                callerId = ResolveCallerUserId(req);
            }
            catch (UnauthorizedAccessException)
            {
                return await BadRequest(req, "Authorization required.");
            }

            if (!CanViewOrEditTask(req, task, callerId))
            {
                var forbidden = req.CreateResponse(HttpStatusCode.Forbidden);
                await forbidden.WriteAsJsonAsync(new { message = "You cannot access this task." });
                return forbidden;
            }

            var resp = req.CreateResponse(HttpStatusCode.OK);
            await resp.WriteAsJsonAsync(task);
            return resp;
        }

        [Function("UpdateTask")]
        public async Task<HttpResponseData> UpdateTask(
            [HttpTrigger(AuthorizationLevel.Anonymous, "put", Route = "tasks/{taskId}")] HttpRequestData req,
            string taskId)
        {
            if (!Guid.TryParse(taskId, out var tid))
                return await BadRequest(req, "Invalid TaskId");

            string body = await new StreamReader(req.Body).ReadToEndAsync();
            var dto = JsonSerializer.Deserialize<TaskUpdateDto>(body, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            if (dto == null) return await BadRequest(req, "Invalid data");

            var task = await _unitOfWork.Tasks.GetByIdAsync(tid);
            if (task == null) return await NotFound(req, "Task not found");

            Guid callerId;
            try
            {
                callerId = ResolveCallerUserId(req);
            }
            catch (UnauthorizedAccessException)
            {
                return await BadRequest(req, "Authorization required.");
            }

            if (!CanViewOrEditTask(req, task, callerId))
            {
                var forbidden = req.CreateResponse(HttpStatusCode.Forbidden);
                await forbidden.WriteAsJsonAsync(new { message = "You cannot modify this task." });
                return forbidden;
            }

            var project = await _unitOfWork.Projects.GetByIdAsync(task.ProjectId);
            if (project == null)
                return await BadRequest(req, "Project not found");
            if (project.IsClosed)
                return await BadRequest(req, "Cannot modify tasks on a closed project.");

            var callerIsQa = req.JwtHasAnyRole("QA", "Admin");
            var managerOrAdmin = req.JwtHasAnyRole("Manager", "Admin");

            if (dto.ClearAssignee)
            {
                if (!managerOrAdmin)
                    return await BadRequest(req, "Only a manager can unassign tasks.");
            }
            else if (dto.AssignedEmployeeId.HasValue && dto.AssignedEmployeeId.Value != Guid.Empty &&
                     task.AssignedEmployeeId != dto.AssignedEmployeeId.Value)
            {
                if (!managerOrAdmin)
                    return await BadRequest(req, "Only a manager can reassign tasks.");

                var onTeam = await TeamProjectGuards.EmployeeBelongsToProjectTeamAsync(
                    _unitOfWork, dto.AssignedEmployeeId.Value, task.ProjectId);
                if (!onTeam)
                    return await BadRequest(req, "Assignee must be a member of the project team.");

                var workload = await _unitOfWork.Tasks.CountActiveWorkloadAsync(dto.AssignedEmployeeId.Value, tid);
                if (workload >= TaskWorkflow.MaxActiveTasksPerEmployee)
                    return await BadRequest(req, $"Assignee exceeds max active tasks ({TaskWorkflow.MaxActiveTasksPerEmployee}).");
            }

            if (!string.IsNullOrEmpty(dto.Status))
            {
                if (!TaskWorkflow.TryValidateManualStatusChange(
                        task.Status, dto.Status, callerIsQa, out var normalizedStatus, out var err))
                    return await BadRequest(req, err ?? "Invalid status.");

                if (normalizedStatus == TaskWorkflow.Done && !callerIsQa)
                {
                    var submission = await _unitOfWork.TaskSubmissions.GetByTaskIdAsync(tid);
                    if (submission == null)
                        return await BadRequest(req,
                            "A work submission is required before marking this task Done. Employees must upload their deliverable first.");
                }

                task.Status = normalizedStatus;
            }

            task.Title = dto.Title ?? task.Title;
            task.Description = dto.Description ?? task.Description;

            if (dto.ClearAssignee)
                task.AssignedEmployeeId = null;
            else if (dto.AssignedEmployeeId.HasValue && dto.AssignedEmployeeId.Value != Guid.Empty)
                task.AssignedEmployeeId = dto.AssignedEmployeeId.Value;

            if (dto.Deadline.HasValue)
            {
                if (!managerOrAdmin)
                    return await BadRequest(req, "Only a manager can set task deadlines.");
                task.Deadline = dto.Deadline.Value;
            }

            if (!string.IsNullOrWhiteSpace(dto.Priority))
            {
                if (!managerOrAdmin)
                    return await BadRequest(req, "Only a manager can set task priority.");
                var p = dto.Priority.Trim();
                if (!p.Equals("High", StringComparison.OrdinalIgnoreCase) &&
                    !p.Equals("Medium", StringComparison.OrdinalIgnoreCase) &&
                    !p.Equals("Low", StringComparison.OrdinalIgnoreCase))
                    return await BadRequest(req, "Priority must be High, Medium, or Low.");
                task.Priority = char.ToUpper(p[0]) + p[1..].ToLower();
            }

            _unitOfWork.Tasks.Update(task);
            await _unitOfWork.CompleteAsync();

            var resp = req.CreateResponse(HttpStatusCode.OK);
            await resp.WriteAsJsonAsync(task);
            return resp;
        }


        // DELETE /tasks/{taskId} → Delete task
        [Function("DeleteTask")]
        public async Task<HttpResponseData> DeleteTask(
            [HttpTrigger(AuthorizationLevel.Anonymous, "delete", Route = "tasks/{taskId}")] HttpRequestData req,
            string taskId)
        {
            if (!Guid.TryParse(taskId, out var tid))
                return await BadRequest(req, "Invalid TaskId");

            var task = await _unitOfWork.Tasks.GetByIdAsync(tid);
            if (task == null) return await NotFound(req, "Task not found");

            var proj = await _unitOfWork.Projects.GetByIdAsync(task.ProjectId);
            if (proj != null && proj.IsClosed)
                return await BadRequest(req, "Cannot delete tasks on a closed project.");

            var sub = await _unitOfWork.TaskSubmissions.GetByTaskIdAsync(tid);
            if (sub != null)
                _unitOfWork.TaskSubmissions.Remove(sub);

            var milestoneId = task.MilestoneId;
            _unitOfWork.Tasks.Remove(task);
            await _unitOfWork.CompleteAsync();

            if (milestoneId.HasValue)
            {
                var remaining = await _unitOfWork.Tasks.GetByMilestoneIdAsync(milestoneId.Value);
                if (remaining.Count == 0)
                {
                    var milestone = await _unitOfWork.Milestones.GetByIdAsync(milestoneId.Value);
                    if (milestone != null)
                    {
                        _unitOfWork.Milestones.Remove(milestone);
                        await _unitOfWork.CompleteAsync();
                    }
                }
            }

            var resp = req.CreateResponse(HttpStatusCode.OK);
            await resp.WriteAsJsonAsync(new { message = "Task deleted successfully" });
            return resp;
        }

        // ✅ GET /tasks/project/{projectId} -> Get all tasks for a specific project
        [Function("GetTasksByProject")]
        public async Task<HttpResponseData> GetTasksByProject(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "tasks/project/{projectId}")] HttpRequestData req,
            string projectId)
        {
            if (!Guid.TryParse(projectId, out var pid))
                return await BadRequest(req, "Invalid ProjectId");

            var tasks = await _unitOfWork.Tasks.GetByProjectIdAsync(pid);
            try
            {
                var callerId = ResolveCallerUserId(req);
                tasks = FilterTasksForCaller(req, tasks, callerId);
            }
            catch (UnauthorizedAccessException)
            {
                // anonymous — return unfiltered (legacy)
            }

            var resp = req.CreateResponse(HttpStatusCode.OK);
            await resp.WriteAsJsonAsync(tasks);
            return resp;
        }

        //create task
        [Function("CreateTask")]
        public async Task<HttpResponseData> CreateTask(
         [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "tasks")] HttpRequestData req)
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

                if (!dto.MilestoneId.HasValue || dto.MilestoneId.Value == Guid.Empty)
                {
                    var badResp = req.CreateResponse(HttpStatusCode.BadRequest);
                    await badResp.WriteAsJsonAsync(new { message = "MilestoneId is required." });
                    return badResp;
                }

                if (dto.ProjectId == Guid.Empty)
                {
                    var badResp = req.CreateResponse(HttpStatusCode.BadRequest);
                    await badResp.WriteAsJsonAsync(new { message = "ProjectId is required." });
                    return badResp;
                }

                var hasAssignee = dto.AssignedEmployeeId.HasValue && dto.AssignedEmployeeId.Value != Guid.Empty;

                var projectEntity = await _unitOfWork.Projects.GetByIdAsync(dto.ProjectId);
                if (projectEntity == null)
                {
                    var badResp = req.CreateResponse(HttpStatusCode.BadRequest);
                    await badResp.WriteAsJsonAsync(new { message = "Project not found." });
                    return badResp;
                }

                if (projectEntity.IsClosed)
                {
                    var badResp = req.CreateResponse(HttpStatusCode.BadRequest);
                    await badResp.WriteAsJsonAsync(new { message = "Cannot create tasks on a closed project." });
                    return badResp;
                }

                var milestone = await _unitOfWork.Milestones.GetByIdAsync(dto.MilestoneId.Value);
                if (milestone == null || milestone.ProjectId != dto.ProjectId)
                {
                    var badResp = req.CreateResponse(HttpStatusCode.BadRequest);
                    await badResp.WriteAsJsonAsync(new { message = "Milestone must belong to the specified project." });
                    return badResp;
                }

                if (hasAssignee)
                {
                    var assigneeOk = await TeamProjectGuards.EmployeeBelongsToProjectTeamAsync(
                        _unitOfWork, dto.AssignedEmployeeId!.Value, dto.ProjectId);
                    if (!assigneeOk)
                    {
                        var badResp = req.CreateResponse(HttpStatusCode.BadRequest);
                        await badResp.WriteAsJsonAsync(new { message = "Assignee must be on the project team." });
                        return badResp;
                    }

                    var workload = await _unitOfWork.Tasks.CountActiveWorkloadAsync(dto.AssignedEmployeeId.Value, null);
                    if (workload >= TaskWorkflow.MaxActiveTasksPerEmployee)
                    {
                        var badResp = req.CreateResponse(HttpStatusCode.Conflict);
                        await badResp.WriteAsJsonAsync(new
                        {
                            message = $"Employee cannot have more than {TaskWorkflow.MaxActiveTasksPerEmployee} active tasks."
                        });
                        return badResp;
                    }
                }

                var initialStatus = TaskWorkflow.Normalize(string.IsNullOrEmpty(dto.Status) ? TaskWorkflow.Todo : dto.Status);
                if (initialStatus != TaskWorkflow.Todo)
                {
                    var badResp = req.CreateResponse(HttpStatusCode.BadRequest);
                    await badResp.WriteAsJsonAsync(new { message = "New tasks must start as Todo." });
                    return badResp;
                }

                var newTask = new TaskItem
                {
                    TaskId = Guid.NewGuid(),
                    ProjectId = dto.ProjectId,
                    MilestoneId = dto.MilestoneId,
                    Title = dto.Title,
                    Description = dto.Description,
                    Status = TaskWorkflow.Todo,
                    AssignedEmployeeId = hasAssignee ? dto.AssignedEmployeeId : null,
                    EstimatedHours = dto.EstimatedHours > 0 ? dto.EstimatedHours : 4m,
                    Priority = string.IsNullOrWhiteSpace(dto.Priority) ? "Medium" : dto.Priority,
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
                var root = ex;
                while (root.InnerException != null)
                    root = root.InnerException;

                Console.WriteLine($"[CreateTask] {ex}");
                var errorResp = req.CreateResponse(HttpStatusCode.InternalServerError);
                await errorResp.WriteAsJsonAsync(new
                {
                    message = "Server error while creating task.",
                    detail = ex.Message,
                    inner = root.Message
                });
                return errorResp;
            }
        }


        // GET /tasks/milestone/{milestoneId} → Get tasks by milestone
        [Function("GetTasksByMilestone")]
        public async Task<HttpResponseData> GetTasksByMilestone(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "tasks/milestone/{milestoneId}")] HttpRequestData req,
            string milestoneId)
        {
            if (!Guid.TryParse(milestoneId, out var mid))
                return await BadRequest(req, "Invalid MilestoneId");

            var tasks = await _unitOfWork.Tasks.GetByMilestoneIdAsync(mid);
            try
            {
                var callerId = ResolveCallerUserId(req);
                tasks = FilterTasksForCaller(req, tasks, callerId);
            }
            catch (UnauthorizedAccessException)
            {
                // anonymous — return unfiltered (legacy)
            }

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
