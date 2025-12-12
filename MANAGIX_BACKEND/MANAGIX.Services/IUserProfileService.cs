using MANAGIX.Models.DTO;
using MANAGIX.Models.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MANAGIX.Services
{
    public interface IUserProfileService
    {
        Task<UserProfile?> GetProfileAsync(Guid userId);
        Task<UserProfile> UpdateProfileAsync(Guid userId, ProfileUpdateDto dto);
        Task<UserProfile> UploadResumeAsync(Guid userId, string resumePath);


    }
}
