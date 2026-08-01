using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddUserCompanyOwnership : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "CompanyId",
                table: "Users",
                type: "uuid",
                nullable: true);

            // The pre-tenancy model was deliberately single-company. Do not
            // guess in a database that has since been populated with several
            // companies: ownership of a User cannot be inferred safely there.
            // Fresh databases have no Users at this migration point and pass
            // through without requiring a seeded Company yet.
            migrationBuilder.Sql("""
                DO $$
                DECLARE
                    company_id uuid;
                    company_count integer;
                BEGIN
                    IF EXISTS (SELECT 1 FROM "Users" WHERE "CompanyId" IS NULL) THEN
                        SELECT COUNT(*)
                        INTO company_count
                        FROM "Companies"
                        WHERE "IsDeleted" = FALSE;

                        IF company_count <> 1 THEN
                            RAISE EXCEPTION
                                'Cannot safely backfill Users.CompanyId: expected exactly one active Company, found %.',
                                company_count;
                        END IF;

                        SELECT "Id"
                        INTO company_id
                        FROM "Companies"
                        WHERE "IsDeleted" = FALSE
                        LIMIT 1;

                        UPDATE "Users"
                        SET "CompanyId" = company_id
                        WHERE "CompanyId" IS NULL;
                    END IF;
                END $$;
                """);

            migrationBuilder.AlterColumn<Guid>(
                name: "CompanyId",
                table: "Users",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_CompanyId",
                table: "Users",
                column: "CompanyId");

            migrationBuilder.AddForeignKey(
                name: "FK_Users_Companies_CompanyId",
                table: "Users",
                column: "CompanyId",
                principalTable: "Companies",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Users_Companies_CompanyId",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_Users_CompanyId",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "CompanyId",
                table: "Users");
        }
    }
}
