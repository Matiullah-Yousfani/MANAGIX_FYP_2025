using MANAGIX.Models.DTO;
using MANAGIX.Services;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using System;
using System.IO;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;

namespace MANAGIX_FYP_2025.Functions
{
    // PHASE 4: Meeting endpoints — schedule, complete (with transcript), extract tasks.
    public class MeetingFunction
    {
        private readonly IMeetingService _meetings;
        private static readonly JsonSerializerOptions _json = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            PropertyNameCaseInsensitive = true,
        };

        public MeetingFunction(IMeetingService meetings) => _meetings = meetings;

        // POST /meetings
        [Function("CreateMeeting")]
        public async Task<HttpResponseData> Create(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "meetings")] HttpRequestData req)
        {
            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var dto = JsonSerializer.Deserialize<MeetingCreateDto>(body, _json);
            if (dto == null || string.IsNullOrWhiteSpace(dto.Title) || dto.CreatedBy == Guid.Empty)
            {
                var bad = req.CreateResponse(HttpStatusCode.BadRequest);
                await bad.WriteAsJsonAsync(new { message = "Title and createdBy are required." });
                return bad;
            }
            var saved = await _meetings.CreateAsync(dto);
            var resp = req.CreateResponse(HttpStatusCode.Created);
            resp.Headers.Add("Content-Type", "application/json");
            await resp.WriteStringAsync(JsonSerializer.Serialize(saved, _json));
            return resp;
        }

        // GET /meetings/{id}
        [Function("GetMeeting")]
        public async Task<HttpResponseData> Get(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "meetings/{meetingId:guid}")] HttpRequestData req,
            Guid meetingId)
        {
            var m = await _meetings.GetAsync(meetingId);
            if (m == null) return req.CreateResponse(HttpStatusCode.NotFound);
            var resp = req.CreateResponse(HttpStatusCode.OK);
            resp.Headers.Add("Content-Type", "application/json");
            await resp.WriteStringAsync(JsonSerializer.Serialize(m, _json));
            return resp;
        }

        // GET /meetings/project/{projectId}
        [Function("ListMeetingsByProject")]
        public async Task<HttpResponseData> ListByProject(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "meetings/project/{projectId:guid}")] HttpRequestData req,
            Guid projectId)
        {
            var list = await _meetings.GetByProjectAsync(projectId);
            var resp = req.CreateResponse(HttpStatusCode.OK);
            resp.Headers.Add("Content-Type", "application/json");
            await resp.WriteStringAsync(JsonSerializer.Serialize(list, _json));
            return resp;
        }

        // GET /meetings/user/{userId}/upcoming
        [Function("UpcomingMeetingsForUser")]
        public async Task<HttpResponseData> Upcoming(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "meetings/user/{userId:guid}/upcoming")] HttpRequestData req,
            Guid userId)
        {
            var list = await _meetings.GetUpcomingForUserAsync(userId);
            var resp = req.CreateResponse(HttpStatusCode.OK);
            resp.Headers.Add("Content-Type", "application/json");
            await resp.WriteStringAsync(JsonSerializer.Serialize(list, _json));
            return resp;
        }

        // POST /meetings/{id}/complete   body: { transcriptText }
        [Function("CompleteMeeting")]
        public async Task<HttpResponseData> Complete(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "meetings/{meetingId:guid}/complete")] HttpRequestData req,
            Guid meetingId)
        {
            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var dto = JsonSerializer.Deserialize<MeetingTranscriptDto>(body, _json);
            if (dto == null) dto = new MeetingTranscriptDto();
            var ok = await _meetings.CompleteWithTranscriptAsync(meetingId, dto.TranscriptText ?? string.Empty);
            var status = ok ? HttpStatusCode.OK : HttpStatusCode.NotFound;
            var resp = req.CreateResponse(status);
            await resp.WriteAsJsonAsync(new { ok });
            return resp;
        }

        // POST /meetings/{id}/extract-tasks  → returns AI suggestions; persistence happens on the FE
        // after the manager confirms. Two-step flow keeps the system honest about LLM output.
        [Function("ExtractMeetingTasks")]
        public async Task<HttpResponseData> Extract(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "meetings/{meetingId:guid}/extract-tasks")] HttpRequestData req,
            Guid meetingId)
        {
            try
            {
                var result = await _meetings.ExtractTasksAsync(meetingId);
                var resp = req.CreateResponse(HttpStatusCode.OK);
                resp.Headers.Add("Content-Type", "application/json");
                await resp.WriteStringAsync(JsonSerializer.Serialize(result, _json));
                return resp;
            }
            catch (TaskCanceledException ex)
            {
                var err = req.CreateResponse(HttpStatusCode.GatewayTimeout);
                await err.WriteAsJsonAsync(new { message = "AI extractor timed out", detail = ex.Message });
                return err;
            }
            catch (HttpRequestException ex)
            {
                var err = req.CreateResponse(HttpStatusCode.BadGateway);
                await err.WriteAsJsonAsync(new { message = "AI extractor unreachable", detail = ex.Message });
                return err;
            }
            catch (Exception ex)
            {
                var err = req.CreateResponse(HttpStatusCode.InternalServerError);
                await err.WriteAsJsonAsync(new { message = ex.Message });
                return err;
            }
        }
    }
}
