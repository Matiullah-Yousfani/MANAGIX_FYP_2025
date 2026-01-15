using System;
using System.ComponentModel.DataAnnotations;

namespace MANAGIX.Models.Models
{
    public class ResumeExperience
    {
        [Key]
        public Guid ExperienceId { get; set; } = Guid.NewGuid();

        [Required]
        public Guid UserId { get; set; }

        public string? Title { get; set; }

        public string? Company { get; set; }

        public string? Duration { get; set; }

        public string? Description { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
