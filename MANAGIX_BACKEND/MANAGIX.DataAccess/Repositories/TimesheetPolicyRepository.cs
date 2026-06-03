using MANAGIX.DataAccess.Data;
using MANAGIX.DataAccess.Repositories.IRepositories;
using MANAGIX.Models.Models;
using Microsoft.EntityFrameworkCore;
using System.Linq;
using System.Threading.Tasks;

namespace MANAGIX.DataAccess.Repositories
{
    public class TimesheetPolicyRepository : ITimesheetPolicyRepository
    {
        private readonly ApplicationDbContext _context;
        public TimesheetPolicyRepository(ApplicationDbContext context) => _context = context;

        public async Task<TimesheetPolicySettings> GetOrCreateAsync()
        {
            var row = await _context.TimesheetPolicySettings.OrderBy(p => p.Id).FirstOrDefaultAsync();
            if (row != null) return row;

            row = new TimesheetPolicySettings
            {
                StandardHoursPerDay = 8m,
                OvertimeGraceHours = 2m,
                DailyMaxHours = 12m,
            };
            await _context.TimesheetPolicySettings.AddAsync(row);
            await _context.SaveChangesAsync();
            return row;
        }

        public void Update(TimesheetPolicySettings policy) => _context.TimesheetPolicySettings.Update(policy);
    }
}
