using MANAGIX.DataAccess.Repositories;
using MANAGIX.DataAccess.Repositories.IRepositories;
using MANAGIX.Models.DTO;
using MANAGIX.Models.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MANAGIX.Services
{
    public class RoleService
    {
        private readonly IRoleRepository _roleRepo;
        private readonly IUnitOfWork _unitOfWork;

        public RoleService(IRoleRepository roleRepo, IUnitOfWork unitOfWork)
        {
            _roleRepo = roleRepo;
            _unitOfWork = unitOfWork;
        }

        public async Task<IEnumerable<RoleReadDto>> GetAllRolesAsync()
        {
            var roles = await _roleRepo.GetAllAsync();
            return roles.Select(r => new RoleReadDto
            {
                RoleId = r.RoleId,
                RoleName = r.RoleName,
                Description = r.Description
            });
        }

        public async Task<RoleReadDto?> GetRoleByIdAsync(Guid id)
        {
            var role = await _roleRepo.GetByIdAsync(id);
            if (role == null) return null;

            return new RoleReadDto
            {
                RoleId = role.RoleId,
                RoleName = role.RoleName,
                Description = role.Description
            };
        }

        public async Task<RoleReadDto> CreateRoleAsync(RoleCreateDto dto)
        {
            var role = new Role
            {
                RoleName = dto.RoleName,
                Description = dto.Description
            };

            await _roleRepo.AddAsync(role);
            await _unitOfWork.CompleteAsync();

            return new RoleReadDto
            {
                RoleId = role.RoleId,
                RoleName = role.RoleName,
                Description = role.Description
            };
        }

        public async Task<bool> UpdateRoleAsync(Guid id, RoleCreateDto dto)
        {
            var role = await _roleRepo.GetByIdAsync(id);
            if (role == null) return false;

            role.RoleName = dto.RoleName;
            role.Description = dto.Description;

            _roleRepo.Update(role);
            await _unitOfWork.CompleteAsync();

            return true;
        }

        public async Task<bool> DeleteRoleAsync(Guid id)
        {
            var role = await _roleRepo.GetByIdAsync(id);
            if (role == null) return false;

            _roleRepo.Remove(role);
            await _unitOfWork.CompleteAsync();

            return true;
        }
    }
}
