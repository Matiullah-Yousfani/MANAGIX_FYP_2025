using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MANAGIX.Models.DTO
{
    public class TeamDto
    {
        public Guid TeamId { get; set; }
        public string Name { get; set; } = null!;
    }
}
