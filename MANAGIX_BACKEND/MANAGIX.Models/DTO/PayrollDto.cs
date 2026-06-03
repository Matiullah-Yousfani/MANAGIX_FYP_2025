using System;
using System.Collections.Generic;

namespace MANAGIX.Models.DTO
{
    public class PayrollSummaryDto
    {
        public Guid? ProjectId { get; set; }
        public string? ProjectTitle { get; set; }
        public decimal TotalBudget { get; set; }
        public decimal TotalEstimatedLaborCost { get; set; }
        public decimal BudgetRemaining { get; set; }
        public List<PayrollEmployeeLineDto> Employees { get; set; } = new();
    }

    public class PayrollEmployeeLineDto
    {
        public Guid UserId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public decimal HourlyRate { get; set; }
        public decimal? MonthlySalary { get; set; }
        public decimal LoggedHours { get; set; }
        public decimal ClockedHours { get; set; }
        public decimal EstimatedHoursFallback { get; set; }
        /// <summary>Clocked | Estimated</summary>
        public string HoursSource { get; set; } = "Estimated";
        public decimal EstimatedCost { get; set; }
        public string EmployeeLevel { get; set; } = string.Empty;
    }
}
