using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MANAGIX.DataAccess.Migrations
{
    public partial class AddMinimumSubmitHours : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "MinimumSubmitHours",
                table: "TimesheetPolicySettings",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MinimumSubmitHours",
                table: "TimesheetPolicySettings");
        }
    }
}
