using MANAGIX.DataAccess.Data;
using MANAGIX.Models.Models;
using MANAGIX.Utility;
using System;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace MANAGIX.Services
{
    /// <summary>
    /// Ensures default roles and admin exist on startup (idempotent).
    /// </summary>
    public class DatabaseBootstrapService
    {
        public const string AdminEmail = "admin@gmail.com";
        public const string AdminPassword = "427736Admin*";
        public const string AdminDisplayName = "admin";

        private readonly ApplicationDbContext _db;
        private readonly ILogger<DatabaseBootstrapService> _logger;

        public DatabaseBootstrapService(ApplicationDbContext db, ILogger<DatabaseBootstrapService> logger)
        {
            _db = db;
            _logger = logger;
        }

        public async Task EnsureSeedAsync()
        {
            await _db.Database.MigrateAsync();

            var roleDefs = new (string Name, string Description)[]
            {
                ("Admin", "Admin Role"),
                ("Manager", "Manager Role"),
                ("Employee", "Employee Role"),
                (AppRoles.QualityAssurance, "QA Role"),
            };
            foreach (var (name, description) in roleDefs)
            {
                var exists = await _db.roles.AnyAsync(r =>
                    r.RoleName == name ||
                    (name == AppRoles.QualityAssurance &&
                     (r.RoleName == "QA" || r.RoleName == AppRoles.QualityAssurance)));
                if (!exists)
                    _db.roles.Add(new Role { RoleName = name, Description = description });
            }
            await _db.SaveChangesAsync();

            if (await _db.users.AnyAsync(u => u.Email == AdminEmail))
                return;

            var adminRole = await _db.roles.FirstAsync(r => r.RoleName == "Admin");
            var adminId = Guid.NewGuid();

            var admin = new User
            {
                UserId = adminId,
                FullName = AdminDisplayName,
                Email = AdminEmail,
                PasswordHash = PasswordService.Hash(AdminPassword),
                CreatedAt = DateTime.UtcNow,
            };
            _db.users.Add(admin);
            _db.userRoles.Add(new UserRole { UserId = adminId, RoleId = adminRole.RoleId });
            _db.userProfiles.Add(new UserProfile
            {
                UserId = adminId,
                Bio = "System administrator",
                WeeklyCapacityHours = 40m,
            });

            await _db.SaveChangesAsync();
            _logger.LogInformation("Seeded default admin account {Email}", AdminEmail);
        }
    }
}
