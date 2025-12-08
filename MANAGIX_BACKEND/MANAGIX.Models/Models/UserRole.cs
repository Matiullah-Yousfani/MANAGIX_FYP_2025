using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MANAGIX.Models.Models
{
    public class UserRole
    {
        [Key]
        public Guid UserRoleId { get; set; } = Guid.NewGuid();

        [Required]
        public Guid UserId { get; set; }

        [Required]
        public Guid RoleId { get; set; }

        // Navigation
        [ForeignKey("UserId")]
        public User? User { get; set; }

        [ForeignKey("RoleId")]
        public Role? Role { get; set; }
    }
}
