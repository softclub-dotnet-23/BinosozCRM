using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddDocumentIdToMaterialDeliveries : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "DocumentId",
                table: "MaterialDeliveries",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_MaterialDeliveries_DocumentId",
                table: "MaterialDeliveries",
                column: "DocumentId",
                filter: "\"DocumentId\" IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_MaterialDeliveries_DocumentId",
                table: "MaterialDeliveries");

            migrationBuilder.DropColumn(
                name: "DocumentId",
                table: "MaterialDeliveries");
        }
    }
}
