using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MANAGIX.Models.DTO
{
    public class MilestoneUpdateDto
    {
        public string Title { get; set; } = null!;
        public string? Description { get; set; }
        public DateTime Deadline { get; set; }
        public decimal BudgetAllocated { get; set; }
        public string Status { get; set; } = "Pending";
    }
}
