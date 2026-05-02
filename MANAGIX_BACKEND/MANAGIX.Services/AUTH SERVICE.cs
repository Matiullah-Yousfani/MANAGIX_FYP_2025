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
            var fullName = (dto.FullName ?? "").Trim();
            var email = (dto.Email ?? "").Trim();

            if (string.IsNullOrWhiteSpace(fullName))
                return "Full name is required.";

            if (string.IsNullOrWhiteSpace(email))
                return "Email is required.";

            if (string.IsNullOrWhiteSpace(dto.Password) || dto.Password.Length < 6)
                return "Password must be at least 6 characters.";

            if (dto.RoleId == Guid.Empty || !await _db.roles.AnyAsync(r => r.RoleId == dto.RoleId))
                return "Invalid role selected.";

            var emailKey = email.ToLowerInvariant();

            bool emailExistsInUsers = await _db.users
                .AnyAsync(u => u.Email.ToLower() == emailKey);

            bool emailExistsInRequests = await _db.userRequests
                .AnyAsync(u => u.Email.ToLower() == emailKey);

            if (emailExistsInUsers || emailExistsInRequests)
                return "Email already registered or pending approval.";

            var userReq = new UserRequest
            {
                FullName = fullName,
                Email = email,
                PasswordHash = PasswordService.Hash(dto.Password),
                RoleId = dto.RoleId
            };

            _db.userRequests.Add(userReq);
            await _db.SaveChangesAsync();

            return "Registration request submitted.";
        }

        // -------- LOGIN (Only approved Users) ----------
        public async Task<LoginResultDto> LoginAsync(LoginRequestDto dto)
        {
            var email = (dto.Email ?? "").Trim();
            if (string.IsNullOrWhiteSpace(email))
            {
                return new LoginResultDto
                {
                    Success = false,
                    Message = "Email is required."
                };
            }

            if (string.IsNullOrWhiteSpace(dto.Password))
            {
                return new LoginResultDto
                {
                    Success = false,
                    Message = "Password is required."
                };
            }

            var emailKey = email.ToLowerInvariant();

            // 1️⃣ Check approved users
            var user = await _db.users
                .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
                .FirstOrDefaultAsync(u => u.Email.ToLower() == emailKey);

            if (user != null)
            {
                if (!PasswordService.Verify(dto.Password ?? "", user.PasswordHash))
                {
                    return new LoginResultDto
                    {
                        Success = false,
                        Message = "Invalid password."
                    };
                }

                var roles = user.UserRoles
                    .Where(ur => ur.Role != null)
                    .Select(ur => ur.Role!.RoleName)
                    .ToList();

                var token = _jwt.GenerateToken(user.UserId, user.Email, roles);

                return new LoginResultDto
                {
                    Success = true,
                    Token = token,
                    Message = "Login successful"
                };
            }

            // 2️⃣ Check pending/rejected users
            var request = await _db.userRequests
                .FirstOrDefaultAsync(u => u.Email.ToLower() == emailKey);

            if (request != null)
            {
                if (request.Status == "Pending")
                {
                    return new LoginResultDto
                    {
                        Success = false,
                        Message = "Account pending approval."
                    };
                }

                if (request.Status == "Rejected")
                {
                    return new LoginResultDto
                    {
                        Success = false,
                        Message = $"Your account was rejected. Reason: {request.AdminComment}"
                    };
                }
            }

            // 3️⃣ User not found anywhere
            return new LoginResultDto
            {
                Success = false,
                Message = "Account not found. Please register first."
            };
        }

        // -------- ADMIN APPROVE ----------
        // -------- ADMIN APPROVE / UPDATE ROLE ----------
        public async Task<bool> ApproveAsync(Guid requestId, Guid selectedRoleId)
        {
            if (selectedRoleId == Guid.Empty || !await _db.roles.AnyAsync(r => r.RoleId == selectedRoleId))
                return false;

            // 1. Check if the user is already an approved user (for the Update button)
            var existingUser = await _db.users.FirstOrDefaultAsync(u => u.UserId == requestId);

            if (existingUser != null)
            {
                // Same checks as PUT /roles/{userId} — admin "Change role" hits this path, not RoleService.
                if (existingUser.RoleId != selectedRoleId)
                    await UserRoleChangeRules.AssertUserMayReassignRoleAsync(_db, existingUser.UserId);

                existingUser.RoleId = selectedRoleId;

                var existingJoins = await _db.userRoles
                    .Where(ur => ur.UserId == existingUser.UserId)
                    .ToListAsync();
                _db.userRoles.RemoveRange(existingJoins);
                _db.userRoles.Add(new UserRole
                {
                    UserId = existingUser.UserId,
                    RoleId = selectedRoleId
                });
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
                    Role = user.UserRoles.FirstOrDefault()?.Role?.RoleName ?? "",
                    RejectionReason = null
                };
            }

            var req = await _db.userRequests.FirstOrDefaultAsync(r => r.RequestId == userId);
            if (req == null) return null;

            var pendingRoleName = string.Empty;
            if (req.RoleId != Guid.Empty)
            {
                var pendingRole = await _db.roles.FindAsync(req.RoleId);
                pendingRoleName = pendingRole?.RoleName ?? string.Empty;
            }

            return new AuthStatusResponseDto
            {
                UserId = req.RequestId,
                Status = req.Status,
                RejectionReason = req.AdminComment,
                Role = pendingRoleName
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

        /// <summary>
        /// Deletes an approved user when they have no task assignments, no active managed projects, and no team membership.
        /// </summary>
        public async Task<(bool ok, string message)> TryDeleteUserAsync(Guid userId)
        {
            var user = await _db.users
                .Include(u => u.Profile)
                .Include(u => u.UserRoles)
                .FirstOrDefaultAsync(u => u.UserId == userId);

            if (user == null)
                return (false, "User not found.");

            var block = await UserRoleChangeRules.TryGetDeleteBlockReasonAsync(_db, userId);
            if (block != null)
                return (false, block);

            var teamLinks = await _db.TeamEmployees.Where(te => te.EmployeeId == userId).ToListAsync();
            _db.TeamEmployees.RemoveRange(teamLinks);

            _db.userRoles.RemoveRange(user.UserRoles.ToList());

            if (user.Profile != null)
                _db.userProfiles.Remove(user.Profile);

            _db.users.Remove(user);
            await _db.SaveChangesAsync();
            return (true, "User deleted.");
        }
    }
}
