using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MANAGIX.DataAccess.Migrations
{
    /// <inheritdoc />
    public partial class AddDailyTimesheetWorkflow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DailyTimesheets",
                columns: table => new
                {
                    DailyTimesheetId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    WorkDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    TotalHours = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    EmployeeNote = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    OvertimeReason = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ManagerComment = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ReviewedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    SubmittedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ReviewedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DailyTimesheets", x => x.DailyTimesheetId);
                });

            migrationBuilder.CreateTable(
                name: "TimesheetPolicySettings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    StandardHoursPerDay = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    OvertimeGraceHours = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    DailyMaxHours = table.Column<decimal>(type: "decimal(18,2)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TimesheetPolicySettings", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DailyTimesheet_User_WorkDate",
                table: "DailyTimesheets",
                columns: new[] { "UserId", "WorkDate" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DailyTimesheets");

            migrationBuilder.DropTable(
                name: "TimesheetPolicySettings");
        }
    }
}
