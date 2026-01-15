using System;
using System.ComponentModel.DataAnnotations;

namespace MANAGIX.Models.Models
{
    public class ResumeProject
    {
        [Key]
        public Guid ProjectId { get; set; } = Guid.NewGuid();

        [Required]
        public Guid UserId { get; set; }

        public string? Title { get; set; }

        public string? Description { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
