using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MANAGIX.Models.Models
{
    public class User
    {
        [Key]
        public Guid UserId { get; set; } = Guid.NewGuid();

        [Required]
        public string FullName { get; set; } = default!;

        [Required]
        [EmailAddress]
        public string Email { get; set; } = default!;

        [Required]
        public string PasswordHash { get; set; } = default!;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation: 1:1 with UserProfile
        public UserProfile? Profile { get; set; }

        // Navigation: Many-to-Many UserRoles
        public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
    }
}
