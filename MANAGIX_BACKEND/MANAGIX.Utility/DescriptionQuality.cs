using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;

namespace MANAGIX.Utility
{
    /// <summary>Semantic quality checks beyond minimum character count.</summary>
    public static class DescriptionQuality
    {
        public const int MinDistinctWords = 35;

        public static string? Validate(string? description)
        {
            var desc = (description ?? string.Empty).Trim();
            if (desc.Length < ProjectRules.MinDescriptionChars)
                return $"Project description must be at least {ProjectRules.MinDescriptionChars} characters.";

            var lower = desc.ToLowerInvariant();
            if (Regex.IsMatch(lower, @"lorem\s+ipsum|asdf{3,}|test\s+test\s+test|xxxx+|aaaa+|qwerty|keyboard\s+test"))
                return "Description looks like placeholder or filler text. Describe a real project with goals and deliverables.";

            var words = Regex.Split(desc, @"\W+")
                .Where(w => w.Length > 2)
                .ToList();
            if (words.Count < MinDistinctWords)
                return $"Description needs at least {MinDistinctWords} meaningful words (found {words.Count}).";

            var distinct = words.Distinct(StringComparer.OrdinalIgnoreCase).Count();
            if (distinct < MinDistinctWords)
                return $"Use more varied vocabulary — at least {MinDistinctWords} distinct words (found {distinct}).";

            var top = words.GroupBy(w => w.ToLowerInvariant())
                .OrderByDescending(g => g.Count())
                .First();
            if (top.Count() > Math.Max(8, (int)(words.Count * 0.12)))
                return $"The word \"{top.Key}\" is repeated too often. Write a substantive project brief.";

            if (!Regex.IsMatch(desc, @"[.!?]"))
                return "Write full sentences covering goals, users or stakeholders, scope, and expected outcomes.";

            return null;
        }
    }
}
