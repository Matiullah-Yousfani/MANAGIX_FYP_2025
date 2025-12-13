using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MANAGIX.Models.DTO
{
    public class TaskCreateDto
    {
        public Guid ProjectId { get; set; }
        public Guid? MilestoneId { get; set; }
        public Guid AssignedEmployeeId { get; set; }
        public string Title { get; set; } = null!;
        public string? Description { get; set; }
        public string Status { get; set; } = "Todo";
    }
}
