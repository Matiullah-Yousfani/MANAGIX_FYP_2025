using MANAGIX.DataAccess.Data;
using MANAGIX.DataAccess.Repositories.IRepositories;
using MANAGIX.DataAccess.Repository;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MANAGIX.DataAccess.Repositories
{
    public class UnitOfWork : IUnitOfWork
    {
        private readonly ApplicationDbContext _context;
        public IProjectModelRepository ProjectModels { get; private set; }

        public UnitOfWork(ApplicationDbContext context)
        {
            _context = context;

            Users = new UserRepository(_context);
            Roles = new RoleRepository(_context);
            UserProfiles = new UserProfileRepository(_context);
            UserRequests = new UserRequestRepository(_context);
            UserRoles = new UserRoleRepository(_context);
            Projects = new ProjectRepository(_context);
            Teams = new TeamRepository(_context);
            TeamEmployees = new TeamEmployeeRepository(_context);
            ProjectTeams = new ProjectTeamRepository(_context);
            Milestones = new MilestoneRepository(_context);
            Tasks = new TaskRepository(_context);
            TaskSubmissions = new TaskSubmissionRepository(_context);
            EmployeePerformances = new EmployeePerformanceRepository(_context);
            ProjectModels = new ProjectModelRepository(_context);

            // Resume Repositories
            ResumeEducations = new ResumeEducationRepository(_context);
            ResumeSkills = new ResumeSkillRepository(_context);
            ResumeProjects = new ResumeProjectRepository(_context);
            ResumeExperiences = new ResumeExperienceRepository(_context);
        }

        public IUserRepository Users { get; }


        public IRoleRepository Roles { get; }
        public IUserProfileRepository UserProfiles { get; }
        public IUserRequestRepository UserRequests { get; }
        public IUserRoleRepository UserRoles { get; }


        public IProjectRepository Projects { get; private set; }
        public ITeamRepository Teams { get; private set; }
        public ITeamEmployeeRepository TeamEmployees { get; private set; }
        public IProjectTeamRepository ProjectTeams { get; private set; }
        public IMilestoneRepository Milestones { get; private set; }
        public ITaskRepository Tasks { get; private set; }

        public IEmployeePerformanceRepository EmployeePerformances { get; private set; }
        public ITaskSubmissionRepository TaskSubmissions { get; private set; }

        // Resume Repositories
        public IResumeEducationRepository ResumeEducations { get; private set; }
        public IResumeSkillRepository ResumeSkills { get; private set; }
        public IResumeProjectRepository ResumeProjects { get; private set; }
        public IResumeExperienceRepository ResumeExperiences { get; private set; }

        public async Task<int> CompleteAsync() => await _context.SaveChangesAsync();

        public void Dispose() => _context.Dispose();
    }
}
