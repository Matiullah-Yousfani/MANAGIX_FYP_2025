using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;

namespace MANAGIX.Utility
{
    public static class TextPreprocess
    {
        public const int DefaultMaxChars = 12000;

        public static string CleanForAi(string? text, int maxChars = DefaultMaxChars)
        {
            if (string.IsNullOrWhiteSpace(text))
                return string.Empty;

            var lines = text.Replace("\r\n", "\n").Replace('\t', ' ')
                .Split('\n')
                .Select(l => Regex.Replace(l.Trim(), @"\s+", " "))
                .Where(l => l.Length > 0)
                .ToList();

            var deduped = new List<string>();
            foreach (var line in lines)
            {
                if (deduped.Count == 0 || !string.Equals(deduped[^1], line, StringComparison.Ordinal))
                    deduped.Add(line);
            }

            var cleaned = string.Join("\n", deduped).Trim();
            if (cleaned.Length <= maxChars)
                return cleaned;

            var headLen = (int)(maxChars * 0.7);
            var tailLen = (int)(maxChars * 0.25);
            var sb = new StringBuilder();
            sb.Append(cleaned.AsSpan(0, headLen));
            sb.Append("\n\n[… middle section trimmed for AI …]\n\n");
            sb.Append(cleaned.AsSpan(cleaned.Length - tailLen));
            return sb.ToString()[..Math.Min(sb.Length, maxChars)];
        }
    }
}
