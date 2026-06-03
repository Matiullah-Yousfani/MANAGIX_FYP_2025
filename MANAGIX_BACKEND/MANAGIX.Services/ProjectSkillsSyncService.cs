using MANAGIX.DataAccess.Repositories.IRepositories;
using MANAGIX.Models.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;

namespace MANAGIX.Services
{
    /// <summary>
    /// When a project closes, merge task skills onto assignees' profiles for better future AI matching.
    /// </summary>
    public static class ProjectSkillsSyncService
    {
        public static async Task SyncAssigneeSkillsOnProjectCloseAsync(IUnitOfWork uow, Guid projectId)
        {
            var project = await uow.Projects.GetByIdAsync(projectId);
            if (project == null) return;

            var tasks = await uow.Tasks.GetByProjectIdAsync(projectId);
            var skillNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (var task in tasks)
            {
                foreach (var skill in ParseTaskSkills(task.RequiredSkillsJson))
                {
                    if (!string.IsNullOrWhiteSpace(skill))
                        skillNames.Add(skill.Trim());
                }
            }

            if (skillNames.Count == 0)
                return;

            var assigneeIds = tasks
                .Where(t => t.AssignedEmployeeId.HasValue && t.AssignedEmployeeId.Value != Guid.Empty)
                .Select(t => t.AssignedEmployeeId!.Value)
                .Distinct()
                .ToList();

            foreach (var userId in assigneeIds)
                await MergeSkillsForUserAsync(uow, userId, skillNames);
        }

        private static async Task MergeSkillsForUserAsync(
            IUnitOfWork uow,
            Guid userId,
            IEnumerable<string> newSkills)
        {
            var incoming = newSkills
                .Where(s => !string.IsNullOrWhiteSpace(s))
                .Select(s => s.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            if (incoming.Count == 0) return;

            var existingResume = await uow.ResumeSkills.GetByUserIdAsync(userId);
            var known = new HashSet<string>(
                existingResume.Select(s => s.SkillName),
                StringComparer.OrdinalIgnoreCase);

            var profile = await uow.UserProfiles.GetByUserIdAsync(userId);
            if (profile != null)
            {
                foreach (var s in ParseProfileSkills(profile.Skills))
                    known.Add(s);
            }

            foreach (var skill in incoming)
            {
                if (!known.Add(skill)) continue;
                await uow.ResumeSkills.AddAsync(new ResumeSkill
                {
                    UserId = userId,
                    SkillName = skill,
                    CreatedAt = DateTime.UtcNow,
                });
            }

            if (profile != null)
            {
                var merged = known.OrderBy(s => s, StringComparer.OrdinalIgnoreCase).ToList();
                profile.Skills = string.Join(", ", merged);
                uow.UserProfiles.Update(profile);
            }
        }

        private static List<string> ParseProfileSkills(string? raw) =>
            string.IsNullOrWhiteSpace(raw)
                ? new List<string>()
                : raw.Split(',', ';')
                    .Select(s => s.Trim())
                    .Where(s => s.Length > 0)
                    .ToList();

        private static List<string> ParseTaskSkills(string? json)
        {
            if (string.IsNullOrWhiteSpace(json)) return new List<string>();
            try
            {
                var parsed = JsonSerializer.Deserialize<List<string>>(json);
                return parsed?.Where(s => !string.IsNullOrWhiteSpace(s)).Select(s => s.Trim()).ToList()
                    ?? new List<string>();
            }
            catch
            {
                return json.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                    .ToList();
            }
        }
    }
}
