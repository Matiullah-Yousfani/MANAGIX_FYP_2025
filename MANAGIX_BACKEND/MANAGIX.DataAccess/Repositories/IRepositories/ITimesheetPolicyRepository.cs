using MANAGIX.Models.Models;
using System.Threading.Tasks;

namespace MANAGIX.DataAccess.Repositories.IRepositories
{
    public interface ITimesheetPolicyRepository
    {
        Task<TimesheetPolicySettings> GetOrCreateAsync();
        void Update(TimesheetPolicySettings policy);
    }
}
