using MANAGIX.DataAccess.Data;
using MANAGIX.DataAccess.Repositories.IRepositories;
using MANAGIX.DataAccess.Repositories;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using MANAGIX.Services;
using MANAGIX.Utility;

var builder = FunctionsApplication.CreateBuilder(args);

// change started here
builder.ConfigureFunctionsWebApplication();
// change ended here

// App Insights
builder.Services
    .AddApplicationInsightsTelemetryWorkerService()
    .ConfigureFunctionsApplicationInsights();

// Unit of Work
builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();
builder.Services.AddScoped<RoleService>();
builder.Services.AddScoped<IRoleRepository, RoleRepository>();
builder.Services.AddScoped<IUserProfileService, UserProfileService>();
builder.Services.AddScoped<IResumeService, ResumeService>();
builder.Services.AddScoped<IAiAllocationService, AiAllocationService>();
builder.Services.AddScoped<IAiProjectPlannerService, AiProjectPlannerService>();
// PHASE 3 / 4 / 5: Workload, meetings, notifications, monitoring services.
builder.Services.AddScoped<IManagerScopeService, ManagerScopeService>();
builder.Services.AddScoped<IWorkloadService, WorkloadService>();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddScoped<IMeetingService, MeetingService>();
builder.Services.AddScoped<IMonitoringService, MonitoringService>();
builder.Services.AddScoped<IProjectClosureReportService, ProjectClosureReportService>();
builder.Services.AddScoped<IProjectTimelineService, ProjectTimelineService>();
builder.Services.AddScoped<IOvertimeService, OvertimeService>();
builder.Services.AddScoped<IDailyTimesheetService, DailyTimesheetService>();
builder.Services.AddScoped<ITimesheetService, TimesheetService>();
builder.Services.AddScoped<IAdminPayrollSettingsService, AdminPayrollSettingsService>();
builder.Services.AddScoped<IEmployeeInsightsService, EmployeeInsightsService>();
builder.Services.AddScoped<IPayrollService, PayrollService>();
builder.Services.AddScoped<IEmployeePerformanceService, EmployeePerformanceService>();

// DbContext
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(connectionString));

// JWT & Auth
builder.Services.AddSingleton<JwtService>(sp =>
{
    var config = sp.GetRequiredService<IConfiguration>();
    return new JwtService(config);
});

builder.Services.AddScoped<AUTH_SERVICE>();
builder.Services.AddScoped<DatabaseBootstrapService>();

var host = builder.Build();

using (var scope = host.Services.CreateScope())
{
    var bootstrap = scope.ServiceProvider.GetRequiredService<DatabaseBootstrapService>();
    await bootstrap.EnsureSeedAsync();
}

host.Run();
// change ended here