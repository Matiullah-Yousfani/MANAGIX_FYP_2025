using MANAGIX.DataAccess.Repositories.IRepositories;
using MANAGIX.Models.DTO;
using MANAGIX.Models.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace MANAGIX.Services
{
    public class ResumeService : IResumeService
    {
        private readonly IUnitOfWork _unitOfWork;

        public ResumeService(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        public async Task<ResumeSaveProfileDto> SaveResumeProfileAsync(ResumeSaveProfileDto dto)
        {
            // Get or create user profile
            var profile = await _unitOfWork.UserProfiles.GetByUserIdAsync(dto.UserId);
            if (profile == null)
            {
                profile = new UserProfile
                {
                    UserId = dto.UserId,
                    Phone = dto.Phone,
                    Summary = dto.Summary
                };
                await _unitOfWork.UserProfiles.AddAsync(profile);
            }
            else
            {
                profile.Phone = dto.Phone ?? profile.Phone;
                profile.Summary = dto.Summary ?? profile.Summary;
                _unitOfWork.UserProfiles.Update(profile);
            }

            // Remove existing resume data for this user
            await _unitOfWork.ResumeEducations.RemoveByUserIdAsync(dto.UserId);
            await _unitOfWork.ResumeSkills.RemoveByUserIdAsync(dto.UserId);
            await _unitOfWork.ResumeProjects.RemoveByUserIdAsync(dto.UserId);
            await _unitOfWork.ResumeExperiences.RemoveByUserIdAsync(dto.UserId);

            // Save Education
            if (dto.Education != null && dto.Education.Any())
            {
                foreach (var eduDto in dto.Education)
                {
                    var education = new ResumeEducation
                    {
                        UserId = dto.UserId,
                        Degree = eduDto.Degree,
                        Institution = eduDto.Institution,
                        Year = eduDto.Year,
                        Details = eduDto.Details
                    };
                    await _unitOfWork.ResumeEducations.AddAsync(education);
                }
            }

            // Save Skills
            if (dto.Skills != null && dto.Skills.Any())
            {
                foreach (var skillName in dto.Skills.Where(s => !string.IsNullOrWhiteSpace(s)))
                {
                    var skill = new ResumeSkill
                    {
                        UserId = dto.UserId,
                        SkillName = skillName.Trim()
                    };
                    await _unitOfWork.ResumeSkills.AddAsync(skill);
                }
            }

            // Save Projects
            if (dto.Projects != null && dto.Projects.Any())
            {
                foreach (var projDto in dto.Projects)
                {
                    var project = new ResumeProject
                    {
                        UserId = dto.UserId,
                        Title = projDto.Title,
                        Description = projDto.Description
                    };
                    await _unitOfWork.ResumeProjects.AddAsync(project);
                }
            }

            // Save Experiences
            if (dto.Experience != null && dto.Experience.Any())
            {
                foreach (var expDto in dto.Experience)
                {
                    var experience = new ResumeExperience
                    {
                        UserId = dto.UserId,
                        Title = expDto.Title,
                        Company = expDto.Company,
                        Duration = expDto.Duration,
                        Description = expDto.Description
                    };
                    await _unitOfWork.ResumeExperiences.AddAsync(experience);
                }
            }

            await _unitOfWork.CompleteAsync();

            return dto;
        }

        public async Task<ResumeSaveProfileDto> GetResumeDataAsync(Guid userId)
        {
            var profile = await _unitOfWork.UserProfiles.GetByUserIdAsync(userId);
            if (profile == null)
            {
                throw new Exception("Profile not found");
            }

            var educations = await _unitOfWork.ResumeEducations.GetByUserIdAsync(userId);
            var skills = await _unitOfWork.ResumeSkills.GetByUserIdAsync(userId);
            var projects = await _unitOfWork.ResumeProjects.GetByUserIdAsync(userId);
            var experiences = await _unitOfWork.ResumeExperiences.GetByUserIdAsync(userId);

            return new ResumeSaveProfileDto
            {
                UserId = userId,
                Name = null, // Will be populated from User table if needed
                Email = null, // Will be populated from User table if needed
                Phone = profile.Phone,
                Summary = profile.Summary,
                Education = educations.Select(e => new EducationDto
                {
                    Degree = e.Degree,
                    Institution = e.Institution,
                    Year = e.Year,
                    Details = e.Details
                }).ToList(),
                Skills = skills.Select(s => s.SkillName).ToList(),
                Projects = projects.Select(p => new ProjectDto
                {
                    Title = p.Title,
                    Description = p.Description
                }).ToList(),
                Experience = experiences.Select(e => new ExperienceDto
                {
                    Title = e.Title,
                    Company = e.Company,
                    Duration = e.Duration,
                    Description = e.Description
                }).ToList()
            };
        }
    }
}
