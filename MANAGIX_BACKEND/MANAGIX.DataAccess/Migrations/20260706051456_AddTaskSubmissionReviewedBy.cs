using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MANAGIX.DataAccess.Migrations
{
    /// <inheritdoc />
    public partial class AddTaskSubmissionReviewedBy : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ReviewedBy",
                table: "TaskSubmissions",
                type: "uniqueidentifier",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ReviewedBy",
                table: "TaskSubmissions");
        }
    }
}
