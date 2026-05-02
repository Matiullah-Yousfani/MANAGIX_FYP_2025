using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MANAGIX.Models.DTO
{
    public class TeamCreateDto
    {
        public string Name { get; set; } = string.Empty;

        /// <summary>Manager (creator) user id.</summary>
        public Guid CreatedBy { get; set; }
    }
}
