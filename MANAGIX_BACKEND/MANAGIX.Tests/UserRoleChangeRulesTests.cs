using MANAGIX.DataAccess.Data;
using MANAGIX.Models.Models;
using MANAGIX.Services;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace MANAGIX.Tests;

public class UserRoleChangeRulesTests
{
    private static ApplicationDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        return new ApplicationDbContext(options);
    }

    [Fact]
    public async Task ReassignRole_AllowsUserWithNoBlockers()
    {
        await using var db = CreateDb();
        var userId = Guid.NewGuid();

        await UserRoleChangeRules.AssertUserMayReassignRoleAsync(db, userId);
    }

    [Fact]
    public async Task ReassignRole_BlocksWhenUserAssignedToTask()
    {
        await using var db = CreateDb();
        var userId = Guid.NewGuid();
        var pm = new ProjectModel { ModelName = "M" };
        db.ProjectModels.Add(pm);
        var project = new Project
        {
            CreatedBy = userId,
            Title = "P",
            Deadline = DateTime.UtcNow,
            Budget = 0,
            ModelId = pm.ModelId,
            IsClosed = false
        };
        db.Projects.Add(project);
        db.Tasks.Add(new TaskItem
        {
            ProjectId = project.ProjectId,
            AssignedEmployeeId = userId,
            Title = "T"
        });
        await db.SaveChangesAsync();

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            UserRoleChangeRules.AssertUserMayReassignRoleAsync(db, userId));

        Assert.Contains("task", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task ReassignRole_BlocksWhenUserOnTeam()
    {
        await using var db = CreateDb();
        var userId = Guid.NewGuid();
        var team = new Team { Name = "Alpha", CreatedBy = userId };
        db.Teams.Add(team);
        db.TeamEmployees.Add(new TeamEmployee { TeamId = team.TeamId, EmployeeId = userId });
        await db.SaveChangesAsync();

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            UserRoleChangeRules.AssertUserMayReassignRoleAsync(db, userId));

        Assert.Contains("team", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task DeleteBlock_ReturnsNullWhenClean()
    {
        await using var db = CreateDb();
        var userId = Guid.NewGuid();

        var reason = await UserRoleChangeRules.TryGetDeleteBlockReasonAsync(db, userId);

        Assert.Null(reason);
    }

    [Fact]
    public async Task DeleteBlock_ReturnsMessageForActiveManagedProject()
    {
        await using var db = CreateDb();
        var userId = Guid.NewGuid();
        var pm = new ProjectModel { ModelName = "M" };
        db.ProjectModels.Add(pm);
        db.Projects.Add(new Project
        {
            CreatedBy = userId,
            Title = "P",
            Deadline = DateTime.UtcNow,
            Budget = 0,
            ModelId = pm.ModelId,
            IsClosed = false
        });
        await db.SaveChangesAsync();

        var reason = await UserRoleChangeRules.TryGetDeleteBlockReasonAsync(db, userId);

        Assert.NotNull(reason);
        Assert.Contains("project", reason, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task ReassignRole_BlocksWhenUserManagesActiveProject()
    {
        await using var db = CreateDb();
        var userId = Guid.NewGuid();
        var pm = new ProjectModel { ModelName = "M" };
        db.ProjectModels.Add(pm);
        db.Projects.Add(new Project
        {
            CreatedBy = userId,
            Title = "P",
            Deadline = DateTime.UtcNow,
            Budget = 0,
            ModelId = pm.ModelId,
            IsClosed = false
        });
        await db.SaveChangesAsync();

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            UserRoleChangeRules.AssertUserMayReassignRoleAsync(db, userId));

        Assert.Contains("project", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task DeleteBlock_PrefersTaskMessageWhenMultipleBlockersExist()
    {
        await using var db = CreateDb();
        var userId = Guid.NewGuid();
        var pm = new ProjectModel { ModelName = "M" };
        db.ProjectModels.Add(pm);
        var project = new Project
        {
            CreatedBy = userId,
            Title = "P",
            Deadline = DateTime.UtcNow,
            Budget = 0,
            ModelId = pm.ModelId,
            IsClosed = false
        };
        db.Projects.Add(project);
        db.Tasks.Add(new TaskItem
        {
            ProjectId = project.ProjectId,
            AssignedEmployeeId = userId,
            Title = "T"
        });
        var team = new Team { Name = "Alpha", CreatedBy = userId };
        db.Teams.Add(team);
        db.TeamEmployees.Add(new TeamEmployee { TeamId = team.TeamId, EmployeeId = userId });
        await db.SaveChangesAsync();

        var reason = await UserRoleChangeRules.TryGetDeleteBlockReasonAsync(db, userId);

        Assert.NotNull(reason);
        Assert.Contains("task", reason, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task ReassignRole_AllowsWhenProjectIsClosed()
    {
        await using var db = CreateDb();
        var userId = Guid.NewGuid();
        var pm = new ProjectModel { ModelName = "M" };
        db.ProjectModels.Add(pm);
        db.Projects.Add(new Project
        {
            CreatedBy = userId,
            Title = "P",
            Deadline = DateTime.UtcNow,
            Budget = 0,
            ModelId = pm.ModelId,
            IsClosed = true
        });
        await db.SaveChangesAsync();

        await UserRoleChangeRules.AssertUserMayReassignRoleAsync(db, userId);
    }
}
