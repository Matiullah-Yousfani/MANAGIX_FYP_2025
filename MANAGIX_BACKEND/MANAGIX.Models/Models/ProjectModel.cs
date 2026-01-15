using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MANAGIX.Models.Models
{
    public class ProjectModel
    {
        [Key]
        // This tells EF that 'ModelId' is the Primary Key instead of looking for 'Id'
        public Guid ModelId { get; set; } = Guid.NewGuid();

        [Required]
        public string ModelName { get; set; } = null!;
    }
}