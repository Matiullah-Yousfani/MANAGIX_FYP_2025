using MANAGIX.DataAccess.Repositories.IRepositories;
using MANAGIX.Models.DTO;
using MANAGIX.Models.Models;
using Microsoft.Extensions.Configuration;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace MANAGIX.Services
{
    // PHASE 4: Meeting CRUD + AI extraction.
    //
    // AI extraction wires to the existing planner Python service (port 8001 by default) at
    // a new endpoint `/extract-tasks`. The endpoint reuses the prototype `task_extractor.py`
    // already living in the FE components folder (lifted there during a prior spike).
    //
    // Notification fan-out: when a meeting is created we publish a `MeetingInvite` to each
    // participant; when extracted tasks are confirmed (in the UI flow) the AI extractor
    // returns assignees and the frontend will call taskService.create + this service publishes
    // `TaskExtractedFromMeeting` notifications.
    public class MeetingService : IMeetingService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly INotificationService _notifications;
        private readonly HttpClient _httpClient;
        private readonly string _aiPlannerUrl;

        private static readonly JsonSerializerOptions _json = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            PropertyNameCaseInsensitive = true,
        };

        public MeetingService(
            IUnitOfWork unitOfWork,
            INotificationService notifications,
            IConfiguration configuration)
        {
            _unitOfWork = unitOfWork;
            _notifications = notifications;
            // Reuse the same default as the Layer-2 planner (`AiPlannerUrl` config key) so the
            // operator only has to point to one Python service.
            _aiPlannerUrl = (configuration["AiPlannerUrl"] ?? "http://127.0.0.1:8001").TrimEnd('/');
            _httpClient = new HttpClient { Timeout = TimeSpan.FromMinutes(2) };
        }

        public async Task<MeetingDto> CreateAsync(MeetingCreateDto input)
        {
            var meeting = new Meeting
            {
                ProjectId = input.ProjectId,
                Title = input.Title,
                ScheduledAt = input.ScheduledAt,
                DurationMinutes = input.DurationMinutes,
                JitsiRoomName = input.JitsiRoomName,
                CreatedBy = input.CreatedBy,
                Status = "Scheduled",
            };
            await _unitOfWork.Meetings.AddAsync(meeting);

            foreach (var pid in input.ParticipantUserIds.Distinct())
            {
                await _unitOfWork.MeetingParticipants.AddAsync(new MeetingParticipant
                {
                    MeetingId = meeting.MeetingId,
                    UserId = pid,
                    Role = "Attendee",
                });
            }

            await _unitOfWork.CompleteAsync();

            // Fan out invite notifications. Skip the creator — they don't need to invite themselves.
            var invitees = input.ParticipantUserIds
                .Where(u => u != input.CreatedBy)
                .Distinct();
            await _notifications.PublishToManyAsync(invitees, new NotificationCreateDto
            {
                Type = "MeetingInvite",
                Title = $"New meeting: {input.Title}",
                Body = $"Scheduled for {input.ScheduledAt:u} ({input.DurationMinutes} min).",
                Link = "/meeting",
            });

            return await BuildDto(meeting);
        }

        public async Task<MeetingDto?> GetAsync(Guid meetingId)
        {
            var m = await _unitOfWork.Meetings.GetByIdAsync(meetingId);
            return m == null ? null : await BuildDto(m);
        }

        public async Task<List<MeetingDto>> GetByProjectAsync(Guid projectId)
        {
            var rows = await _unitOfWork.Meetings.GetByProjectAsync(projectId);
            var list = new List<MeetingDto>();
            foreach (var m in rows) list.Add(await BuildDto(m));
            return list;
        }

        public async Task<List<MeetingDto>> GetUpcomingForUserAsync(Guid userId)
        {
            var rows = await _unitOfWork.Meetings.GetUpcomingForUserAsync(userId);
            var list = new List<MeetingDto>();
            foreach (var m in rows) list.Add(await BuildDto(m));
            return list;
        }

        public async Task<bool> CompleteWithTranscriptAsync(Guid meetingId, string transcriptText)
        {
            var meeting = await _unitOfWork.Meetings.GetByIdAsync(meetingId);
            if (meeting == null) return false;

            meeting.TranscriptText = transcriptText;
            meeting.Status = "Completed";
            _unitOfWork.Meetings.Update(meeting);
            await _unitOfWork.CompleteAsync();
            return true;
        }

        public async Task<ExtractTasksResponseDto> ExtractTasksAsync(Guid meetingId)
        {
            var meeting = await _unitOfWork.Meetings.GetByIdAsync(meetingId);
            if (meeting == null || string.IsNullOrWhiteSpace(meeting.TranscriptText))
                return new ExtractTasksResponseDto();

            // Build the team-context payload so the LLM can suggest assignees.
            var teamMembers = new List<object>();
            if (meeting.ProjectId.HasValue)
            {
                var pt = await _unitOfWork.ProjectTeams.GetByProjectIdAsync(meeting.ProjectId.Value);
                if (pt != null)
                {
                    var tes = await _unitOfWork.TeamEmployees.GetEmployeesByTeamIdAsync(pt.TeamId);
                    foreach (var te in tes)
                    {
                        var u = await _unitOfWork.Users.GetByIdAsync(te.EmployeeId);
                        var skills = await _unitOfWork.ResumeSkills.GetByUserIdAsync(te.EmployeeId);
                        if (u != null)
                        {
                            teamMembers.Add(new
                            {
                                userId = u.UserId.ToString(),
                                name = u.FullName,
                                skills = skills.Select(s => s.SkillName).ToList()
                            });
                        }
                    }
                }
            }

            var payload = new
            {
                transcript = meeting.TranscriptText,
                meetingTitle = meeting.Title,
                projectId = meeting.ProjectId?.ToString(),
                teamMembers,
            };

            var json = JsonSerializer.Serialize(payload, _json);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            try
            {
                var response = await _httpClient.PostAsync($"{_aiPlannerUrl}/extract-tasks", content);
                response.EnsureSuccessStatusCode();
                var body = await response.Content.ReadAsStringAsync();
                var result = JsonSerializer.Deserialize<ExtractTasksResponseDto>(body, _json);
                return result ?? new ExtractTasksResponseDto();
            }
            catch (TaskCanceledException)
            {
                throw new TaskCanceledException("AI extractor timed out.");
            }
            catch (HttpRequestException ex)
            {
                throw new HttpRequestException(
                    $"Cannot reach AI extractor at {_aiPlannerUrl}/extract-tasks. Is the planner Python service running? ({ex.Message})", ex);
            }
        }

        private async Task<MeetingDto> BuildDto(Meeting m)
        {
            var participants = await _unitOfWork.MeetingParticipants.GetUserIdsForMeetingAsync(m.MeetingId);
            return new MeetingDto
            {
                MeetingId = m.MeetingId,
                ProjectId = m.ProjectId,
                Title = m.Title,
                ScheduledAt = m.ScheduledAt,
                DurationMinutes = m.DurationMinutes,
                JitsiRoomName = m.JitsiRoomName,
                CreatedBy = m.CreatedBy,
                Status = m.Status,
                TranscriptText = m.TranscriptText,
                Participants = participants,
            };
        }
    }
}
