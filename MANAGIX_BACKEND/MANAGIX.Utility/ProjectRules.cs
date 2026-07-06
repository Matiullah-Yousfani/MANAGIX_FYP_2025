namespace MANAGIX.Utility
{
    /// <summary>Shared project creation constraints (frontend mirrors these).</summary>
    public static class ProjectRules
    {
        public const int MinDescriptionChars = 200;
        public const decimal MinBudgetUsd = 50m;

        public static string? ValidateDescription(string? description)
            => DescriptionQuality.Validate(description);

        public static string? ValidateBudget(decimal budget)
        {
            if (budget < MinBudgetUsd)
                return $"Project budget must be at least ${MinBudgetUsd:0}.";
            return null;
        }
    }
}
