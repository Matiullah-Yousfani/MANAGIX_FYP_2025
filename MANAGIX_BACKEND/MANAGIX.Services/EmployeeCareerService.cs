namespace MANAGIX.Services
{
    public static class EmployeeCareerService
    {
        /// <summary>Completed closed projects on MANAGIX drive career level.</summary>
        public static string ComputeLevel(int completedProjectsCount)
        {
            if (completedProjectsCount >= 6) return "Senior";
            if (completedProjectsCount >= 3) return "Intermediate";
            return "Junior";
        }
    }
}
