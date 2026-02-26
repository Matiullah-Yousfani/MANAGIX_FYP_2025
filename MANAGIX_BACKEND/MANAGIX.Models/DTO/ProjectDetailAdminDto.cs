using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MANAGIX.Models.DTO
{
    public class ProjectDetailAdminDto
    {
        public Guid ProjectId { get; set; }
        public string Title { get; set; } = null!;
        public string? Description { get; set; }
        public DateTime Deadline { get; set; }
        public decimal Budget { get; set; }
        public string Status { get; set; } = null!;

        // Milestones
        public List<MilestoneDto> Milestones { get; set; } = new List<MilestoneDto>();

        // Tasks
        public List<TaskItemDto> Tasks { get; set; } = new List<TaskItemDto>();

        // Teams assigned
        public List<TeamDto> Teams { get; set; } = new List<TeamDto>();

        // Members assigned via teams
        public List<UserDto> Members { get; set; } = new List<UserDto>();
    }
}
