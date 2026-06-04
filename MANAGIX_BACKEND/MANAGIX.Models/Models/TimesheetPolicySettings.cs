using System.ComponentModel.DataAnnotations;

namespace MANAGIX.Models.Models
{
    /// <summary>Org-wide timesheet rules (single row, Id = 1).</summary>
    public class TimesheetPolicySettings
    {
        [Key]
        public int Id { get; set; }

        public decimal StandardHoursPerDay { get; set; } = 8m;
        public decimal OvertimeGraceHours { get; set; } = 2m;
        public decimal DailyMaxHours { get; set; } = 12m;

        /// <summary>Min total clocked hours before employee can submit daily timesheet (0 = no minimum).</summary>
        public decimal MinimumSubmitHours { get; set; } = 0m;
    }
}
