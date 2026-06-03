using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MANAGIX.DataAccess.Migrations
{
    /// <inheritdoc />
    public partial class AddTimesheetOvertimePolicy : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "OvertimeGraceHours",
                table: "userProfiles",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<TimeSpan>(
                name: "ShiftEndTime",
                table: "userProfiles",
                type: "time",
                nullable: true);

            migrationBuilder.AddColumn<TimeSpan>(
                name: "ShiftStartTime",
                table: "userProfiles",
                type: "time",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "StandardHoursPerDay",
                table: "userProfiles",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "FileName",
                table: "TaskSubmissions",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "Deadline",
                table: "Tasks",
                type: "datetime2",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "OvertimeRequests",
                columns: table => new
                {
                    OvertimeRequestId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProjectId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    TaskId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    WorkDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    TotalHoursThatDay = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    EmployeeReason = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    Status = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    ManagerId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ManagerAction = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ResolvedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OvertimeRequests", x => x.OvertimeRequestId);
                });

            migrationBuilder.CreateIndex(
                name: "IX_OvertimeRequest_User_WorkDate",
                table: "OvertimeRequests",
                columns: new[] { "UserId", "WorkDate" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "OvertimeRequests");

            migrationBuilder.DropColumn(
                name: "OvertimeGraceHours",
                table: "userProfiles");

            migrationBuilder.DropColumn(
                name: "ShiftEndTime",
                table: "userProfiles");

            migrationBuilder.DropColumn(
                name: "ShiftStartTime",
                table: "userProfiles");

            migrationBuilder.DropColumn(
                name: "StandardHoursPerDay",
                table: "userProfiles");

            migrationBuilder.DropColumn(
                name: "FileName",
                table: "TaskSubmissions");

            migrationBuilder.DropColumn(
                name: "Deadline",
                table: "Tasks");
        }
    }
}
