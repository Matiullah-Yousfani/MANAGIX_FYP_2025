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
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace MANAGIX.Services
{
    public class MeetingService : IMeetingService
    {
        /// <summary>Default meeting length when end time is not supplied.</summary>
        public const int DefaultDurationMinutes = 60;

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

            var scheduledUtc = input.ScheduledAt.Kind == DateTimeKind.Unspecified
                ? DateTime.SpecifyKind(input.ScheduledAt, DateTimeKind.Utc)
                : input.ScheduledAt.ToUniversalTime();

            var durationMinutes = ResolveDurationMinutes(input, scheduledUtc);
            var sprintNumber = ComputeSprintNumber(project.CreatedAt, scheduledUtc);

            var participantIds = input.ParticipantUserIds?.Where(id => id != Guid.Empty).Distinct().ToList()
                                 ?? new List<Guid>();
            if (participantIds.Count == 0)
                participantIds = await ResolveProjectParticipantIdsAsync(input.ProjectId.Value);

            // Always include the scheduling manager.
            participantIds.Add(input.CreatedBy);
            participantIds = participantIds.Distinct().ToList();

            if (participantIds.Count == 0)
                throw new InvalidOperationException("No project members found to invite.");

            var projectKey = input.ProjectId.Value.ToString("N")[..8];
            var roomName = string.IsNullOrWhiteSpace(input.JitsiRoomName)
                ? $"Managix-{projectKey}-{DateTime.UtcNow:yyyyMMddHHmmss}"
                : input.JitsiRoomName.Trim();

            var meeting = new Meeting
            {
                ProjectId = input.ProjectId,
                Title = input.Title.Trim(),
                Description = input.Description?.Trim(),
                ScheduledAt = scheduledUtc,
                DurationMinutes = durationMinutes,
                SprintNumber = sprintNumber,
                JitsiRoomName = roomName,
                JoinCode = GenerateJoinCode(),
                CreatedBy = input.CreatedBy,
                Status = "Scheduled",
            };

            meeting.MeetingId = Guid.NewGuid();
            meeting.MeetingLink = BuildMeetingLink(meeting.MeetingId, meeting.JoinCode!);

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

            var saved = await _unitOfWork.Meetings.GetByIdAsync(meeting.MeetingId) ?? meeting;
            saved = await EnsureJoinCodeAsync(saved);

            var endsAt = GetEndsAt(saved);
            var invitees = participantIds.Where(u => u != input.CreatedBy).Distinct();
            try
            {
                await _notifications.PublishToManyAsync(invitees, new NotificationCreateDto
                {
                    Type = "MeetingInvite",
                    Title = $"Meeting: {saved.Title} (Sprint {sprintNumber})",
                    Body = $"{saved.ScheduledAt:u} — {endsAt:u}. Join code: {saved.JoinCode}. Enter this code when you open the meeting link.",
                    Link = saved.MeetingLink,
                });

                await _notifications.PublishAsync(input.CreatedBy, new NotificationCreateDto
                {
                    Type = "MeetingInvite",
                    Title = $"Meeting scheduled: {saved.Title}",
                    Body = $"Join code: {saved.JoinCode}. Share the link below with your team. Code is included in the link.",
                    Link = saved.MeetingLink,
                });
            }
            catch
            {
                // Meeting is saved even if notification fan-out fails (e.g. Notifications table missing).
            }

            saved.SprintNumber = sprintNumber;
            return await BuildDto(saved);
        }

        private static int ResolveDurationMinutes(MeetingCreateDto input, DateTime scheduledUtc)
        {
            if (input.EndsAt.HasValue)
            {
                var endUtc = input.EndsAt.Value.Kind == DateTimeKind.Unspecified
                    ? DateTime.SpecifyKind(input.EndsAt.Value, DateTimeKind.Utc)
                    : input.EndsAt.Value.ToUniversalTime();
                var minutes = (int)Math.Ceiling((endUtc - scheduledUtc).TotalMinutes);
                if (minutes < 5)
                    throw new InvalidOperationException("Meeting end time must be at least 5 minutes after start.");
                return minutes;
            }

            return input.DurationMinutes > 0 ? input.DurationMinutes : DefaultDurationMinutes;
        }

        private static DateTime GetEndsAt(Meeting m) =>
            m.ScheduledAt.AddMinutes(m.DurationMinutes > 0 ? m.DurationMinutes : DefaultDurationMinutes);

        public async Task<SprintPreviewDto> GetSprintPreviewAsync(Guid projectId, DateTime scheduledAt)
        {
            var project = await _unitOfWork.Projects.GetByIdAsync(projectId)
                ?? throw new InvalidOperationException("Project not found.");
            var utc = scheduledAt.Kind == DateTimeKind.Unspecified
                ? DateTime.SpecifyKind(scheduledAt, DateTimeKind.Utc)
                : scheduledAt.ToUniversalTime();
            var sprint = ComputeSprintNumber(project.CreatedAt, utc);
            return new SprintPreviewDto { SprintNumber = sprint, ProjectWeek = sprint };
        }

        public static int ComputeSprintNumber(DateTime projectCreatedAt, DateTime scheduledAtUtc)
        {
            var start = projectCreatedAt.Kind == DateTimeKind.Unspecified
                ? DateTime.SpecifyKind(projectCreatedAt, DateTimeKind.Utc)
                : projectCreatedAt.ToUniversalTime();
            var meeting = scheduledAtUtc.ToUniversalTime();
            var days = (meeting.Date - start.Date).TotalDays;
            if (days < 0) return 1;
            var week = (int)Math.Floor(days / 7.0) + 1;
            return Math.Max(1, week);
        }

        public async Task<List<Guid>> ResolveProjectParticipantIdsAsync(Guid projectId)
        {
            var ids = new HashSet<Guid>();

            var project = await _unitOfWork.Projects.GetByIdAsync(projectId);
            if (project != null && project.CreatedBy != Guid.Empty)
                ids.Add(project.CreatedBy);

            var pt = await _unitOfWork.ProjectTeams.GetByProjectIdAsync(projectId);
            if (pt != null)
            {
                var teamMembers = await _unitOfWork.TeamEmployees.GetEmployeesByTeamIdAsync(pt.TeamId);
                foreach (var te in teamMembers)
                    ids.Add(te.EmployeeId);
            }

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

        public async Task<List<MeetingDto>> GetActiveForUserAsync(Guid userId)
        {
            await ExpirePastMeetingsAsync();
            var rows = await _unitOfWork.Meetings.GetActiveForUserAsync(userId, DateTime.UtcNow);
            var list = new List<MeetingDto>();
            foreach (var m in rows) list.Add(await BuildDto(m));
            return list;
        }

        public async Task<List<MeetingDto>> GetHistoryForUserAsync(Guid userId)
        {
            var rows = await _unitOfWork.Meetings.GetHistoryForUserAsync(userId);
            var list = new List<MeetingDto>();
            foreach (var m in rows) list.Add(await BuildDto(m));
            return list;
        }

        public async Task<List<MeetingDto>> GetConductedForManagerAsync(Guid managerId)
        {
            var rows = await _unitOfWork.Meetings.GetConductedForManagerAsync(managerId);
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
            var (joinState, canJoin, linkVisible) = ComputeJoinAccess(m, isParticipant);

            return new MeetingJoinStatusDto
            {
                MeetingId = m.MeetingId,
                Title = m.Title,
                ScheduledAt = m.ScheduledAt,
                EndsAt = GetEndsAt(m),
                LinkExpiresAt = GetEndsAt(m),
                SprintNumber = await ResolveSprintNumberAsync(m),
                Status = m.Status,
                JoinState = joinState,
                CanJoin = canJoin,
                LinkVisible = linkVisible,
                IsParticipant = isParticipant,
                MeetingLink = linkVisible ? m.MeetingLink : null,
                JitsiRoomName = m.JitsiRoomName,
            };
        }

        public async Task<bool> VerifyJoinCodeAsync(Guid meetingId, Guid userId, string joinCode)
        {
            if (string.IsNullOrWhiteSpace(joinCode)) return false;

            var m = await _unitOfWork.Meetings.GetByIdAsync(meetingId);
            if (m == null) return false;
            m = await EnsureJoinCodeAsync(m);
            if (string.IsNullOrWhiteSpace(m.JoinCode)) return false;

            var isParticipant = await _unitOfWork.MeetingParticipants.ExistsAsync(meetingId, userId)
                || m.CreatedBy == userId;
            if (!isParticipant) return false;

            var (_, canJoin, _) = ComputeJoinAccess(m, isParticipant);
            if (!canJoin) return false;

            return string.Equals(
                m.JoinCode.Trim(),
                joinCode.Trim(),
                StringComparison.OrdinalIgnoreCase);
        }

        public async Task<List<MeetingParticipantDetailDto>> GetParticipantRosterAsync(Guid meetingId)
        {
            var rows = await _unitOfWork.MeetingParticipants.GetByMeetingAsync(meetingId);
            var list = new List<MeetingParticipantDetailDto>();
            foreach (var row in rows)
            {
                var u = await _unitOfWork.Users.GetByIdAsync(row.UserId);
                list.Add(new MeetingParticipantDetailDto
                {
                    UserId = row.UserId,
                    UserName = u?.FullName ?? "Participant",
                    Role = row.Role,
                });
            }
            return list.OrderBy(p => p.UserName).ToList();
        }

        public async Task<int> ExpirePastMeetingsAsync()
        {
            try
            {
                var now = DateTime.UtcNow;
                var toExpire = await _unitOfWork.Meetings.GetMeetingsNeedingExpirationAsync(now);
                if (toExpire.Count == 0) return 0;

                foreach (var m in toExpire)
                {
                    m.Status = "Expired";
                    m.MeetingLink = null;
                    _unitOfWork.Meetings.Update(m);
                }

                await _unitOfWork.CompleteAsync();
                return toExpire.Count;
            }
            catch
            {
                return 0;
            }
        }

        public async Task<bool> SaveParticipantTranscriptAsync(Guid meetingId, Guid userId, string transcriptText)
        {
            if (string.IsNullOrWhiteSpace(transcriptText)) return false;

            var meeting = await _unitOfWork.Meetings.GetByIdAsync(meetingId);
            if (meeting == null) return false;

            var isParticipant = await _unitOfWork.MeetingParticipants.ExistsAsync(meetingId, userId)
                || meeting.CreatedBy == userId;
            if (!isParticipant) return false;

            try
            {
                var existing = await _unitOfWork.MeetingParticipantTranscripts.GetAsync(meetingId, userId);
                if (existing != null)
                {
                    existing.TranscriptText = transcriptText.Trim();
                    _unitOfWork.MeetingParticipantTranscripts.Update(existing);
                }
                else
                {
                    await _unitOfWork.MeetingParticipantTranscripts.AddAsync(new MeetingParticipantTranscript
                    {
                        MeetingId = meetingId,
                        UserId = userId,
                        TranscriptText = transcriptText.Trim(),
                    });
                }

                await _unitOfWork.CompleteAsync();

                if (DateTime.UtcNow >= GetEndsAt(meeting))
                    await TryFinalizeMeetingAsync(meetingId, userId);

                return true;
            }
            catch
            {
                // Table not created yet — fall back to combined transcript on the meeting row.
                meeting.TranscriptText = transcriptText.Trim();
                _unitOfWork.Meetings.Update(meeting);
                await _unitOfWork.CompleteAsync();
                return true;
            }
        }

        public async Task<List<MeetingParticipantTranscriptDto>> GetParticipantTranscriptsAsync(Guid meetingId)
        {
            List<MeetingParticipantTranscript> rows;
            try
            {
                rows = await _unitOfWork.MeetingParticipantTranscripts.GetByMeetingAsync(meetingId);
            }
            catch
            {
                return new List<MeetingParticipantTranscriptDto>();
            }
            var list = new List<MeetingParticipantTranscriptDto>();
            foreach (var row in rows)
            {
                var u = await _unitOfWork.Users.GetByIdAsync(row.UserId);
                list.Add(new MeetingParticipantTranscriptDto
                {
                    UserId = row.UserId,
                    UserName = u?.FullName,
                    TranscriptText = row.TranscriptText,
                    CreatedAt = row.CreatedAt,
                });
            }
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
            var analysis = await AnalyzeMeetingAsync(meetingId, Guid.Empty);
            return new ExtractTasksResponseDto { Tasks = analysis.Tasks };
        }

        public async Task<MeetingAnalysisResponseDto?> TryFinalizeMeetingAsync(Guid meetingId, Guid requestedBy)
        {
            var meeting = await _unitOfWork.Meetings.GetByIdAsync(meetingId);
            if (meeting == null) return null;

            var participantRows = await GetParticipantTranscriptsAsync(meetingId);
            if (participantRows.Count == 0) return null;

            var now = DateTime.UtcNow;
            var ended = now >= GetEndsAt(meeting);
            var invited = await _unitOfWork.MeetingParticipants.GetUserIdsForMeetingAsync(meetingId);
            var allSubmitted = invited.Count > 0 && participantRows.Count >= invited.Count;
            if (!ended && !allSubmitted && !string.Equals(meeting.Status, "Completed", StringComparison.OrdinalIgnoreCase))
                return null;

            if (!string.IsNullOrWhiteSpace(meeting.SummaryText)
                && string.Equals(meeting.Status, "Completed", StringComparison.OrdinalIgnoreCase))
            {
                return BuildStoredAnalysis(meeting, participantRows);
            }

            return await AnalyzeMeetingAsync(meetingId, requestedBy);
        }

        public async Task<MeetingAnalysisResponseDto> AnalyzeMeetingAsync(Guid meetingId, Guid requestedBy)
        {
            var meeting = await _unitOfWork.Meetings.GetByIdAsync(meetingId);
            if (meeting == null)
                return new MeetingAnalysisResponseDto();

            var participantRows = await GetParticipantTranscriptsAsync(meetingId);
            var combined = BuildCombinedTranscript(meeting, participantRows);

            if (!string.IsNullOrWhiteSpace(combined))
            {
                meeting.TranscriptText = combined;
                meeting.Status = "Completed";
                meeting.MeetingLink = null;
                _unitOfWork.Meetings.Update(meeting);
                await _unitOfWork.CompleteAsync();
            }

            var teamMembers = await BuildTeamMemberPayload(meeting.ProjectId);
            var payload = new
            {
                transcript = combined,
                meetingTitle = meeting.Title,
                projectId = meeting.ProjectId?.ToString(),
                teamMembers,
                participantTranscripts = participantRows.Select(p => new
                {
                    userId = p.UserId.ToString(),
                    userName = p.UserName ?? "Participant",
                    transcript = p.TranscriptText,
                }),
            };

            MeetingAnalysisResponseDto result;
            try
            {
                var json = JsonSerializer.Serialize(payload, _json);
                var content = new StringContent(json, Encoding.UTF8, "application/json");
                var response = await _httpClient.PostAsync($"{_aiPlannerUrl}/analyze-meeting", content);
                response.EnsureSuccessStatusCode();
                var body = await response.Content.ReadAsStringAsync();
                result = JsonSerializer.Deserialize<MeetingAnalysisResponseDto>(body, _json)
                    ?? new MeetingAnalysisResponseDto();
            }
            catch
            {
                result = await FallbackExtractTasksAsync(combined, meeting, teamMembers, participantRows);
            }

            result.ParticipantTranscripts = participantRows;
            result.CombinedTranscript = combined;
            result.Finalized = true;

            meeting.SummaryText = result.CombinedSummary;
            meeting.MeetingNotesText = result.MeetingNotes;
            if (result.BacklogItems?.Count > 0)
                meeting.BacklogJson = JsonSerializer.Serialize(result.BacklogItems, _json);
            meeting.TranscriptText = combined;
            meeting.Status = "Completed";
            meeting.MeetingLink = null;
            _unitOfWork.Meetings.Update(meeting);
            await _unitOfWork.CompleteAsync();

            foreach (var alert in result.SpeedUpAlerts ?? new List<SpeedUpAlertDto>())
            {
                if (!alert.UserId.HasValue || alert.UserId == Guid.Empty) continue;
                await _notifications.PublishAsync(alert.UserId.Value, new NotificationCreateDto
                {
                    Type = "MeetingSpeedUp",
                    Title = "Speed up your work",
                    Body = alert.Message,
                    Link = meeting.ProjectId.HasValue ? $"/projects/{meeting.ProjectId}" : null,
                });
            }

            if (requestedBy != Guid.Empty && (result.Tasks?.Count ?? 0) > 0)
            {
                await _notifications.PublishAsync(requestedBy, new NotificationCreateDto
                {
                    Type = "TaskExtractedFromMeeting",
                    Title = $"AI found {result.Tasks.Count} task suggestion(s)",
                    Body = $"From meeting \"{meeting.Title}\" — review and create tasks in the meeting room.",
                    Link = $"/meeting?meetingId={meetingId}",
                });
            }

            return result;
        }

        private async Task<MeetingAnalysisResponseDto> FallbackExtractTasksAsync(
            string combined,
            Meeting meeting,
            List<object> teamMembers,
            List<MeetingParticipantTranscriptDto> participantRows)
        {
            if (string.IsNullOrWhiteSpace(combined))
                return new MeetingAnalysisResponseDto { ParticipantTranscripts = participantRows };

            var payload = new
            {
                transcript = combined,
                meetingTitle = meeting.Title,
                projectId = meeting.ProjectId?.ToString(),
                teamMembers,
            };
            var json = JsonSerializer.Serialize(payload, _json);
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync($"{_aiPlannerUrl}/extract-tasks", content);
            response.EnsureSuccessStatusCode();
            var body = await response.Content.ReadAsStringAsync();
            var tasks = JsonSerializer.Deserialize<ExtractTasksResponseDto>(body, _json);
            return new MeetingAnalysisResponseDto
            {
                Tasks = tasks?.Tasks ?? new List<ExtractedTaskDto>(),
                CombinedSummary = combined.Length > 500 ? combined[..500] + "…" : combined,
                ParticipantTranscripts = participantRows,
            };
        }

        private static MeetingAnalysisResponseDto BuildStoredAnalysis(
            Meeting meeting,
            List<MeetingParticipantTranscriptDto> participantRows)
        {
            var backlog = new List<BacklogItemDto>();
            if (!string.IsNullOrWhiteSpace(meeting.BacklogJson))
            {
                try
                {
                    backlog = JsonSerializer.Deserialize<List<BacklogItemDto>>(meeting.BacklogJson, _json)
                        ?? new List<BacklogItemDto>();
                }
                catch { /* ignore bad json */ }
            }

            return new MeetingAnalysisResponseDto
            {
                CombinedSummary = meeting.SummaryText,
                MeetingNotes = meeting.MeetingNotesText,
                CombinedTranscript = meeting.TranscriptText,
                BacklogItems = backlog,
                ParticipantTranscripts = participantRows,
                Finalized = true,
            };
        }

        private static string BuildCombinedTranscript(Meeting meeting, List<MeetingParticipantTranscriptDto> rows)
        {
            if (rows.Count == 0)
                return meeting.TranscriptText ?? string.Empty;

            var timed = new List<(int SortKey, string Line)>();
            foreach (var row in rows)
            {
                foreach (var raw in row.TranscriptText.Split('\n'))
                {
                    var line = raw.Trim();
                    if (string.IsNullOrWhiteSpace(line)) continue;
                    var key = ParseTimestampSortKey(line) ?? timed.Count;
                    timed.Add((key, line));
                }
            }

            if (timed.Count == 0)
            {
                var sb = new StringBuilder();
                foreach (var row in rows)
                {
                    sb.AppendLine($"=== {row.UserName ?? row.UserId.ToString()} ===");
                    sb.AppendLine(row.TranscriptText);
                    sb.AppendLine();
                }
                return sb.ToString().Trim();
            }

            return string.Join("\n", timed.OrderBy(t => t.SortKey).Select(t => t.Line));
        }

        private static int? ParseTimestampSortKey(string line)
        {
            var match = Regex.Match(line, @"^\[(\d{1,2}):(\d{2})(?::(\d{2}))?\]");
            if (!match.Success) return null;

            var h = int.Parse(match.Groups[1].Value);
            var m = int.Parse(match.Groups[2].Value);
            var s = match.Groups[3].Success ? int.Parse(match.Groups[3].Value) : 0;
            return h * 3600 + m * 60 + s;
        }

        private async Task<List<object>> BuildTeamMemberPayload(Guid? projectId)
        {
            var teamMembers = new List<object>();
            if (!projectId.HasValue) return teamMembers;

            var ids = await ResolveProjectParticipantIdsAsync(projectId.Value);
            foreach (var uid in ids)
            {
                var u = await _unitOfWork.Users.GetByIdAsync(uid);
                var skills = await _unitOfWork.ResumeSkills.GetByUserIdAsync(uid);
                if (u != null)
                {
                    teamMembers.Add(new
                    {
                        userId = u.UserId.ToString(),
                        name = u.FullName,
                        skills = skills.Select(s => s.SkillName).ToList(),
                    });
                }
            }
            return teamMembers;
        }

        private async Task<int> ResolveSprintNumberAsync(Meeting m)
        {
            if (m.SprintNumber > 0 && m.ProjectId == null)
                return m.SprintNumber;
            if (!m.ProjectId.HasValue)
                return m.SprintNumber > 0 ? m.SprintNumber : 1;
            try
            {
                var project = await _unitOfWork.Projects.GetByIdAsync(m.ProjectId.Value);
                if (project == null) return m.SprintNumber > 0 ? m.SprintNumber : 1;
                return ComputeSprintNumber(project.CreatedAt, m.ScheduledAt);
            }
            catch
            {
                return m.SprintNumber > 0 ? m.SprintNumber : 1;
            }
        }

        private async Task<int> SafeTranscriptCountAsync(Guid meetingId)
        {
            try
            {
                return (await _unitOfWork.MeetingParticipantTranscripts.GetByMeetingAsync(meetingId)).Count;
            }
            catch
            {
                return 0;
            }
        }

        private async Task<MeetingDto> BuildDto(Meeting m)
        {
            m = await EnsureJoinCodeAsync(m);
            var participants = await _unitOfWork.MeetingParticipants.GetUserIdsForMeetingAsync(m.MeetingId);
            var transcriptCount = await SafeTranscriptCountAsync(m.MeetingId);
            var (_, canJoin, linkVisible) = ComputeJoinAccess(m, true);
            var sprintNumber = await ResolveSprintNumberAsync(m);

            return new MeetingDto
            {
                MeetingId = m.MeetingId,
                ProjectId = m.ProjectId,
                Title = m.Title,
                Description = m.Description,
                ScheduledAt = m.ScheduledAt,
                EndsAt = GetEndsAt(m),
                LinkExpiresAt = GetEndsAt(m),
                DurationMinutes = m.DurationMinutes,
                SprintNumber = sprintNumber,
                MeetingLink = linkVisible ? m.MeetingLink : null,
                JoinCode = m.JoinCode,
                JitsiRoomName = m.JitsiRoomName,
                CreatedBy = m.CreatedBy,
                Status = m.Status,
                TranscriptText = m.TranscriptText,
                SummaryText = m.SummaryText,
                MeetingNotesText = m.MeetingNotesText,
                BacklogItems = ParseBacklogItems(m.BacklogJson),
                Participants = participants,
                JoinState = ComputeJoinState(m),
                CanJoin = canJoin,
                LinkVisible = linkVisible,
                ParticipantTranscriptCount = transcriptCount,
            };
        }

        private static string GenerateJoinCode()
        {
            const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
            var rng = Random.Shared;
            return new string(Enumerable.Range(0, 6).Select(_ => chars[rng.Next(chars.Length)]).ToArray());
        }

        private static string BuildMeetingLink(Guid meetingId, string joinCode) =>
            $"/meeting?meetingId={meetingId}&code={Uri.EscapeDataString(joinCode)}";

        private async Task<Meeting> EnsureJoinCodeAsync(Meeting m)
        {
            var needsCode = string.IsNullOrWhiteSpace(m.JoinCode);
            var linkMissingCode = !string.IsNullOrWhiteSpace(m.MeetingLink)
                && !m.MeetingLink.Contains("code=", StringComparison.OrdinalIgnoreCase);

            if (!needsCode && !linkMissingCode)
                return m;

            if (needsCode)
                m.JoinCode = GenerateJoinCode();

            if (!string.IsNullOrWhiteSpace(m.MeetingLink) && linkMissingCode)
            {
                var sep = m.MeetingLink.Contains('?') ? "&" : "?";
                m.MeetingLink = $"{m.MeetingLink}{sep}code={Uri.EscapeDataString(m.JoinCode!)}";
            }
            else if (string.IsNullOrWhiteSpace(m.MeetingLink) && !string.IsNullOrWhiteSpace(m.JoinCode))
            {
                m.MeetingLink = BuildMeetingLink(m.MeetingId, m.JoinCode);
            }

            _unitOfWork.Meetings.Update(m);
            await _unitOfWork.CompleteAsync();
            return m;
        }

        private static List<BacklogItemDto> ParseBacklogItems(string? json)
        {
            if (string.IsNullOrWhiteSpace(json)) return new List<BacklogItemDto>();
            try
            {
                return JsonSerializer.Deserialize<List<BacklogItemDto>>(json, _json) ?? new List<BacklogItemDto>();
            }
            catch
            {
                return new List<BacklogItemDto>();
            }
        }

        private static (string joinState, bool canJoin, bool linkVisible) ComputeJoinAccess(Meeting m, bool isParticipant)
        {
            var joinState = ComputeJoinState(m);
            var linkVisible = !string.IsNullOrWhiteSpace(m.MeetingLink)
                && !string.Equals(m.Status, "Completed", StringComparison.OrdinalIgnoreCase)
                && !string.Equals(m.Status, "Cancelled", StringComparison.OrdinalIgnoreCase);

            var canJoin = isParticipant
                && joinState == "Active"
                && linkVisible;

            return (joinState, canJoin, linkVisible);
        }

        private static string ComputeJoinState(Meeting m)
        {
            if (string.Equals(m.Status, "Completed", StringComparison.OrdinalIgnoreCase)
                || string.Equals(m.Status, "Cancelled", StringComparison.OrdinalIgnoreCase))
                return "Expired";

            if (string.Equals(m.Status, "Expired", StringComparison.OrdinalIgnoreCase)
                || string.IsNullOrWhiteSpace(m.MeetingLink))
                return "Expired";

            var now = DateTime.UtcNow;
            var start = m.ScheduledAt;
            var end = GetEndsAt(m);

            if (now < start) return "BeforeStart";
            if (now >= start && now < end) return "Active";
            return "Expired";
        }
    }
}
