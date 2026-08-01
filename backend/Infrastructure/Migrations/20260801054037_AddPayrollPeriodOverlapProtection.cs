using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPayrollPeriodOverlapProtection : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddCheckConstraint(
                name: "CK_PayrollEntries_Period_Range",
                table: "PayrollEntries",
                sql: "\"PeriodStart\" <= \"PeriodEnd\"");

            migrationBuilder.Sql("""
                CREATE EXTENSION IF NOT EXISTS btree_gist;
                ALTER TABLE "PayrollEntries"
                ADD CONSTRAINT "EX_PayrollEntries_ActiveWorkerPeriod_NoOverlap"
                EXCLUDE USING gist (
                    "CompanyId" WITH =,
                    "WorkerId" WITH =,
                    daterange("PeriodStart", "PeriodEnd", '[]') WITH &&)
                WHERE ("IsDeleted" = FALSE);
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("ALTER TABLE \"PayrollEntries\" DROP CONSTRAINT \"EX_PayrollEntries_ActiveWorkerPeriod_NoOverlap\";");

            migrationBuilder.DropCheckConstraint(
                name: "CK_PayrollEntries_Period_Range",
                table: "PayrollEntries");
        }
    }
}
