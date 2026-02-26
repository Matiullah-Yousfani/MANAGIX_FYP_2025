using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MANAGIX.Models.DTO
{
    public class TaskItemDto
    {
        public Guid TaskId { get; set; }
        public string Title { get; set; } = null!;
        public string? Description { get; set; }
        public string Status { get; set; } = null!;
        public Guid AssignedEmployeeId { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
