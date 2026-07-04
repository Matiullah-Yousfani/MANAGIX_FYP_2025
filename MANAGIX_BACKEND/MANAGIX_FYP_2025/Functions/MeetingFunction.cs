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
    public class MeetingFunction
    {
        private readonly IMeetingService _meetings;
        private readonly IWebRtcSignalingService _signaling;
        private static readonly JsonSerializerOptions _json = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            PropertyNameCaseInsensitive = true,
        };

        public MeetingFunction(IMeetingService meetings, IWebRtcSignalingService signaling)
        {
            _meetings = meetings;
            _signaling = signaling;
        }

        private static string? GetQueryValue(string query, string key)
        {
            if (string.IsNullOrWhiteSpace(query)) return null;
            var q = query.TrimStart('?');
            foreach (var part in q.Split('&', StringSplitOptions.RemoveEmptyEntries))
            {
                var kv = part.Split('=', 2);
                if (kv.Length == 2 && string.Equals(kv[0], key, StringComparison.OrdinalIgnoreCase))
                    return Uri.UnescapeDataString(kv[1]);
            }
            return null;
        }

        [Function("CreateMeeting")]
        public async Task<HttpResponseData> Create(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "meetings")] HttpRequestData req)
        {
            try
            {
                var body = await new StreamReader(req.Body).ReadToEndAsync();
                var dto = JsonSerializer.Deserialize<MeetingCreateDto>(body, _json);
                if (dto == null || string.IsNullOrWhiteSpace(dto.Title) || dto.CreatedBy == Guid.Empty)
                {
                    var bad = req.CreateResponse(HttpStatusCode.BadRequest);
                    await bad.WriteAsJsonAsync(new { message = "Title and createdBy are required." });
                    return bad;
                }
                if (!dto.ProjectId.HasValue || dto.ProjectId == Guid.Empty)
                {
                    var bad = req.CreateResponse(HttpStatusCode.BadRequest);
                    await bad.WriteAsJsonAsync(new { message = "Select a project before scheduling a meeting." });
                    return bad;
                }
                var saved = await _meetings.CreateAsync(dto);
                var resp = req.CreateResponse(HttpStatusCode.Created);
                resp.Headers.Add("Content-Type", "application/json");
                await resp.WriteStringAsync(JsonSerializer.Serialize(saved, _json));
                return resp;
            }
            catch (UnauthorizedAccessException ex)
            {
                var err = req.CreateResponse(HttpStatusCode.Forbidden);
                await err.WriteAsJsonAsync(new { message = ex.Message });
                return err;
            }
            catch (InvalidOperationException ex)
            {
                var err = req.CreateResponse(HttpStatusCode.BadRequest);
                await err.WriteAsJsonAsync(new { message = ex.Message });
                return err;
            }
            catch (Exception ex)
            {
                var err = req.CreateResponse(HttpStatusCode.InternalServerError);
                await err.WriteAsJsonAsync(new
                {
                    message = "Failed to create meeting. Ensure meeting tables exist (run Documentation/MEETING_MODULE_UPGRADE.sql).",
                    detail = ex.InnerException?.Message ?? ex.Message,
                });
                return err;
            }
        }

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

        [Function("VerifyMeetingJoinCode")]
        public async Task<HttpResponseData> VerifyJoinCode(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "meetings/{meetingId:guid}/verify-code")] HttpRequestData req,
            Guid meetingId)
        {
            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var dto = JsonSerializer.Deserialize<MeetingJoinCodeVerifyDto>(body, _json);
            if (dto == null || dto.UserId == Guid.Empty || string.IsNullOrWhiteSpace(dto.JoinCode))
            {
                var bad = req.CreateResponse(HttpStatusCode.BadRequest);
                await bad.WriteAsJsonAsync(new { message = "userId and joinCode are required.", ok = false });
                return bad;
            }
            var ok = await _meetings.VerifyJoinCodeAsync(meetingId, dto.UserId, dto.JoinCode);
            var resp = req.CreateResponse(ok ? HttpStatusCode.OK : HttpStatusCode.Unauthorized);
            await resp.WriteAsJsonAsync(new { ok });
            return resp;
        }

        [Function("GetMeetingParticipantRoster")]
        public async Task<HttpResponseData> ParticipantRoster(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "meetings/{meetingId:guid}/participant-roster")] HttpRequestData req,
            Guid meetingId)
        {
            var list = await _meetings.GetParticipantRosterAsync(meetingId);
            var resp = req.CreateResponse(HttpStatusCode.OK);
            await resp.WriteAsJsonAsync(list);
            return resp;
        }

        [Function("GetMeetingJoinStatus")]
        public async Task<HttpResponseData> JoinStatus(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "meetings/{meetingId:guid}/join-status/{userId:guid}")] HttpRequestData req,
            Guid meetingId,
            Guid userId)
        {
            var status = await _meetings.GetJoinStatusAsync(meetingId, userId);
            if (status == null) return req.CreateResponse(HttpStatusCode.NotFound);
            var resp = req.CreateResponse(HttpStatusCode.OK);
            resp.Headers.Add("Content-Type", "application/json");
            await resp.WriteStringAsync(JsonSerializer.Serialize(status, _json));
            return resp;
        }

        [Function("ResolveMeetingParticipants")]
        public async Task<HttpResponseData> ResolveParticipants(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "meetings/project/{projectId:guid}/participants")] HttpRequestData req,
            Guid projectId)
        {
            var ids = await _meetings.ResolveProjectParticipantIdsAsync(projectId);
            var resp = req.CreateResponse(HttpStatusCode.OK);
            await resp.WriteAsJsonAsync(new { participantUserIds = ids });
            return resp;
        }

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

        [Function("UpcomingMeetingsForUser")]
        public async Task<HttpResponseData> Upcoming(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "meetings/user/{userId:guid}/upcoming")] HttpRequestData req,
            Guid userId)
        {
            try
            {
                var list = await _meetings.GetUpcomingForUserAsync(userId);
                var resp = req.CreateResponse(HttpStatusCode.OK);
                resp.Headers.Add("Content-Type", "application/json");
                await resp.WriteStringAsync(JsonSerializer.Serialize(list, _json));
                return resp;
            }
            catch (Exception ex)
            {
                var err = req.CreateResponse(HttpStatusCode.InternalServerError);
                await err.WriteAsJsonAsync(new
                {
                    message = "Failed to load upcoming meetings.",
                    detail = ex.InnerException?.Message ?? ex.Message,
                });
                return err;
            }
        }

        [Function("ActiveMeetingsForUser")]
        public async Task<HttpResponseData> Active(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "meetings/user/{userId:guid}/active")] HttpRequestData req,
            Guid userId)
        {
            var list = await _meetings.GetActiveForUserAsync(userId);
            var resp = req.CreateResponse(HttpStatusCode.OK);
            await resp.WriteAsJsonAsync(list);
            return resp;
        }

        [Function("MeetingHistoryForUser")]
        public async Task<HttpResponseData> History(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "meetings/user/{userId:guid}/history")] HttpRequestData req,
            Guid userId)
        {
            var list = await _meetings.GetHistoryForUserAsync(userId);
            var resp = req.CreateResponse(HttpStatusCode.OK);
            await resp.WriteAsJsonAsync(list);
            return resp;
        }

        [Function("ConductedMeetingsForManager")]
        public async Task<HttpResponseData> ConductedForManager(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "meetings/manager/{managerId:guid}/conducted")] HttpRequestData req,
            Guid managerId)
        {
            var list = await _meetings.GetConductedForManagerAsync(managerId);
            var resp = req.CreateResponse(HttpStatusCode.OK);
            await resp.WriteAsJsonAsync(list);
            return resp;
        }

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

        [Function("GetMeetingSprintPreview")]
        public async Task<HttpResponseData> SprintPreview(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "meetings/project/{projectId:guid}/sprint-preview")] HttpRequestData req,
            Guid projectId)
        {
            try
            {
                var atRaw = GetQueryValue(req.Url.Query, "at");
                if (string.IsNullOrWhiteSpace(atRaw) || !DateTime.TryParse(atRaw, out var at))
                {
                    var bad = req.CreateResponse(HttpStatusCode.BadRequest);
                    await bad.WriteAsJsonAsync(new { message = "Query parameter 'at' (ISO date/time) is required." });
                    return bad;
                }
                var preview = await _meetings.GetSprintPreviewAsync(projectId, at);
                var resp = req.CreateResponse(HttpStatusCode.OK);
                await resp.WriteAsJsonAsync(preview);
                return resp;
            }
            catch (InvalidOperationException ex)
            {
                var err = req.CreateResponse(HttpStatusCode.BadRequest);
                await err.WriteAsJsonAsync(new { message = ex.Message });
                return err;
            }
        }

        [Function("SaveMeetingParticipantTranscript")]
        public async Task<HttpResponseData> SaveParticipantTranscript(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "meetings/{meetingId:guid}/participant-transcript")] HttpRequestData req,
            Guid meetingId)
        {
            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var dto = JsonSerializer.Deserialize<MeetingParticipantTranscriptSaveDto>(body, _json);
            if (dto == null || dto.UserId == Guid.Empty)
            {
                var bad = req.CreateResponse(HttpStatusCode.BadRequest);
                await bad.WriteAsJsonAsync(new { message = "userId and transcriptText are required." });
                return bad;
            }
            var ok = await _meetings.SaveParticipantTranscriptAsync(meetingId, dto.UserId, dto.TranscriptText ?? string.Empty);
            var resp = req.CreateResponse(ok ? HttpStatusCode.OK : HttpStatusCode.NotFound);
            await resp.WriteAsJsonAsync(new { ok });
            return resp;
        }

        [Function("GetMeetingParticipantTranscripts")]
        public async Task<HttpResponseData> GetParticipantTranscripts(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "meetings/{meetingId:guid}/participant-transcripts")] HttpRequestData req,
            Guid meetingId)
        {
            var list = await _meetings.GetParticipantTranscriptsAsync(meetingId);
            var resp = req.CreateResponse(HttpStatusCode.OK);
            await resp.WriteAsJsonAsync(list);
            return resp;
        }

        [Function("FinalizeMeeting")]
        public async Task<HttpResponseData> FinalizeMeeting(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "meetings/{meetingId:guid}/finalize")] HttpRequestData req,
            Guid meetingId)
        {
            var body = await new StreamReader(req.Body).ReadToEndAsync();
            Guid requestedBy = Guid.Empty;
            if (!string.IsNullOrWhiteSpace(body))
            {
                using var doc = JsonDocument.Parse(body);
                if (doc.RootElement.TryGetProperty("requestedBy", out var rb)
                    && Guid.TryParse(rb.GetString(), out var uid))
                    requestedBy = uid;
            }

            var result = await _meetings.TryFinalizeMeetingAsync(meetingId, requestedBy);
            var resp = req.CreateResponse(result == null ? HttpStatusCode.NoContent : HttpStatusCode.OK);
            if (result != null)
                await resp.WriteAsJsonAsync(result);
            return resp;
        }

        [Function("AnalyzeMeeting")]
        public async Task<HttpResponseData> Analyze(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "meetings/{meetingId:guid}/analyze")] HttpRequestData req,
            Guid meetingId)
        {
            try
            {
                var body = await new StreamReader(req.Body).ReadToEndAsync();
                Guid requestedBy = Guid.Empty;
                if (!string.IsNullOrWhiteSpace(body))
                {
                    using var doc = JsonDocument.Parse(body);
                    if (doc.RootElement.TryGetProperty("requestedBy", out var rb)
                        && Guid.TryParse(rb.GetString(), out var uid))
                        requestedBy = uid;
                }
                var result = await _meetings.AnalyzeMeetingAsync(meetingId, requestedBy);
                var resp = req.CreateResponse(HttpStatusCode.OK);
                await resp.WriteAsJsonAsync(result);
                return resp;
            }
            catch (TaskCanceledException ex)
            {
                var err = req.CreateResponse(HttpStatusCode.GatewayTimeout);
                await err.WriteAsJsonAsync(new { message = "AI analyzer timed out", detail = ex.Message });
                return err;
            }
            catch (HttpRequestException ex)
            {
                var err = req.CreateResponse(HttpStatusCode.BadGateway);
                await err.WriteAsJsonAsync(new { message = "AI analyzer unreachable", detail = ex.Message });
                return err;
            }
            catch (Exception ex)
            {
                var err = req.CreateResponse(HttpStatusCode.InternalServerError);
                await err.WriteAsJsonAsync(new { message = ex.Message });
                return err;
            }
        }

        [Function("PostWebRtcSignal")]
        public async Task<HttpResponseData> PostWebRtcSignal(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "meetings/{roomId}/webrtc/signal")] HttpRequestData req,
            string roomId)
        {
            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var dto = JsonSerializer.Deserialize<WebRtcSignalPostDto>(body, _json);
            if (dto == null || dto.FromUserId == Guid.Empty || string.IsNullOrWhiteSpace(dto.Type) || string.IsNullOrWhiteSpace(roomId))
            {
                var bad = req.CreateResponse(HttpStatusCode.BadRequest);
                await bad.WriteAsJsonAsync(new { message = "roomId, fromUserId and type are required." });
                return bad;
            }
            await _signaling.PostSignalAsync(roomId, dto);
            var resp = req.CreateResponse(HttpStatusCode.OK);
            await resp.WriteAsJsonAsync(new { ok = true });
            return resp;
        }

        [Function("GetWebRtcSignals")]
        public async Task<HttpResponseData> GetWebRtcSignals(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "meetings/{roomId}/webrtc/signals")] HttpRequestData req,
            string roomId)
        {
            var userIdRaw = GetQueryValue(req.Url.Query, "userId");
            var sinceRaw = GetQueryValue(req.Url.Query, "since");
            if (!Guid.TryParse(userIdRaw, out var userId) || string.IsNullOrWhiteSpace(roomId))
            {
                var bad = req.CreateResponse(HttpStatusCode.BadRequest);
                await bad.WriteAsJsonAsync(new { message = "roomId and userId query parameter are required." });
                return bad;
            }
            var since = DateTime.UtcNow.AddMinutes(-5);
            if (!string.IsNullOrWhiteSpace(sinceRaw) && DateTime.TryParse(sinceRaw, out var parsed))
                since = parsed.ToUniversalTime();

            var signals = await _signaling.GetSignalsAsync(roomId, userId, since);
            var resp = req.CreateResponse(HttpStatusCode.OK);
            await resp.WriteAsJsonAsync(signals);
            return resp;
        }

        [Function("GetWebRtcPeers")]
        public async Task<HttpResponseData> GetWebRtcPeers(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "meetings/{roomId}/webrtc/peers")] HttpRequestData req,
            string roomId)
        {
            if (string.IsNullOrWhiteSpace(roomId))
            {
                var bad = req.CreateResponse(HttpStatusCode.BadRequest);
                await bad.WriteAsJsonAsync(new { message = "roomId is required." });
                return bad;
            }
            var peers = await _signaling.GetPeersAsync(roomId);
            var resp = req.CreateResponse(HttpStatusCode.OK);
            await resp.WriteAsJsonAsync(peers);
            return resp;
        }
    }
}
