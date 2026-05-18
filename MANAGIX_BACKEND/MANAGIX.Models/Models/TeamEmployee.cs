using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MANAGIX.Models.Models
{
    public class TeamEmployee
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        public Guid TeamId { get; set; }

        [Required]
        public Guid EmployeeId { get; set; } // UserId

        // PHASE 0: Single-active-project enforcement.
        // ProjectId is denormalized here so we can put a filtered unique index on (EmployeeId) WHERE IsActive=1.
        // Nullable to allow ad-hoc team membership not yet linked to a project.
        public Guid? ProjectId { get; set; }

        // When false, this membership is historical and does NOT count against the single-active-project rule.
        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
