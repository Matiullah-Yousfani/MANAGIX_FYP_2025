using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MANAGIX.DataAccess.Repositories.IRepositories
{
    public interface IUnitOfWork
    {
        IUserRepository Users { get; }
        IRoleRepository Roles { get; }
        IUserProfileRepository UserProfiles { get; }
        IUserRequestRepository UserRequests { get; }
        IUserRoleRepository UserRoles { get; }

        IProjectRepository Projects { get; }
        ITeamRepository Teams { get; }
        ITeamEmployeeRepository TeamEmployees { get; }
        IProjectTeamRepository ProjectTeams { get; }
        IMilestoneRepository Milestones { get; }
        ITaskRepository Tasks { get; }

        IEmployeePerformanceRepository EmployeePerformances { get; }

        ITaskSubmissionRepository TaskSubmissions { get; }

        IProjectModelRepository ProjectModels { get; }

        // Resume Repositories
        IResumeEducationRepository ResumeEducations { get; }
        IResumeSkillRepository ResumeSkills { get; }
        IResumeProjectRepository ResumeProjects { get; }
        IResumeExperienceRepository ResumeExperiences { get; }

        Task<int> CompleteAsync();
    }
}
