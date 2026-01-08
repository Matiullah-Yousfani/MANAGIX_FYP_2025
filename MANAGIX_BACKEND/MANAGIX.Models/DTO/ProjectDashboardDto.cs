using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MANAGIX.Models.DTO
{
    public class ProjectDashboardDto
    {
        public Guid? TeamId { get; set; }
        public Guid ProjectId { get; set; }
        public int TotalTasks { get; set; }
        public int CompletedTasks { get; set; }
        public int PendingTasks { get; set; }
        public int TotalMilestones { get; set; }
        public int CompletedMilestones { get; set; }
        public double ProgressPercentage { get; set; }
    }
}
