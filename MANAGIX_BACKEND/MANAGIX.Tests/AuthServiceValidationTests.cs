using MANAGIX.DataAccess.Data;
using MANAGIX.Models.DTO;
using MANAGIX.Models.Models;
using MANAGIX.Services;
using MANAGIX.Utility;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Primitives;
using System.Threading;
using Xunit;

namespace MANAGIX.Tests;

public class AuthServiceValidationTests
{
    /// <summary>Minimal IConfiguration for JwtService (only flat keys are read).</summary>
    private sealed class FlatConfig : IConfiguration
    {
        private readonly Dictionary<string, string?> _values;

        public FlatConfig(Dictionary<string, string?> values) => _values = values;

        public string? this[string key]
        {
            get => _values.TryGetValue(key, out var v) ? v : null;
            set { }
        }

        public IConfigurationSection GetSection(string key) => throw new NotSupportedException();

        public IEnumerable<IConfigurationSection> GetChildren() => Array.Empty<IConfigurationSection>();

        public IChangeToken GetReloadToken() => new CancellationChangeToken(CancellationToken.None);
    }

    private static IConfiguration TestJwtConfig => new FlatConfig(new Dictionary<string, string?>
    {
        ["Jwt:Key"] = "01234567890123456789012345678901",
        ["Jwt:Issuer"] = "test-issuer",
        ["Jwt:Audience"] = "test-audience"
    });

    private static (ApplicationDbContext Db, AUTH_SERVICE Auth) CreateAuth()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var db = new ApplicationDbContext(options);
        var jwt = new JwtService(TestJwtConfig);
        var auth = new AUTH_SERVICE(db, jwt);
        return (db, auth);
    }

    [Fact]
    public async Task Login_IsCaseInsensitive_AndTrimsEmail()
    {
        var (db, auth) = CreateAuth();
        var roleId = Guid.NewGuid();
        db.roles.Add(new Role { RoleId = roleId, RoleName = "Employee" });
        var uid = Guid.NewGuid();
        db.users.Add(new User
        {
            UserId = uid,
            FullName = "A",
            Email = "Person@EXAMPLE.com",
            PasswordHash = PasswordService.Hash("secret12"),
            RoleId = roleId
        });
        db.userRoles.Add(new UserRole { UserId = uid, RoleId = roleId });
        await db.SaveChangesAsync();

        var ok = await auth.LoginAsync(new LoginRequestDto
        {
            Email = "  person@example.com  ",
            Password = "secret12"
        });

        Assert.True(ok.Success);
        Assert.False(string.IsNullOrEmpty(ok.Token));
        await db.DisposeAsync();
    }

    [Fact]
    public async Task Approve_RejectsWhenRoleDoesNotExist()
    {
        var (db, auth) = CreateAuth();
        var roleId = Guid.NewGuid();
        db.roles.Add(new Role { RoleId = roleId, RoleName = "Employee" });
        var uid = Guid.NewGuid();
        db.users.Add(new User
        {
            UserId = uid,
            FullName = "A",
            Email = "e@test.com",
            PasswordHash = PasswordService.Hash("x"),
            RoleId = roleId
        });
        await db.SaveChangesAsync();

        var unknownRole = Guid.NewGuid();
        var result = await auth.ApproveAsync(uid, unknownRole);
        Assert.False(result);

        await db.DisposeAsync();
    }

    [Fact]
    public async Task Register_RejectsShortPassword()
    {
        var (db, auth) = CreateAuth();
        var roleId = Guid.NewGuid();
        db.roles.Add(new Role { RoleId = roleId, RoleName = "Employee" });
        await db.SaveChangesAsync();

        var msg = await auth.RegisterAsync(new RegisterRequestDto
        {
            FullName = "A",
            Email = "a@a.com",
            Password = "12345",
            RoleId = roleId
        });

        Assert.Contains("Password", msg, StringComparison.OrdinalIgnoreCase);
        await db.DisposeAsync();
    }

    [Fact]
    public async Task Register_RejectsInvalidRoleId()
    {
        var (db, auth) = CreateAuth();
        var msg = await auth.RegisterAsync(new RegisterRequestDto
        {
            FullName = "A",
            Email = "new@a.com",
            Password = "123456",
            RoleId = Guid.Empty
        });

        Assert.Contains("role", msg, StringComparison.OrdinalIgnoreCase);
        await db.DisposeAsync();
    }

    [Fact]
    public async Task Login_RejectsEmptyPassword()
    {
        var (db, auth) = CreateAuth();
        var roleId = Guid.NewGuid();
        db.roles.Add(new Role { RoleId = roleId, RoleName = "Employee" });
        var uid = Guid.NewGuid();
        db.users.Add(new User
        {
            UserId = uid,
            FullName = "A",
            Email = "a@test.com",
            PasswordHash = PasswordService.Hash("secret12"),
            RoleId = roleId
        });
        await db.SaveChangesAsync();

        var result = await auth.LoginAsync(new LoginRequestDto
        {
            Email = "a@test.com",
            Password = ""
        });

        Assert.False(result.Success);
        Assert.Contains("Password", result.Message ?? "", StringComparison.OrdinalIgnoreCase);
        await db.DisposeAsync();
    }

    [Fact]
    public async Task Register_RejectsDuplicateEmailInUsersTable()
    {
        var (db, auth) = CreateAuth();
        var roleId = Guid.NewGuid();
        db.roles.Add(new Role { RoleId = roleId, RoleName = "Employee" });
        db.users.Add(new User
        {
            UserId = Guid.NewGuid(),
            FullName = "Existing",
            Email = "dup@example.com",
            PasswordHash = PasswordService.Hash("123456"),
            RoleId = roleId
        });
        await db.SaveChangesAsync();

        var msg = await auth.RegisterAsync(new RegisterRequestDto
        {
            FullName = "New",
            Email = "dup@example.com",
            Password = "123456",
            RoleId = roleId
        });

        Assert.Contains("Email already", msg, StringComparison.OrdinalIgnoreCase);
        await db.DisposeAsync();
    }

    [Fact]
    public async Task Approve_SameRole_SucceedsEvenIfUserHasTasks()
    {
        var (db, auth) = CreateAuth();
        var roleEmp = Guid.NewGuid();
        var roleMgr = Guid.NewGuid();
        db.roles.Add(new Role { RoleId = roleEmp, RoleName = "Employee" });
        db.roles.Add(new Role { RoleId = roleMgr, RoleName = "Manager" });
        var uid = Guid.NewGuid();
        db.users.Add(new User
        {
            UserId = uid,
            FullName = "A",
            Email = "tasky@test.com",
            PasswordHash = PasswordService.Hash("x"),
            RoleId = roleEmp
        });
        db.userRoles.Add(new UserRole { UserId = uid, RoleId = roleEmp });
        var pm = new ProjectModel { ModelName = "M" };
        db.ProjectModels.Add(pm);
        var proj = new Project
        {
            CreatedBy = uid,
            Title = "P",
            Deadline = DateTime.UtcNow,
            Budget = 0,
            ModelId = pm.ModelId,
            IsClosed = false
        };
        db.Projects.Add(proj);
        db.Tasks.Add(new TaskItem
        {
            ProjectId = proj.ProjectId,
            AssignedEmployeeId = uid,
            Title = "T"
        });
        await db.SaveChangesAsync();

        var ok = await auth.ApproveAsync(uid, roleEmp);
        Assert.True(ok);
        await db.DisposeAsync();
    }

    [Fact]
    public async Task Approve_RoleChange_ThrowsWhenUserHasTaskAssignments()
    {
        var (db, auth) = CreateAuth();
        var roleEmp = Guid.NewGuid();
        var roleMgr = Guid.NewGuid();
        db.roles.Add(new Role { RoleId = roleEmp, RoleName = "Employee" });
        db.roles.Add(new Role { RoleId = roleMgr, RoleName = "Manager" });
        var uid = Guid.NewGuid();
        db.users.Add(new User
        {
            UserId = uid,
            FullName = "A",
            Email = "tasky2@test.com",
            PasswordHash = PasswordService.Hash("x"),
            RoleId = roleEmp
        });
        db.userRoles.Add(new UserRole { UserId = uid, RoleId = roleEmp });
        var pm = new ProjectModel { ModelName = "M" };
        db.ProjectModels.Add(pm);
        var proj = new Project
        {
            CreatedBy = uid,
            Title = "P",
            Deadline = DateTime.UtcNow,
            Budget = 0,
            ModelId = pm.ModelId,
            IsClosed = false
        };
        db.Projects.Add(proj);
        db.Tasks.Add(new TaskItem
        {
            ProjectId = proj.ProjectId,
            AssignedEmployeeId = uid,
            Title = "T"
        });
        await db.SaveChangesAsync();

        await Assert.ThrowsAsync<InvalidOperationException>(() => auth.ApproveAsync(uid, roleMgr));
        await db.DisposeAsync();
    }

    [Fact]
    public async Task TryDeleteUser_RemovesUserWhenNoBlockers()
    {
        var (db, auth) = CreateAuth();
        var roleId = Guid.NewGuid();
        db.roles.Add(new Role { RoleId = roleId, RoleName = "Employee" });
        var uid = Guid.NewGuid();
        db.users.Add(new User
        {
            UserId = uid,
            FullName = "A",
            Email = "clean@test.com",
            PasswordHash = PasswordService.Hash("123456"),
            RoleId = roleId
        });
        db.userRoles.Add(new UserRole { UserId = uid, RoleId = roleId });
        db.userProfiles.Add(new UserProfile { UserId = uid });
        await db.SaveChangesAsync();

        var (ok, message) = await auth.TryDeleteUserAsync(uid);
        Assert.True(ok);
        Assert.False(await db.users.AnyAsync(u => u.UserId == uid));
        await db.DisposeAsync();
    }

    [Fact]
    public async Task TryDeleteUser_BlocksWhenUserOnTeam()
    {
        var (db, auth) = CreateAuth();
        var roleId = Guid.NewGuid();
        db.roles.Add(new Role { RoleId = roleId, RoleName = "Employee" });
        var uid = Guid.NewGuid();
        db.users.Add(new User
        {
            UserId = uid,
            FullName = "A",
            Email = "team@test.com",
            PasswordHash = PasswordService.Hash("123456"),
            RoleId = roleId
        });
        var team = new Team { Name = "T", CreatedBy = uid };
        db.Teams.Add(team);
        db.TeamEmployees.Add(new TeamEmployee { TeamId = team.TeamId, EmployeeId = uid });
        await db.SaveChangesAsync();

        var (ok, message) = await auth.TryDeleteUserAsync(uid);
        Assert.False(ok);
        Assert.Contains("team", message, StringComparison.OrdinalIgnoreCase);
        await db.DisposeAsync();
    }

    [Fact]
    public async Task TryDeleteUser_BlocksWhenTasksAssigned()
    {
        var (db, auth) = CreateAuth();
        var roleId = Guid.NewGuid();
        db.roles.Add(new Role { RoleId = roleId, RoleName = "Employee" });
        var uid = Guid.NewGuid();
        db.users.Add(new User
        {
            UserId = uid,
            FullName = "A",
            Email = "a@a.com",
            PasswordHash = PasswordService.Hash("123456"),
            RoleId = roleId
        });
        db.userProfiles.Add(new UserProfile { UserId = uid });
        var pm = new ProjectModel { ModelName = "M" };
        db.ProjectModels.Add(pm);
        var proj = new Project
        {
            CreatedBy = uid,
            Title = "P",
            Deadline = DateTime.UtcNow,
            Budget = 0,
            ModelId = pm.ModelId,
            IsClosed = false
        };
        db.Projects.Add(proj);
        db.Tasks.Add(new TaskItem
        {
            ProjectId = proj.ProjectId,
            AssignedEmployeeId = uid,
            Title = "T"
        });
        await db.SaveChangesAsync();

        var (ok, message) = await auth.TryDeleteUserAsync(uid);
        Assert.False(ok);
        Assert.Contains("task", message, StringComparison.OrdinalIgnoreCase);
        await db.DisposeAsync();
    }
}
