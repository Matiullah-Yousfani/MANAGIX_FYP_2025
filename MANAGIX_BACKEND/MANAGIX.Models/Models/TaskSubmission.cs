using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MANAGIX.Models.Models
{
    public class TaskSubmission
    {
        [Key]
        public Guid SubmissionId { get; set; } = Guid.NewGuid();

        [Required]
        public Guid TaskId { get; set; }
        [ForeignKey("TaskId")]
        public TaskItem? Task { get; set; }

        [Required]
        public Guid SubmittedBy { get; set; } // EmployeeId
        [ForeignKey("SubmittedBy")]
        public User? Employee { get; set; }

        public string? FilePath { get; set; }
        public string? Comment { get; set; }

        public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;

        public string Status { get; set; } = "Submitted"; // Submitted / Approved / Rejected

        public string? QAComment { get; set; }
        public DateTime? ReviewedAt { get; set; }
    }
}
