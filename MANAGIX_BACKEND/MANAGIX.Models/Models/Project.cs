using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MANAGIX.Models.Models
{
    public class Project
    {
        [Key]
        public Guid ProjectId { get; set; } = Guid.NewGuid();

        [Required]
        public Guid CreatedBy { get; set; } // Manager/Admin UserId

        [Required]
        public string Title { get; set; } = null!;

        public string? Description { get; set; }

        public DateTime Deadline { get; set; }

        public decimal Budget { get; set; }

        public string Status { get; set; } = "New"; // New/InProgress/Completed

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
