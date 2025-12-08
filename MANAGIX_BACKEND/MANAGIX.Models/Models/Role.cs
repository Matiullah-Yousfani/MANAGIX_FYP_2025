using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MANAGIX.Models.Models
{
    public class Role
    {
        [Key]
        public Guid RoleId { get; set; } = Guid.NewGuid();

        [Required]
        public string RoleName { get; set; } = default!;

        public string? Description { get; set; }

        // Navigation
        public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
    }
}
