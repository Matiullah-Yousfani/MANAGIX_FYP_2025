using MANAGIX.Models.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MANAGIX.DataAccess.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
        {
        }

        public DbSet<Role> roles { get; set; }

        public DbSet<User> users { get; set; }

        public DbSet<UserProfile> userProfiles { get; set; }

        public DbSet<UserRole> userRoles { get; set; }

        public DbSet<UserRequest> userRequests { get; set; }

        public DbSet<Project> Projects { get; set; }
        public DbSet<Team> Teams { get; set; }
        public DbSet<TeamEmployee> TeamEmployees { get; set; }
        public DbSet<ProjectTeam> ProjectTeams { get; set; }
        public DbSet<Milestone> Milestones { get; set; }
        public DbSet<TaskItem> Tasks { get; set; }

        public DbSet<TaskSubmission> TaskSubmissions { get; set; }

        public DbSet<EmployeePerformance> EmployeePerformances { get; set; }

        public DbSet<ProjectModel> ProjectModels { get; set; }

        // Resume Tables
        public DbSet<ResumeEducation> ResumeEducations { get; set; }
        public DbSet<ResumeSkill> ResumeSkills { get; set; }
        public DbSet<ResumeProject> ResumeProjects { get; set; }
        public DbSet<ResumeExperience> ResumeExperiences { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Unique Email
            modelBuilder.Entity<User>()
                .HasIndex(u => u.Email)
                .IsUnique();

            // TeamEmployee: many-to-many
            modelBuilder.Entity<TeamEmployee>()
                .HasKey(te => te.Id);
            modelBuilder.Entity<TeamEmployee>()
              .HasIndex(te => new { te.TeamId, te.EmployeeId })
              .IsUnique();

            // ProjectTeam: one team per project for now
            modelBuilder.Entity<ProjectTeam>()
                .HasIndex(pt => pt.ProjectId)
                .IsUnique();

            // EmployeePerformance → one record per employee per project
            modelBuilder.Entity<EmployeePerformance>()
                .HasIndex(ep => new { ep.EmployeeId, ep.ProjectId })
                .IsUnique();

            // TaskItem optional: configure relations
            modelBuilder.Entity<TaskItem>()
                .HasOne<Project>()
                .WithMany()
                .HasForeignKey(t => t.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<TaskItem>()
                .HasOne<Milestone>()
                .WithMany()
                .HasForeignKey(t => t.MilestoneId)
                .OnDelete(DeleteBehavior.SetNull);



            // Many-to-Many UserRoles
            modelBuilder.Entity<UserRole>()
                .HasOne(ur => ur.User)
                .WithMany(u => u.UserRoles)
                .HasForeignKey(ur => ur.UserId);

            modelBuilder.Entity<UserRole>()
                .HasOne(ur => ur.Role)
                .WithMany(r => r.UserRoles)
                .HasForeignKey(ur => ur.RoleId);

            // User–Profile 1:1
            modelBuilder.Entity<User>()
                .HasOne(u => u.Profile)
                .WithOne(p => p.User)
                .HasForeignKey<UserProfile>(p => p.UserId);
        }

    }
}
