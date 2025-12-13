using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MANAGIX.Models.Models
{
    public class Team
    {
        [Key]
        public Guid TeamId { get; set; } = Guid.NewGuid();

        [Required]
        public string Name { get; set; } = null!;

        [Required]
        public Guid CreatedBy { get; set; } // ManagerId

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
