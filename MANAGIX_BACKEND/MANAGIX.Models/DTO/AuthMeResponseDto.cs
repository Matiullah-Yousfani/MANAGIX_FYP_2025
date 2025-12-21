using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MANAGIX.Models.DTO
{
    public class AuthMeResponseDto
    {
        public Guid UserId { get; set; }
        public string FullName { get; set; } = default!;
        public string Email { get; set; } = default!;
        public Guid RoleId { get; set; }
        public string RoleName { get; set; } = default!;
        public string Status { get; set; }   // Pending / Approved / Rejected
    }
}
