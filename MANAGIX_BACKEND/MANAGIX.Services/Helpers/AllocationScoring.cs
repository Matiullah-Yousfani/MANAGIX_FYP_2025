using MANAGIX.Models.DTO;
using System;
using System.Collections.Generic;
using System.Linq;

namespace MANAGIX.Services.Helpers
{
    // PHASE 1: Deterministic scoring used to validate / override LLM task-allocation output.
    //
    // Rationale (senior-dev note):
    //   The LLM (Python service on port 8002) is a soft signal — it can return non-existent UUIDs,
    //   inconsistent assignments, or ignore workload. We treat its output as a *hint* and re-score
    //   with this helper. The composite score is reproducible, explainable, and demo-friendly.
    //
    // Score = 0.55 * skillMatch + 0.30 * (1 - load/capacity) + 0.15 * approvalRate
    //
    //   skillMatch:    case-insensitive Jaccard-ish overlap of task.requiredSkills vs member.skills
    //                  (intersect / requiredSkills.Count). Returns 0.5 when no required skills are
    //                  declared so the score doesn't collapse to 0 for legacy tasks.
    //   load/capacity: clamped to [0, 1.5] — anyone over 100% gets penalised, over 150% gets 0.
    //   approvalRate:  EmployeePerformance.ApprovalRate already in [0, 1].
    public static class AllocationScoring
    {
        public const double WeightSkill = 0.55;
        public const double WeightCapacity = 0.30;
        public const double WeightApproval = 0.15;

        // 1.0 = empty schedule, 0.0 = at/over 150% capacity.
        public static double CapacityScore(decimal currentHours, decimal capacityHours)
        {
            if (capacityHours <= 0m) return 0.0;
            var ratio = (double)(currentHours / capacityHours);
            if (ratio <= 0) return 1.0;
            if (ratio >= 1.5) return 0.0;
            return Math.Max(0.0, 1.0 - (ratio / 1.5));
        }

        // Token-set overlap. Empty requiredSkills → neutral 0.5 (don't punish legacy tasks with no skill tags).
        public static double SkillMatchScore(IEnumerable<string>? requiredSkills, IEnumerable<string>? memberSkills)
        {
            var required = (requiredSkills ?? Array.Empty<string>())
                .Where(s => !string.IsNullOrWhiteSpace(s))
                .Select(s => s.Trim().ToLowerInvariant())
                .ToHashSet();

            if (required.Count == 0) return 0.5;

            var have = (memberSkills ?? Array.Empty<string>())
                .Where(s => !string.IsNullOrWhiteSpace(s))
                .Select(s => s.Trim().ToLowerInvariant())
                .ToHashSet();

            if (have.Count == 0) return 0.0;

            var intersect = required.Intersect(have).Count();
            return (double)intersect / required.Count;
        }

        public static double Composite(double skill, double capacity, double approval)
            => WeightSkill * skill + WeightCapacity * capacity + WeightApproval * approval;

        // Helper used by the post-pass in AiAllocationService.
        // Returns a member ranking for a single task — best first.
        public static List<(EmployeeInfoDto Member, double Score, double SkillScore, double CapacityScore, double ApprovalScore)> RankMembers(
            IEnumerable<string>? requiredSkills,
            IReadOnlyList<EmployeeInfoDto> members,
            IReadOnlyDictionary<Guid, decimal> currentHoursByMember,
            IReadOnlyDictionary<Guid, decimal> capacityByMember,
            IReadOnlyDictionary<Guid, double> approvalRateByMember)
        {
            var ranked = new List<(EmployeeInfoDto, double, double, double, double)>();
            foreach (var m in members)
            {
                var skill = SkillMatchScore(requiredSkills, m.Skills);
                var hours = currentHoursByMember.TryGetValue(m.UserId, out var h) ? h : 0m;
                var cap = capacityByMember.TryGetValue(m.UserId, out var c) ? c : 40m;
                var capScore = CapacityScore(hours, cap);
                var appr = approvalRateByMember.TryGetValue(m.UserId, out var a) ? a : 0.5;
                var total = Composite(skill, capScore, appr);
                ranked.Add((m, total, skill, capScore, appr));
            }
            return ranked.OrderByDescending(r => r.Item2).ToList();
        }
    }
}
