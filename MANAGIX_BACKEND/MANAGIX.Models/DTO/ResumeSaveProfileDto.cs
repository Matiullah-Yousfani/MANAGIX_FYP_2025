using System;
using System.Collections.Generic;

namespace MANAGIX.Models.DTO
{
    public class ResumeSaveProfileDto
    {
        public Guid UserId { get; set; }
        public string? Name { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? Summary { get; set; }
        public List<EducationDto> Education { get; set; } = new List<EducationDto>();
        public List<string> Skills { get; set; } = new List<string>();
        public List<ProjectDto> Projects { get; set; } = new List<ProjectDto>();
        public List<ExperienceDto> Experience { get; set; } = new List<ExperienceDto>();
    }
}
