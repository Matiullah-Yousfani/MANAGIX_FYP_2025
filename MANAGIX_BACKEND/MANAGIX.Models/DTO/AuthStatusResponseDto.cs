using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MANAGIX.Models.DTO
{
    public class AuthStatusResponseDto
    {
        public Guid UserId { get; set; }
        public string Status { get; set; }   // Pending, Approved, Rejected
        public string Role { get; set; }
        public string? RejectionReason { get; set; }
    }
}
