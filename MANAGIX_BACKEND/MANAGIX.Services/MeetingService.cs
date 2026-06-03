using MANAGIX.DataAccess.Repositories.IRepositories;
using MANAGIX.Models.DTO;
using MANAGIX.Models.Models;
using MANAGIX.Utility;
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
            _aiPlannerUrl = (configuration["AiPlannerUrl"] ?? "http://127.0.0.1:8001").TrimEnd('/');
            _httpClient = new HttpClient { Timeout = TimeSpan.FromMinutes(2) };
        }

        public async Task<MeetingDto> CreateAsync(MeetingCreateDto input)
        {
            if (string.IsNullOrWhiteSpace(input.Title))
                throw new InvalidOperationException("Meeting title is required.");

            if (!input.ProjectId.HasValue || input.ProjectId == Guid.Empty)
                throw new InvalidOperationException("Meeting must belong to a project.");

            var creator = await _unitOfWork.Users.GetByIdAsync(input.CreatedBy);
            if (creator == null)
                throw new InvalidOperationException("Creator user not found.");

            var isManager = creator.UserRoles?.Any(ur =>
                ur.Role != null &&
                string.Equals(ur.Role.RoleName, "Manager", StringComparison.OrdinalIgnoreCase)) == true;
            if (!isManager)
                throw new UnauthorizedAccessException("Only managers can schedule meetings.");

            var project = await _unitOfWork.Projects.GetByIdAsync(input.ProjectId.Value);
            if (project == null)
                throw new InvalidOperationException("Project not found.");

            if (input.DurationMinutes < 5 || input.DurationMinutes > 480)
                throw new InvalidOperationException("Duration must be between 5 and 480 minutes.");

            var participantIds = input.ParticipantUserIds?.Where(id => id != Guid.Empty).Distinct().ToList()
                                 ?? new List<Guid>();
            if (participantIds.Count == 0)
                participantIds = await ResolveProjectParticipantIdsAsync(input.ProjectId.Value);

            if (participantIds.Count == 0)
                throw new InvalidOperationException("No project members found to invite.");

            var roomName = string.IsNullOrWhiteSpace(input.JitsiRoomName)
                ? $"Managix-{input.ProjectId.Value:N[..8]}-{DateTime.UtcNow:yyyyMMddHHmmss}"
                : input.JitsiRoomName.Trim();

            var meeting = new Meeting
            {
                ProjectId = input.ProjectId,
                Title = input.Title.Trim(),
                Description = input.Description?.Trim(),
                ScheduledAt = input.ScheduledAt.Kind == DateTimeKind.Unspecified
                    ? DateTime.SpecifyKind(input.ScheduledAt, DateTimeKind.Utc)
                    : input.ScheduledAt.ToUniversalTime(),
                DurationMinutes = input.DurationMinutes,
                JitsiRoomName = roomName,
                CreatedBy = input.CreatedBy,
                Status = "Scheduled",
            };

            meeting.MeetingId = Guid.NewGuid();
            meeting.MeetingLink = $"/meeting?meetingId={meeting.MeetingId}";

            await _unitOfWork.Meetings.AddAsync(meeting);

            foreach (var pid in participantIds.Distinct())
            {
                await _unitOfWork.MeetingParticipants.AddAsync(new MeetingParticipant
                {
                    MeetingId = meeting.MeetingId,
                    UserId = pid,
                    Role = pid == input.CreatedBy ? "Host" : "Attendee",
                });
            }

            await _unitOfWork.CompleteAsync();

            var endsAt = meeting.ScheduledAt.AddMinutes(meeting.DurationMinutes);
            var invitees = participantIds.Where(u => u != input.CreatedBy).Distinct();
            await _notifications.PublishToManyAsync(invitees, new NotificationCreateDto
            {
                Type = "MeetingInvite",
                Title = $"Meeting: {meeting.Title}",
                Body = $"{endsAt:u} — tap Join when the meeting window is active.",
                Link = meeting.MeetingLink,
            });

            return await BuildDto(meeting);
        }

        public async Task<List<Guid>> ResolveProjectParticipantIdsAsync(Guid projectId)
        {
            var ids = new HashSet<Guid>();

            var pt = await _unitOfWork.ProjectTeams.GetByProjectIdAsync(projectId);
            if (pt != null)
            {
                var teamMembers = await _unitOfWork.TeamEmployees.GetEmployeesByTeamIdAsync(pt.TeamId);
                foreach (var te in teamMembers)
                    ids.Add(te.EmployeeId);
            }

            var qaIds = await _unitOfWork.Users.GetUserIdsByRoleNameAsync(AppRoles.QualityAssurance);
            foreach (var q in qaIds)
                ids.Add(q);

            return ids.ToList();
        }

        public async Task<MeetingDto?> GetAsync(Guid meetingId)
        {
            await ExpirePastMeetingsAsync();
            var m = await _unitOfWork.Meetings.GetByIdAsync(meetingId);
            return m == null ? null : await BuildDto(m);
        }

        public async Task<List<MeetingDto>> GetByProjectAsync(Guid projectId)
        {
            await ExpirePastMeetingsAsync();
            var rows = await _unitOfWork.Meetings.GetByProjectAsync(projectId);
            var list = new List<MeetingDto>();
            foreach (var m in rows) list.Add(await BuildDto(m));
            return list;
        }

        public async Task<List<MeetingDto>> GetUpcomingForUserAsync(Guid userId)
        {
            await ExpirePastMeetingsAsync();
            var rows = await _unitOfWork.Meetings.GetUpcomingForUserAsync(userId);
            var list = new List<MeetingDto>();
            foreach (var m in rows) list.Add(await BuildDto(m));
            return list;
        }

        public async Task<MeetingJoinStatusDto?> GetJoinStatusAsync(Guid meetingId, Guid userId)
        {
            await ExpirePastMeetingsAsync();
            var m = await _unitOfWork.Meetings.GetByIdAsync(meetingId);
            if (m == null) return null;

            var isParticipant = await _unitOfWork.MeetingParticipants.ExistsAsync(meetingId, userId)
                || m.CreatedBy == userId;
            var (joinState, canJoin) = ComputeJoinAccess(m, isParticipant);

            return new MeetingJoinStatusDto
            {
                MeetingId = m.MeetingId,
                Title = m.Title,
                ScheduledAt = m.ScheduledAt,
                EndsAt = m.ScheduledAt.AddMinutes(m.DurationMinutes),
                Status = m.Status,
                JoinState = joinState,
                CanJoin = canJoin,
                IsParticipant = isParticipant,
                MeetingLink = m.MeetingLink,
                JitsiRoomName = m.JitsiRoomName,
            };
        }

        public async Task<int> ExpirePastMeetingsAsync()
        {
            var now = DateTime.UtcNow;
            var past = await _unitOfWork.Meetings.GetPastScheduledAsync(now);
            if (past.Count == 0) return 0;

            foreach (var m in past)
            {
                m.Status = "Expired";
                m.MeetingLink = null;
                _unitOfWork.Meetings.Update(m);
            }

            await _unitOfWork.CompleteAsync();
            return past.Count;
        }

        public async Task<bool> CompleteWithTranscriptAsync(Guid meetingId, string transcriptText)
        {
            var meeting = await _unitOfWork.Meetings.GetByIdAsync(meetingId);
            if (meeting == null) return false;

            meeting.TranscriptText = transcriptText;
            meeting.Status = "Completed";
            meeting.MeetingLink = null;
            _unitOfWork.Meetings.Update(meeting);
            await _unitOfWork.CompleteAsync();
            return true;
        }

        public async Task<ExtractTasksResponseDto> ExtractTasksAsync(Guid meetingId)
        {
            var meeting = await _unitOfWork.Meetings.GetByIdAsync(meetingId);
            if (meeting == null || string.IsNullOrWhiteSpace(meeting.TranscriptText))
                return new ExtractTasksResponseDto();

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
            var (_, canJoin) = ComputeJoinAccess(m, true);

            return new MeetingDto
            {
                MeetingId = m.MeetingId,
                ProjectId = m.ProjectId,
                Title = m.Title,
                Description = m.Description,
                ScheduledAt = m.ScheduledAt,
                EndsAt = m.ScheduledAt.AddMinutes(m.DurationMinutes),
                DurationMinutes = m.DurationMinutes,
                MeetingLink = m.MeetingLink,
                JitsiRoomName = m.JitsiRoomName,
                CreatedBy = m.CreatedBy,
                Status = m.Status,
                TranscriptText = m.TranscriptText,
                Participants = participants,
                JoinState = ComputeJoinState(m),
                CanJoin = canJoin,
            };
        }

        private static (string joinState, bool canJoin) ComputeJoinAccess(Meeting m, bool isParticipant)
        {
            var joinState = ComputeJoinState(m);
            var canJoin = isParticipant
                && joinState == "Active"
                && !string.Equals(m.Status, "Expired", StringComparison.OrdinalIgnoreCase)
                && !string.Equals(m.Status, "Cancelled", StringComparison.OrdinalIgnoreCase)
                && !string.IsNullOrWhiteSpace(m.MeetingLink);
            return (joinState, canJoin);
        }

        private static string ComputeJoinState(Meeting m)
        {
            if (string.Equals(m.Status, "Expired", StringComparison.OrdinalIgnoreCase)
                || string.Equals(m.Status, "Completed", StringComparison.OrdinalIgnoreCase)
                || string.Equals(m.Status, "Cancelled", StringComparison.OrdinalIgnoreCase))
                return "Expired";

            var now = DateTime.UtcNow;
            var start = m.ScheduledAt;
            var end = start.AddMinutes(m.DurationMinutes);

            if (now < start) return "BeforeStart";
            if (now >= start && now <= end) return "Active";
            return "Expired";
        }
    }
}
