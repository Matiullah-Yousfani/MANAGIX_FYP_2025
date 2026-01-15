using System;

namespace MANAGIX.Models.DTO
{
    public class ResumeUploadRequestDto
    {
        public string FileName { get; set; } = string.Empty;
        public string FileBase64 { get; set; } = string.Empty;
    }
}
