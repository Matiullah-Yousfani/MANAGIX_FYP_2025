using System;

namespace MANAGIX.Models.DTO
{
    public class ManagerTeamMemberDto
    {
        public Guid UserId { get; set; }
        public string FullName { get; set; } = string.Empty;
    }
}
