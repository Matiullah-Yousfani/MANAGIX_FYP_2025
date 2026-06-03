namespace MANAGIX.Utility
{
    /// <summary>Canonical role names stored in the database.</summary>
    public static class AppRoles
    {
        public const string Admin = "Admin";
        public const string Manager = "Manager";
        public const string Employee = "Employee";
        /// <summary>Single QA role in DB — do not create a separate "QA" row.</summary>
        public const string QualityAssurance = "Quality Assurance";

        public static bool IsQualityAssurance(string? roleName)
        {
            if (string.IsNullOrWhiteSpace(roleName)) return false;
            var r = roleName.Trim();
            return r.Equals(QualityAssurance, StringComparison.OrdinalIgnoreCase)
                || r.Equals("QA", StringComparison.OrdinalIgnoreCase);
        }

        public static bool Matches(string? actualRoleName, string canonicalRoleName)
        {
            if (string.IsNullOrWhiteSpace(actualRoleName)) return false;
            var r = actualRoleName.Trim();
            if (r.Equals(canonicalRoleName, StringComparison.OrdinalIgnoreCase))
                return true;
            if (canonicalRoleName == QualityAssurance && IsQualityAssurance(r))
                return true;
            if (canonicalRoleName == Employee && r.Contains("employ", StringComparison.OrdinalIgnoreCase))
                return true;
            if (canonicalRoleName == Manager && r.Contains("manager", StringComparison.OrdinalIgnoreCase))
                return true;
            if (canonicalRoleName == Admin && r.Contains("admin", StringComparison.OrdinalIgnoreCase))
                return true;
            return false;
        }
    }
}
