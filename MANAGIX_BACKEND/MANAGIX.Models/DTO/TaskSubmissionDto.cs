using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MANAGIX.Models.DTO
{
    public class TaskSubmissionDto
    {
        public Guid TaskId { get; set; }
        public string FileBase64 { get; set; } = string.Empty; // File content as Base64
        public string FileName { get; set; } // Add this
        public string? Comment { get; set; }
    }
}
