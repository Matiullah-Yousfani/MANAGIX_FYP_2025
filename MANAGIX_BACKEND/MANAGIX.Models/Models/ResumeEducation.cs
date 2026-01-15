using System;
using System.ComponentModel.DataAnnotations;

namespace MANAGIX.Models.Models
{
    public class ResumeEducation
    {
        [Key]
        public Guid EducationId { get; set; } = Guid.NewGuid();

        [Required]
        public Guid UserId { get; set; }

        public string? Degree { get; set; }

        public string? Institution { get; set; }

        public string? Year { get; set; }

        public string? Details { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
