using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MANAGIX.Models.DTO
{
    public class LoginResultDto
    {
        public string? Token { get; set; }
        public string Message { get; set; } = "";
        public bool Success { get; set; }
    }
}

