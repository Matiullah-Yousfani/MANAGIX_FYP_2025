using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MANAGIX.Models.Models
{
    public class UserRequest
    {
        [Key]
        public Guid RequestId { get; set; } = Guid.NewGuid();

        [Required]
        public string FullName { get; set; } = default!;

        [Required]
        [EmailAddress]
        public string Email { get; set; } = default!;

        [Required]
        public string PasswordHash { get; set; } = default!;

        [Required]
        public Guid RoleId { get; set; }  // Requested role

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Required]
        public string Status { get; set; } = "Pending"; // Pending / Approved / Rejected

        public string? AdminComment { get; set; }
    }
}
