using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCompanyCodeSequence : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "NextCodeNumber",
                table: "Companies",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<uint>(
                name: "xmin",
                table: "Companies",
                type: "xid",
                rowVersion: true,
                nullable: false,
                defaultValue: 0u);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "NextCodeNumber",
                table: "Companies");

            migrationBuilder.DropColumn(
                name: "xmin",
                table: "Companies");
        }
    }
}
