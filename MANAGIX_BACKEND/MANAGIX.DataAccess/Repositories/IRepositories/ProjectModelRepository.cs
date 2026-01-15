using MANAGIX.DataAccess.Data;
using MANAGIX.DataAccess.Repositories.IRepositories;
using MANAGIX.Models.Models;
using Microsoft.EntityFrameworkCore;

namespace MANAGIX.DataAccess.Repository
{
    public class ProjectModelRepository : IProjectModelRepository
    {
        private readonly ApplicationDbContext _db;

        public ProjectModelRepository(ApplicationDbContext db)
        {
            _db = db;
        }

        public async Task<IEnumerable<ProjectModel>> GetAllAsync()
        {
            return await _db.ProjectModels.ToListAsync();
        }
    }
}