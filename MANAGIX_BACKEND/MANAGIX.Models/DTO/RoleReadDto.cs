using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MANAGIX.Models.DTO
{
    public class RoleReadDto
    {
        public Guid RoleId { get; set; }
        public string RoleName { get; set; } = default!;
        public string? Description { get; set; }
    }
}
