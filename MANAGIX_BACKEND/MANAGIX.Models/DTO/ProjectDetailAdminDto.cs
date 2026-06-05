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
        public Guid? ManagerId { get; set; }
        public string? ManagerName { get; set; }
        public Guid? CreatedBy { get; set; }
        public string? CreatedByName { get; set; }
        public DateTime? CreatedAt { get; set; }
        public bool IsClosed { get; set; }

        public List<MilestoneDto> Milestones { get; set; } = new List<MilestoneDto>();
        public List<AdminTaskDetailDto> Tasks { get; set; } = new List<AdminTaskDetailDto>();
        public List<AdminTeamDetailDto> Teams { get; set; } = new List<AdminTeamDetailDto>();
        public List<UserDto> Members { get; set; } = new List<UserDto>();
    }

    public class AdminTeamDetailDto
    {
        public Guid TeamId { get; set; }
        public string Name { get; set; } = null!;
        public Guid CreatedBy { get; set; }
        public string? CreatedByName { get; set; }
        public DateTime CreatedAt { get; set; }
        public int MemberCount { get; set; }
    }

    public class AdminTaskDetailDto
    {
        public Guid TaskId { get; set; }
        public string Title { get; set; } = null!;
        public string? Description { get; set; }
        public string Status { get; set; } = null!;
        public string? Priority { get; set; }
        public Guid? AssignedEmployeeId { get; set; }
        public string? AssignedEmployeeName { get; set; }
        public Guid? MilestoneId { get; set; }
        public string? MilestoneTitle { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
