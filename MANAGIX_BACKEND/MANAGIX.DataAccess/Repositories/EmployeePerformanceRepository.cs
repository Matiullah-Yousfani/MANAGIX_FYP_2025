using MANAGIX.DataAccess.Data;
using MANAGIX.DataAccess.Repositories.IRepositories;
using MANAGIX.Models.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MANAGIX.DataAccess.Repositories
{
    public class EmployeePerformanceRepository:IEmployeePerformanceRepository
    {
        private readonly ApplicationDbContext _context;
        public EmployeePerformanceRepository(ApplicationDbContext context) => _context = context;

        public async Task AddAsync(EmployeePerformance performance) =>
            await _context.EmployeePerformances.AddAsync(performance);

        public async Task<EmployeePerformance?> GetByEmployeeAndProjectAsync(Guid employeeId, Guid projectId) =>
            await _context.EmployeePerformances
                          .FirstOrDefaultAsync(p => p.EmployeeId == employeeId && p.ProjectId == projectId);

        public async Task<List<EmployeePerformance>> GetByProjectIdAsync(Guid projectId) =>
            await _context.EmployeePerformances
                          .Where(p => p.ProjectId == projectId)
                          .ToListAsync();
    }
}
