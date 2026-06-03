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
    }
}
