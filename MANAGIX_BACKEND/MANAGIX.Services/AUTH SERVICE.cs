using MANAGIX.DataAccess.Data;
using MANAGIX.Models.DTO;
using MANAGIX.Models.Models;
using MANAGIX.Utility;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MANAGIX.Services
{
    public class AUTH_SERVICE
    {
        private readonly ApplicationDbContext _db;
        private readonly JwtService _jwt;

        public AUTH_SERVICE(ApplicationDbContext db, JwtService jwt)
        {
            _db = db;
            _jwt = jwt;
        }

        // -------- REGISTER → UserRequest -------------
        public async Task<string> RegisterAsync(RegisterRequestDto dto)
        {
            if (await _db.users.AnyAsync(u => u.Email == dto.Email))
                return "User already exists.";

            var userReq = new UserRequest
            {
                FullName = dto.FullName,
                Email = dto.Email,
                PasswordHash = PasswordService.Hash(dto.Password), // static
                RoleId = dto.RoleId,
            };

            _db.userRequests.Add(userReq);
            await _db.SaveChangesAsync();

            return "Registration request submitted.";
        }

        // -------- LOGIN (Only approved Users) ----------
        public async Task<string?> LoginAsync(LoginRequestDto dto)
        {
            var user = await _db.users
                .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
                .FirstOrDefaultAsync(u => u.Email == dto.Email);

            if (user == null) return null;
            if (!PasswordService.Verify(dto.Password, user.PasswordHash)) return null; // static

            var roles = user.UserRoles
                .Where(ur => ur.Role != null)       // only include roles that are loaded
                .Select(ur => ur.Role!.RoleName)
                .ToList();

            return _jwt.GenerateToken(user.UserId, user.Email, roles);
        }

        // -------- ADMIN APPROVE ----------
        // -------- ADMIN APPROVE / UPDATE ROLE ----------
        public async Task<bool> ApproveAsync(Guid requestId, Guid selectedRoleId)
        {
            // 1. Check if the user is already an approved user (for the Update button)
            var existingUser = await _db.users.FirstOrDefaultAsync(u => u.UserId == requestId);

            if (existingUser != null)
            {
                // If they exist, we are just UPDATING their role column
                existingUser.RoleId = selectedRoleId;
            }
            else
            {
                // 2. If they don't exist in Users, look in Pending Requests
                var req = await _db.userRequests.FindAsync(requestId);
                if (req == null) return false;

                req.Status = "Approved";

                var user = new User
                {
                    UserId = req.RequestId, // Use same ID
                    FullName = req.FullName,
                    Email = req.Email,
                    PasswordHash = req.PasswordHash,
                    RoleId = selectedRoleId // Save the final role selected by Admin
                };

                _db.users.Add(user);

                // Keep join table in sync (Optional, but good for compatibility)
                _db.userRoles.Add(new UserRole
                {
                    UserId = user.UserId,
                    RoleId = selectedRoleId
                });

                // Initialize empty profile
                _db.userProfiles.Add(new UserProfile { UserId = user.UserId });
            }

            await _db.SaveChangesAsync();
            return true;
        }
        // -------- AUTH STATUS ----------
        public async Task<AuthStatusResponseDto?> GetAuthStatusAsync(Guid userId)
        {
            var user = await _db.users
                .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
                .FirstOrDefaultAsync(u => u.UserId == userId);

            if (user != null)
            {
                return new AuthStatusResponseDto
                {
                    UserId = user.UserId,
                    Status = "Approved",
                    Role = "",
                    RejectionReason = null
                };
            }

            var req = await _db.userRequests.FirstOrDefaultAsync(r => r.RequestId == userId);
            if (req == null) return null;

            return new AuthStatusResponseDto
            {
                UserId = req.RequestId,
                Status = req.Status,
                
                RejectionReason = req.AdminComment,
                Role = user.UserRoles.FirstOrDefault()?.Role?.RoleName ?? ""
            };
        }

        // -------- AUTH ME ----------
        public async Task<AuthMeResponseDto?> GetCurrentUserAsync(Guid userId)
        {
            var user = await _db.users
                .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
                .FirstOrDefaultAsync(u => u.UserId == userId);

            if (user == null) return null;

            var role = user.UserRoles.FirstOrDefault()?.Role;

            return new AuthMeResponseDto
            {
                UserId = user.UserId,
                FullName = user.FullName,
                Email = user.Email,
                RoleId = user.RoleId ?? Guid.Empty,
                RoleName = role?.RoleName ?? "",
                Status = "Approved"
            };
        }


        public async Task<bool> RejectAsync(Guid requestId, string comment)
        {
            var req = await _db.userRequests.FindAsync(requestId);
            if (req == null) return false;

            req.Status = "Rejected";
            req.AdminComment = comment;

            await _db.SaveChangesAsync();
            return true;
        }
    }
}
