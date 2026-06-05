using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MANAGIX.Models.DTO
{
    public class TaskUpdateDto
    {
        public string? Title { get; set; }
        public string? Description { get; set; }
        public string? Status { get; set; } // Todo / InProgress / Done
        public Guid? AssignedEmployeeId { get; set; }
        /** When true (manager/admin), clears assignee so the task is unassigned. */
        public bool ClearAssignee { get; set; }
        public DateTime? Deadline { get; set; }
        public string? Priority { get; set; } // High / Medium / Low
    }
}
