using MANAGIX.DataAccess.Repositories.IRepositories;
using MANAGIX.Models.DTO;
using MANAGIX.Models.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MANAGIX.Services
{
    public class UserProfileService:IUserProfileService
    {
        private readonly IUnitOfWork _unitOfWork;
        public UserProfileService(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        public async Task<UserProfile?> GetProfileAsync(Guid userId) =>
            await _unitOfWork.UserProfiles.GetByUserIdAsync(userId);

        public async Task<UserProfile> UpdateProfileAsync(Guid userId, ProfileUpdateDto dto)
        {
            var profile = await _unitOfWork.UserProfiles.GetByUserIdAsync(userId);
            if (profile == null) throw new Exception("Profile not found");

            profile.Skills = dto.Skills ?? profile.Skills;
            profile.Phone = dto.Phone ?? profile.Phone;
            profile.Address = dto.Address ?? profile.Address;
            profile.Education = dto.Education ?? profile.Education;
            profile.Experience = dto.Experience ?? profile.Experience;
            profile.Bio = dto.Bio ?? profile.Bio;

            _unitOfWork.UserProfiles.Update(profile);
            await _unitOfWork.CompleteAsync(); // Commit changes
            return profile;
        }

        public async Task<UserProfile> UploadResumeAsync(Guid userId, string resumePath)
        {
            var profile = await _unitOfWork.UserProfiles.GetByUserIdAsync(userId);
            if (profile == null) throw new Exception("Profile not found");

            profile.ResumeFilePath = resumePath;
            _unitOfWork.UserProfiles.Update(profile);
            await _unitOfWork.CompleteAsync();
            return profile;
        }
    }
}
