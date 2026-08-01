using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddWorkerPayRateHistory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "WorkerPayRateHistories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CompanyId = table.Column<Guid>(type: "uuid", nullable: false),
                    WorkerId = table.Column<Guid>(type: "uuid", nullable: false),
                    PayRateType = table.Column<int>(type: "integer", nullable: false),
                    PayRate = table.Column<decimal>(type: "numeric(18,2)", nullable: false),
                    EffectiveFrom = table.Column<DateOnly>(type: "date", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamptz", nullable: false),
                    ModifiedAt = table.Column<DateTimeOffset>(type: "timestamptz", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkerPayRateHistories", x => x.Id);
                    table.CheckConstraint("CK_WorkerPayRateHistories_PayRate_ByType", "(\"PayRateType\" = 0 AND \"PayRate\" > 0) OR (\"PayRateType\" = 1 AND \"PayRate\" >= 0)");
                    table.ForeignKey(
                        name: "FK_WorkerPayRateHistories_Companies_CompanyId",
                        column: x => x.CompanyId,
                        principalTable: "Companies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_WorkerPayRateHistories_Workers_WorkerId",
                        column: x => x.WorkerId,
                        principalTable: "Workers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            // One deterministic immutable baseline per existing worker. The
            // UUID is derived from the worker id so a reviewed replay cannot
            // manufacture a different history identity; piecework zero is
            // copied unchanged and is accepted by the conditional check.
            migrationBuilder.Sql("""
                INSERT INTO "WorkerPayRateHistories" ("Id", "CompanyId", "WorkerId", "PayRateType", "PayRate", "EffectiveFrom", "CreatedAt", "ModifiedAt")
                SELECT md5("Id"::text || ':worker-pay-rate-history')::uuid, "CompanyId", "Id", "PayRateType", "PayRate", "HireDate", "CreatedAt", NULL
                FROM "Workers";
                """);

            migrationBuilder.AddCheckConstraint(
                name: "CK_Workers_PayRate_ByType",
                table: "Workers",
                sql: "(\"PayRateType\" = 0 AND \"PayRate\" > 0) OR (\"PayRateType\" = 1 AND \"PayRate\" >= 0)");

            migrationBuilder.CreateIndex(
                name: "IX_WorkerPayRateHistories_CompanyId",
                table: "WorkerPayRateHistories",
                column: "CompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkerPayRateHistories_WorkerId_EffectiveFrom",
                table: "WorkerPayRateHistories",
                columns: new[] { "WorkerId", "EffectiveFrom" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "WorkerPayRateHistories");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Workers_PayRate_ByType",
                table: "Workers");
        }
    }
}
