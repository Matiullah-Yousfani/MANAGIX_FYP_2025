using System;

namespace MANAGIX.Models.DTO
{
    public class TaskAllocationProjectDto
    {
        public Guid ProjectId { get; set; }
        public string Title { get; set; } = string.Empty;
        public int UnassignedTaskCount { get; set; }
    }
}
