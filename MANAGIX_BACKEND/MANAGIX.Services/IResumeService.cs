using MANAGIX.Models.DTO;
using System;
using System.Threading.Tasks;

namespace MANAGIX.Services
{
    public interface IResumeService
    {
        Task<ResumeSaveProfileDto> SaveResumeProfileAsync(ResumeSaveProfileDto dto);
        Task<ResumeSaveProfileDto> GetResumeDataAsync(Guid userId);
    }
}
