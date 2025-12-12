using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MANAGIX.Models.DTO
{
    public class ResumeUploadDto
    {
        public Guid UserId { get; set; }
        public string Resume { get; set; } = ""; // base64 encoded file

    }
}
