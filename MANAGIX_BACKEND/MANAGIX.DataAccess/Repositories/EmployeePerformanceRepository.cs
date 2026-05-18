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

        public void Remove(EmployeePerformance performance) =>
            _context.EmployeePerformances.Remove(performance);

        // PHASE 1: Cross-project average approval rate.
        // No history → 0.5 (neutral) so new joiners aren't penalised.
        public async Task<double> GetAverageApprovalRateAsync(Guid employeeId)
        {
            var rates = await _context.EmployeePerformances
                .Where(p => p.EmployeeId == employeeId)
                .Select(p => p.ApprovalRate)
                .ToListAsync();

            if (rates.Count == 0) return 0.5;
            return rates.Average();
        }
    }
}
