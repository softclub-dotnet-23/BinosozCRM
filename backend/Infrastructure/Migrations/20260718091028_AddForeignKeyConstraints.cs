using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddForeignKeyConstraints : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_WorkOrders_BrigadeId",
                table: "WorkOrders",
                column: "BrigadeId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkOrders_CreatedByUserId",
                table: "WorkOrders",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkOrders_EstimateItemId",
                table: "WorkOrders",
                column: "EstimateItemId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkOrderProgresses_CompanyId",
                table: "WorkOrderProgresses",
                column: "CompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkOrderProgresses_ReportedByUserId",
                table: "WorkOrderProgresses",
                column: "ReportedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkOrderPayoutShares_ApprovedByUserId",
                table: "WorkOrderPayoutShares",
                column: "ApprovedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkOrderPayoutShares_CompanyId",
                table: "WorkOrderPayoutShares",
                column: "CompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkOrderPayoutShares_SetByUserId",
                table: "WorkOrderPayoutShares",
                column: "SetByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Workers_UserId",
                table: "Workers",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Timesheets_ApprovedByUserId",
                table: "Timesheets",
                column: "ApprovedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Timesheets_CompanyId",
                table: "Timesheets",
                column: "CompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_Timesheets_WorkOrderProgressId",
                table: "Timesheets",
                column: "WorkOrderProgressId");

            migrationBuilder.CreateIndex(
                name: "IX_TelegramLinks_CompanyId",
                table: "TelegramLinks",
                column: "CompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_TelegramLinkCodes_CompanyId",
                table: "TelegramLinkCodes",
                column: "CompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_TelegramLinkCodes_CreatedByUserId",
                table: "TelegramLinkCodes",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_TelegramLinkCodes_UserId",
                table: "TelegramLinkCodes",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_TaskLogs_ChangedByUserId",
                table: "TaskLogs",
                column: "ChangedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_TaskLogs_CompanyId",
                table: "TaskLogs",
                column: "CompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_RefreshTokens_CompanyId",
                table: "RefreshTokens",
                column: "CompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_RefreshTokens_ReplacedByTokenId",
                table: "RefreshTokens",
                column: "ReplacedByTokenId");

            migrationBuilder.CreateIndex(
                name: "IX_ProrabObjectAssignments_AssignedByUserId",
                table: "ProrabObjectAssignments",
                column: "AssignedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ProrabObjectAssignments_CompanyId",
                table: "ProrabObjectAssignments",
                column: "CompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_ProrabObjectAssignments_ObjectId",
                table: "ProrabObjectAssignments",
                column: "ObjectId");

            migrationBuilder.CreateIndex(
                name: "IX_PayrollEntries_CompanyId",
                table: "PayrollEntries",
                column: "CompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_PayrollAdvances_CompanyId",
                table: "PayrollAdvances",
                column: "CompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_PayrollAdvances_IssuedByUserId",
                table: "PayrollAdvances",
                column: "IssuedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_PayrollAdvances_SettledInPayrollEntryId",
                table: "PayrollAdvances",
                column: "SettledInPayrollEntryId");

            migrationBuilder.CreateIndex(
                name: "IX_PasswordResetTokens_CompanyId",
                table: "PasswordResetTokens",
                column: "CompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_PasswordResetTokens_UserId",
                table: "PasswordResetTokens",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_MaterialRequests_ApprovedByUserId",
                table: "MaterialRequests",
                column: "ApprovedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_MaterialRequests_BrigadeId",
                table: "MaterialRequests",
                column: "BrigadeId");

            migrationBuilder.CreateIndex(
                name: "IX_MaterialRequests_CompanyId",
                table: "MaterialRequests",
                column: "CompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_MaterialRequests_RequestedByUserId",
                table: "MaterialRequests",
                column: "RequestedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_MaterialDeliveries_CompanyId",
                table: "MaterialDeliveries",
                column: "CompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_MaterialDeliveries_ObjectId",
                table: "MaterialDeliveries",
                column: "ObjectId");

            migrationBuilder.CreateIndex(
                name: "IX_MaterialConsumptionReports_CompanyId",
                table: "MaterialConsumptionReports",
                column: "CompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_MaterialConsumptionReports_ObjectId",
                table: "MaterialConsumptionReports",
                column: "ObjectId");

            migrationBuilder.CreateIndex(
                name: "IX_MaterialConsumptionReports_ReportedByUserId",
                table: "MaterialConsumptionReports",
                column: "ReportedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_IndividualTasks_BonusApprovedByUserId",
                table: "IndividualTasks",
                column: "BonusApprovedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_IndividualTasks_CreatedByUserId",
                table: "IndividualTasks",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_IndividualTasks_WorkOrderId",
                table: "IndividualTasks",
                column: "WorkOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_EstimateItems_CompanyId",
                table: "EstimateItems",
                column: "CompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_EstimateItems_ObjectId",
                table: "EstimateItems",
                column: "ObjectId");

            migrationBuilder.CreateIndex(
                name: "IX_Customers_CompanyId",
                table: "Customers",
                column: "CompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_ConstructionObjects_CustomerId",
                table: "ConstructionObjects",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_Brigades_BrigadirUserId",
                table: "Brigades",
                column: "BrigadirUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Brigades_CompanyId",
                table: "Brigades",
                column: "CompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_AbsenceRecords_ApprovedByUserId",
                table: "AbsenceRecords",
                column: "ApprovedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_AbsenceRecords_CompanyId",
                table: "AbsenceRecords",
                column: "CompanyId");

            migrationBuilder.AddForeignKey(
                name: "FK_AbsenceRecords_Companies_CompanyId",
                table: "AbsenceRecords",
                column: "CompanyId",
                principalTable: "Companies",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_AbsenceRecords_Users_ApprovedByUserId",
                table: "AbsenceRecords",
                column: "ApprovedByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_AbsenceRecords_Workers_WorkerId",
                table: "AbsenceRecords",
                column: "WorkerId",
                principalTable: "Workers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_AdminAuditLogs_Companies_CompanyId",
                table: "AdminAuditLogs",
                column: "CompanyId",
                principalTable: "Companies",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_AdminAuditLogs_Users_ActorUserId",
                table: "AdminAuditLogs",
                column: "ActorUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Brigades_Companies_CompanyId",
                table: "Brigades",
                column: "CompanyId",
                principalTable: "Companies",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Brigades_Users_BrigadirUserId",
                table: "Brigades",
                column: "BrigadirUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ConstructionObjects_Companies_CompanyId",
                table: "ConstructionObjects",
                column: "CompanyId",
                principalTable: "Companies",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ConstructionObjects_Customers_CustomerId",
                table: "ConstructionObjects",
                column: "CustomerId",
                principalTable: "Customers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Customers_Companies_CompanyId",
                table: "Customers",
                column: "CompanyId",
                principalTable: "Companies",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_EstimateItems_Companies_CompanyId",
                table: "EstimateItems",
                column: "CompanyId",
                principalTable: "Companies",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_EstimateItems_ConstructionObjects_ObjectId",
                table: "EstimateItems",
                column: "ObjectId",
                principalTable: "ConstructionObjects",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_IndividualTasks_Brigades_BrigadeId",
                table: "IndividualTasks",
                column: "BrigadeId",
                principalTable: "Brigades",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_IndividualTasks_Companies_CompanyId",
                table: "IndividualTasks",
                column: "CompanyId",
                principalTable: "Companies",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_IndividualTasks_Users_BonusApprovedByUserId",
                table: "IndividualTasks",
                column: "BonusApprovedByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_IndividualTasks_Users_CreatedByUserId",
                table: "IndividualTasks",
                column: "CreatedByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_IndividualTasks_WorkOrders_WorkOrderId",
                table: "IndividualTasks",
                column: "WorkOrderId",
                principalTable: "WorkOrders",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_IndividualTasks_Workers_AssignedToWorkerId",
                table: "IndividualTasks",
                column: "AssignedToWorkerId",
                principalTable: "Workers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_MaterialConsumptionReports_Brigades_BrigadeId",
                table: "MaterialConsumptionReports",
                column: "BrigadeId",
                principalTable: "Brigades",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_MaterialConsumptionReports_Companies_CompanyId",
                table: "MaterialConsumptionReports",
                column: "CompanyId",
                principalTable: "Companies",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_MaterialConsumptionReports_ConstructionObjects_ObjectId",
                table: "MaterialConsumptionReports",
                column: "ObjectId",
                principalTable: "ConstructionObjects",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_MaterialConsumptionReports_Users_ReportedByUserId",
                table: "MaterialConsumptionReports",
                column: "ReportedByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_MaterialDeliveries_Companies_CompanyId",
                table: "MaterialDeliveries",
                column: "CompanyId",
                principalTable: "Companies",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_MaterialDeliveries_ConstructionObjects_ObjectId",
                table: "MaterialDeliveries",
                column: "ObjectId",
                principalTable: "ConstructionObjects",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_MaterialDeliveries_MaterialRequests_MaterialRequestId",
                table: "MaterialDeliveries",
                column: "MaterialRequestId",
                principalTable: "MaterialRequests",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_MaterialRequests_Brigades_BrigadeId",
                table: "MaterialRequests",
                column: "BrigadeId",
                principalTable: "Brigades",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_MaterialRequests_Companies_CompanyId",
                table: "MaterialRequests",
                column: "CompanyId",
                principalTable: "Companies",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_MaterialRequests_ConstructionObjects_ObjectId",
                table: "MaterialRequests",
                column: "ObjectId",
                principalTable: "ConstructionObjects",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_MaterialRequests_Users_ApprovedByUserId",
                table: "MaterialRequests",
                column: "ApprovedByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_MaterialRequests_Users_RequestedByUserId",
                table: "MaterialRequests",
                column: "RequestedByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_PasswordResetTokens_Companies_CompanyId",
                table: "PasswordResetTokens",
                column: "CompanyId",
                principalTable: "Companies",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_PasswordResetTokens_Users_UserId",
                table: "PasswordResetTokens",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_PayrollAdvances_Companies_CompanyId",
                table: "PayrollAdvances",
                column: "CompanyId",
                principalTable: "Companies",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_PayrollAdvances_PayrollEntries_SettledInPayrollEntryId",
                table: "PayrollAdvances",
                column: "SettledInPayrollEntryId",
                principalTable: "PayrollEntries",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_PayrollAdvances_Users_IssuedByUserId",
                table: "PayrollAdvances",
                column: "IssuedByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_PayrollAdvances_Workers_WorkerId",
                table: "PayrollAdvances",
                column: "WorkerId",
                principalTable: "Workers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_PayrollEntries_Companies_CompanyId",
                table: "PayrollEntries",
                column: "CompanyId",
                principalTable: "Companies",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_PayrollEntries_Workers_WorkerId",
                table: "PayrollEntries",
                column: "WorkerId",
                principalTable: "Workers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ProrabObjectAssignments_Companies_CompanyId",
                table: "ProrabObjectAssignments",
                column: "CompanyId",
                principalTable: "Companies",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ProrabObjectAssignments_ConstructionObjects_ObjectId",
                table: "ProrabObjectAssignments",
                column: "ObjectId",
                principalTable: "ConstructionObjects",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ProrabObjectAssignments_Users_AssignedByUserId",
                table: "ProrabObjectAssignments",
                column: "AssignedByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ProrabObjectAssignments_Users_ProrabUserId",
                table: "ProrabObjectAssignments",
                column: "ProrabUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_RefreshTokens_Companies_CompanyId",
                table: "RefreshTokens",
                column: "CompanyId",
                principalTable: "Companies",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_RefreshTokens_RefreshTokens_ReplacedByTokenId",
                table: "RefreshTokens",
                column: "ReplacedByTokenId",
                principalTable: "RefreshTokens",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_RefreshTokens_Users_UserId",
                table: "RefreshTokens",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_TaskLogs_Companies_CompanyId",
                table: "TaskLogs",
                column: "CompanyId",
                principalTable: "Companies",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_TaskLogs_Users_ChangedByUserId",
                table: "TaskLogs",
                column: "ChangedByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_TelegramLinkCodes_Companies_CompanyId",
                table: "TelegramLinkCodes",
                column: "CompanyId",
                principalTable: "Companies",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_TelegramLinkCodes_Users_CreatedByUserId",
                table: "TelegramLinkCodes",
                column: "CreatedByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_TelegramLinkCodes_Users_UserId",
                table: "TelegramLinkCodes",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_TelegramLinks_Companies_CompanyId",
                table: "TelegramLinks",
                column: "CompanyId",
                principalTable: "Companies",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_TelegramLinks_Users_UserId",
                table: "TelegramLinks",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Timesheets_Companies_CompanyId",
                table: "Timesheets",
                column: "CompanyId",
                principalTable: "Companies",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Timesheets_ConstructionObjects_ObjectId",
                table: "Timesheets",
                column: "ObjectId",
                principalTable: "ConstructionObjects",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Timesheets_Users_ApprovedByUserId",
                table: "Timesheets",
                column: "ApprovedByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Timesheets_WorkOrderProgresses_WorkOrderProgressId",
                table: "Timesheets",
                column: "WorkOrderProgressId",
                principalTable: "WorkOrderProgresses",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Timesheets_Workers_WorkerId",
                table: "Timesheets",
                column: "WorkerId",
                principalTable: "Workers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Workers_Brigades_BrigadeId",
                table: "Workers",
                column: "BrigadeId",
                principalTable: "Brigades",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Workers_Companies_CompanyId",
                table: "Workers",
                column: "CompanyId",
                principalTable: "Companies",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Workers_Users_UserId",
                table: "Workers",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_WorkOrderPayoutShares_Companies_CompanyId",
                table: "WorkOrderPayoutShares",
                column: "CompanyId",
                principalTable: "Companies",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_WorkOrderPayoutShares_Users_ApprovedByUserId",
                table: "WorkOrderPayoutShares",
                column: "ApprovedByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_WorkOrderPayoutShares_Users_SetByUserId",
                table: "WorkOrderPayoutShares",
                column: "SetByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_WorkOrderPayoutShares_WorkOrders_WorkOrderId",
                table: "WorkOrderPayoutShares",
                column: "WorkOrderId",
                principalTable: "WorkOrders",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_WorkOrderPayoutShares_Workers_WorkerId",
                table: "WorkOrderPayoutShares",
                column: "WorkerId",
                principalTable: "Workers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_WorkOrderProgresses_Companies_CompanyId",
                table: "WorkOrderProgresses",
                column: "CompanyId",
                principalTable: "Companies",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_WorkOrderProgresses_Users_ReportedByUserId",
                table: "WorkOrderProgresses",
                column: "ReportedByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_WorkOrderProgresses_WorkOrders_WorkOrderId",
                table: "WorkOrderProgresses",
                column: "WorkOrderId",
                principalTable: "WorkOrders",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_WorkOrders_Brigades_BrigadeId",
                table: "WorkOrders",
                column: "BrigadeId",
                principalTable: "Brigades",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_WorkOrders_Companies_CompanyId",
                table: "WorkOrders",
                column: "CompanyId",
                principalTable: "Companies",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_WorkOrders_ConstructionObjects_ObjectId",
                table: "WorkOrders",
                column: "ObjectId",
                principalTable: "ConstructionObjects",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_WorkOrders_EstimateItems_EstimateItemId",
                table: "WorkOrders",
                column: "EstimateItemId",
                principalTable: "EstimateItems",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_WorkOrders_Users_CreatedByUserId",
                table: "WorkOrders",
                column: "CreatedByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AbsenceRecords_Companies_CompanyId",
                table: "AbsenceRecords");

            migrationBuilder.DropForeignKey(
                name: "FK_AbsenceRecords_Users_ApprovedByUserId",
                table: "AbsenceRecords");

            migrationBuilder.DropForeignKey(
                name: "FK_AbsenceRecords_Workers_WorkerId",
                table: "AbsenceRecords");

            migrationBuilder.DropForeignKey(
                name: "FK_AdminAuditLogs_Companies_CompanyId",
                table: "AdminAuditLogs");

            migrationBuilder.DropForeignKey(
                name: "FK_AdminAuditLogs_Users_ActorUserId",
                table: "AdminAuditLogs");

            migrationBuilder.DropForeignKey(
                name: "FK_Brigades_Companies_CompanyId",
                table: "Brigades");

            migrationBuilder.DropForeignKey(
                name: "FK_Brigades_Users_BrigadirUserId",
                table: "Brigades");

            migrationBuilder.DropForeignKey(
                name: "FK_ConstructionObjects_Companies_CompanyId",
                table: "ConstructionObjects");

            migrationBuilder.DropForeignKey(
                name: "FK_ConstructionObjects_Customers_CustomerId",
                table: "ConstructionObjects");

            migrationBuilder.DropForeignKey(
                name: "FK_Customers_Companies_CompanyId",
                table: "Customers");

            migrationBuilder.DropForeignKey(
                name: "FK_EstimateItems_Companies_CompanyId",
                table: "EstimateItems");

            migrationBuilder.DropForeignKey(
                name: "FK_EstimateItems_ConstructionObjects_ObjectId",
                table: "EstimateItems");

            migrationBuilder.DropForeignKey(
                name: "FK_IndividualTasks_Brigades_BrigadeId",
                table: "IndividualTasks");

            migrationBuilder.DropForeignKey(
                name: "FK_IndividualTasks_Companies_CompanyId",
                table: "IndividualTasks");

            migrationBuilder.DropForeignKey(
                name: "FK_IndividualTasks_Users_BonusApprovedByUserId",
                table: "IndividualTasks");

            migrationBuilder.DropForeignKey(
                name: "FK_IndividualTasks_Users_CreatedByUserId",
                table: "IndividualTasks");

            migrationBuilder.DropForeignKey(
                name: "FK_IndividualTasks_WorkOrders_WorkOrderId",
                table: "IndividualTasks");

            migrationBuilder.DropForeignKey(
                name: "FK_IndividualTasks_Workers_AssignedToWorkerId",
                table: "IndividualTasks");

            migrationBuilder.DropForeignKey(
                name: "FK_MaterialConsumptionReports_Brigades_BrigadeId",
                table: "MaterialConsumptionReports");

            migrationBuilder.DropForeignKey(
                name: "FK_MaterialConsumptionReports_Companies_CompanyId",
                table: "MaterialConsumptionReports");

            migrationBuilder.DropForeignKey(
                name: "FK_MaterialConsumptionReports_ConstructionObjects_ObjectId",
                table: "MaterialConsumptionReports");

            migrationBuilder.DropForeignKey(
                name: "FK_MaterialConsumptionReports_Users_ReportedByUserId",
                table: "MaterialConsumptionReports");

            migrationBuilder.DropForeignKey(
                name: "FK_MaterialDeliveries_Companies_CompanyId",
                table: "MaterialDeliveries");

            migrationBuilder.DropForeignKey(
                name: "FK_MaterialDeliveries_ConstructionObjects_ObjectId",
                table: "MaterialDeliveries");

            migrationBuilder.DropForeignKey(
                name: "FK_MaterialDeliveries_MaterialRequests_MaterialRequestId",
                table: "MaterialDeliveries");

            migrationBuilder.DropForeignKey(
                name: "FK_MaterialRequests_Brigades_BrigadeId",
                table: "MaterialRequests");

            migrationBuilder.DropForeignKey(
                name: "FK_MaterialRequests_Companies_CompanyId",
                table: "MaterialRequests");

            migrationBuilder.DropForeignKey(
                name: "FK_MaterialRequests_ConstructionObjects_ObjectId",
                table: "MaterialRequests");

            migrationBuilder.DropForeignKey(
                name: "FK_MaterialRequests_Users_ApprovedByUserId",
                table: "MaterialRequests");

            migrationBuilder.DropForeignKey(
                name: "FK_MaterialRequests_Users_RequestedByUserId",
                table: "MaterialRequests");

            migrationBuilder.DropForeignKey(
                name: "FK_PasswordResetTokens_Companies_CompanyId",
                table: "PasswordResetTokens");

            migrationBuilder.DropForeignKey(
                name: "FK_PasswordResetTokens_Users_UserId",
                table: "PasswordResetTokens");

            migrationBuilder.DropForeignKey(
                name: "FK_PayrollAdvances_Companies_CompanyId",
                table: "PayrollAdvances");

            migrationBuilder.DropForeignKey(
                name: "FK_PayrollAdvances_PayrollEntries_SettledInPayrollEntryId",
                table: "PayrollAdvances");

            migrationBuilder.DropForeignKey(
                name: "FK_PayrollAdvances_Users_IssuedByUserId",
                table: "PayrollAdvances");

            migrationBuilder.DropForeignKey(
                name: "FK_PayrollAdvances_Workers_WorkerId",
                table: "PayrollAdvances");

            migrationBuilder.DropForeignKey(
                name: "FK_PayrollEntries_Companies_CompanyId",
                table: "PayrollEntries");

            migrationBuilder.DropForeignKey(
                name: "FK_PayrollEntries_Workers_WorkerId",
                table: "PayrollEntries");

            migrationBuilder.DropForeignKey(
                name: "FK_ProrabObjectAssignments_Companies_CompanyId",
                table: "ProrabObjectAssignments");

            migrationBuilder.DropForeignKey(
                name: "FK_ProrabObjectAssignments_ConstructionObjects_ObjectId",
                table: "ProrabObjectAssignments");

            migrationBuilder.DropForeignKey(
                name: "FK_ProrabObjectAssignments_Users_AssignedByUserId",
                table: "ProrabObjectAssignments");

            migrationBuilder.DropForeignKey(
                name: "FK_ProrabObjectAssignments_Users_ProrabUserId",
                table: "ProrabObjectAssignments");

            migrationBuilder.DropForeignKey(
                name: "FK_RefreshTokens_Companies_CompanyId",
                table: "RefreshTokens");

            migrationBuilder.DropForeignKey(
                name: "FK_RefreshTokens_RefreshTokens_ReplacedByTokenId",
                table: "RefreshTokens");

            migrationBuilder.DropForeignKey(
                name: "FK_RefreshTokens_Users_UserId",
                table: "RefreshTokens");

            migrationBuilder.DropForeignKey(
                name: "FK_TaskLogs_Companies_CompanyId",
                table: "TaskLogs");

            migrationBuilder.DropForeignKey(
                name: "FK_TaskLogs_Users_ChangedByUserId",
                table: "TaskLogs");

            migrationBuilder.DropForeignKey(
                name: "FK_TelegramLinkCodes_Companies_CompanyId",
                table: "TelegramLinkCodes");

            migrationBuilder.DropForeignKey(
                name: "FK_TelegramLinkCodes_Users_CreatedByUserId",
                table: "TelegramLinkCodes");

            migrationBuilder.DropForeignKey(
                name: "FK_TelegramLinkCodes_Users_UserId",
                table: "TelegramLinkCodes");

            migrationBuilder.DropForeignKey(
                name: "FK_TelegramLinks_Companies_CompanyId",
                table: "TelegramLinks");

            migrationBuilder.DropForeignKey(
                name: "FK_TelegramLinks_Users_UserId",
                table: "TelegramLinks");

            migrationBuilder.DropForeignKey(
                name: "FK_Timesheets_Companies_CompanyId",
                table: "Timesheets");

            migrationBuilder.DropForeignKey(
                name: "FK_Timesheets_ConstructionObjects_ObjectId",
                table: "Timesheets");

            migrationBuilder.DropForeignKey(
                name: "FK_Timesheets_Users_ApprovedByUserId",
                table: "Timesheets");

            migrationBuilder.DropForeignKey(
                name: "FK_Timesheets_WorkOrderProgresses_WorkOrderProgressId",
                table: "Timesheets");

            migrationBuilder.DropForeignKey(
                name: "FK_Timesheets_Workers_WorkerId",
                table: "Timesheets");

            migrationBuilder.DropForeignKey(
                name: "FK_Workers_Brigades_BrigadeId",
                table: "Workers");

            migrationBuilder.DropForeignKey(
                name: "FK_Workers_Companies_CompanyId",
                table: "Workers");

            migrationBuilder.DropForeignKey(
                name: "FK_Workers_Users_UserId",
                table: "Workers");

            migrationBuilder.DropForeignKey(
                name: "FK_WorkOrderPayoutShares_Companies_CompanyId",
                table: "WorkOrderPayoutShares");

            migrationBuilder.DropForeignKey(
                name: "FK_WorkOrderPayoutShares_Users_ApprovedByUserId",
                table: "WorkOrderPayoutShares");

            migrationBuilder.DropForeignKey(
                name: "FK_WorkOrderPayoutShares_Users_SetByUserId",
                table: "WorkOrderPayoutShares");

            migrationBuilder.DropForeignKey(
                name: "FK_WorkOrderPayoutShares_WorkOrders_WorkOrderId",
                table: "WorkOrderPayoutShares");

            migrationBuilder.DropForeignKey(
                name: "FK_WorkOrderPayoutShares_Workers_WorkerId",
                table: "WorkOrderPayoutShares");

            migrationBuilder.DropForeignKey(
                name: "FK_WorkOrderProgresses_Companies_CompanyId",
                table: "WorkOrderProgresses");

            migrationBuilder.DropForeignKey(
                name: "FK_WorkOrderProgresses_Users_ReportedByUserId",
                table: "WorkOrderProgresses");

            migrationBuilder.DropForeignKey(
                name: "FK_WorkOrderProgresses_WorkOrders_WorkOrderId",
                table: "WorkOrderProgresses");

            migrationBuilder.DropForeignKey(
                name: "FK_WorkOrders_Brigades_BrigadeId",
                table: "WorkOrders");

            migrationBuilder.DropForeignKey(
                name: "FK_WorkOrders_Companies_CompanyId",
                table: "WorkOrders");

            migrationBuilder.DropForeignKey(
                name: "FK_WorkOrders_ConstructionObjects_ObjectId",
                table: "WorkOrders");

            migrationBuilder.DropForeignKey(
                name: "FK_WorkOrders_EstimateItems_EstimateItemId",
                table: "WorkOrders");

            migrationBuilder.DropForeignKey(
                name: "FK_WorkOrders_Users_CreatedByUserId",
                table: "WorkOrders");

            migrationBuilder.DropIndex(
                name: "IX_WorkOrders_BrigadeId",
                table: "WorkOrders");

            migrationBuilder.DropIndex(
                name: "IX_WorkOrders_CreatedByUserId",
                table: "WorkOrders");

            migrationBuilder.DropIndex(
                name: "IX_WorkOrders_EstimateItemId",
                table: "WorkOrders");

            migrationBuilder.DropIndex(
                name: "IX_WorkOrderProgresses_CompanyId",
                table: "WorkOrderProgresses");

            migrationBuilder.DropIndex(
                name: "IX_WorkOrderProgresses_ReportedByUserId",
                table: "WorkOrderProgresses");

            migrationBuilder.DropIndex(
                name: "IX_WorkOrderPayoutShares_ApprovedByUserId",
                table: "WorkOrderPayoutShares");

            migrationBuilder.DropIndex(
                name: "IX_WorkOrderPayoutShares_CompanyId",
                table: "WorkOrderPayoutShares");

            migrationBuilder.DropIndex(
                name: "IX_WorkOrderPayoutShares_SetByUserId",
                table: "WorkOrderPayoutShares");

            migrationBuilder.DropIndex(
                name: "IX_Workers_UserId",
                table: "Workers");

            migrationBuilder.DropIndex(
                name: "IX_Timesheets_ApprovedByUserId",
                table: "Timesheets");

            migrationBuilder.DropIndex(
                name: "IX_Timesheets_CompanyId",
                table: "Timesheets");

            migrationBuilder.DropIndex(
                name: "IX_Timesheets_WorkOrderProgressId",
                table: "Timesheets");

            migrationBuilder.DropIndex(
                name: "IX_TelegramLinks_CompanyId",
                table: "TelegramLinks");

            migrationBuilder.DropIndex(
                name: "IX_TelegramLinkCodes_CompanyId",
                table: "TelegramLinkCodes");

            migrationBuilder.DropIndex(
                name: "IX_TelegramLinkCodes_CreatedByUserId",
                table: "TelegramLinkCodes");

            migrationBuilder.DropIndex(
                name: "IX_TelegramLinkCodes_UserId",
                table: "TelegramLinkCodes");

            migrationBuilder.DropIndex(
                name: "IX_TaskLogs_ChangedByUserId",
                table: "TaskLogs");

            migrationBuilder.DropIndex(
                name: "IX_TaskLogs_CompanyId",
                table: "TaskLogs");

            migrationBuilder.DropIndex(
                name: "IX_RefreshTokens_CompanyId",
                table: "RefreshTokens");

            migrationBuilder.DropIndex(
                name: "IX_RefreshTokens_ReplacedByTokenId",
                table: "RefreshTokens");

            migrationBuilder.DropIndex(
                name: "IX_ProrabObjectAssignments_AssignedByUserId",
                table: "ProrabObjectAssignments");

            migrationBuilder.DropIndex(
                name: "IX_ProrabObjectAssignments_CompanyId",
                table: "ProrabObjectAssignments");

            migrationBuilder.DropIndex(
                name: "IX_ProrabObjectAssignments_ObjectId",
                table: "ProrabObjectAssignments");

            migrationBuilder.DropIndex(
                name: "IX_PayrollEntries_CompanyId",
                table: "PayrollEntries");

            migrationBuilder.DropIndex(
                name: "IX_PayrollAdvances_CompanyId",
                table: "PayrollAdvances");

            migrationBuilder.DropIndex(
                name: "IX_PayrollAdvances_IssuedByUserId",
                table: "PayrollAdvances");

            migrationBuilder.DropIndex(
                name: "IX_PayrollAdvances_SettledInPayrollEntryId",
                table: "PayrollAdvances");

            migrationBuilder.DropIndex(
                name: "IX_PasswordResetTokens_CompanyId",
                table: "PasswordResetTokens");

            migrationBuilder.DropIndex(
                name: "IX_PasswordResetTokens_UserId",
                table: "PasswordResetTokens");

            migrationBuilder.DropIndex(
                name: "IX_MaterialRequests_ApprovedByUserId",
                table: "MaterialRequests");

            migrationBuilder.DropIndex(
                name: "IX_MaterialRequests_BrigadeId",
                table: "MaterialRequests");

            migrationBuilder.DropIndex(
                name: "IX_MaterialRequests_CompanyId",
                table: "MaterialRequests");

            migrationBuilder.DropIndex(
                name: "IX_MaterialRequests_RequestedByUserId",
                table: "MaterialRequests");

            migrationBuilder.DropIndex(
                name: "IX_MaterialDeliveries_CompanyId",
                table: "MaterialDeliveries");

            migrationBuilder.DropIndex(
                name: "IX_MaterialDeliveries_ObjectId",
                table: "MaterialDeliveries");

            migrationBuilder.DropIndex(
                name: "IX_MaterialConsumptionReports_CompanyId",
                table: "MaterialConsumptionReports");

            migrationBuilder.DropIndex(
                name: "IX_MaterialConsumptionReports_ObjectId",
                table: "MaterialConsumptionReports");

            migrationBuilder.DropIndex(
                name: "IX_MaterialConsumptionReports_ReportedByUserId",
                table: "MaterialConsumptionReports");

            migrationBuilder.DropIndex(
                name: "IX_IndividualTasks_BonusApprovedByUserId",
                table: "IndividualTasks");

            migrationBuilder.DropIndex(
                name: "IX_IndividualTasks_CreatedByUserId",
                table: "IndividualTasks");

            migrationBuilder.DropIndex(
                name: "IX_IndividualTasks_WorkOrderId",
                table: "IndividualTasks");

            migrationBuilder.DropIndex(
                name: "IX_EstimateItems_CompanyId",
                table: "EstimateItems");

            migrationBuilder.DropIndex(
                name: "IX_EstimateItems_ObjectId",
                table: "EstimateItems");

            migrationBuilder.DropIndex(
                name: "IX_Customers_CompanyId",
                table: "Customers");

            migrationBuilder.DropIndex(
                name: "IX_ConstructionObjects_CustomerId",
                table: "ConstructionObjects");

            migrationBuilder.DropIndex(
                name: "IX_Brigades_BrigadirUserId",
                table: "Brigades");

            migrationBuilder.DropIndex(
                name: "IX_Brigades_CompanyId",
                table: "Brigades");

            migrationBuilder.DropIndex(
                name: "IX_AbsenceRecords_ApprovedByUserId",
                table: "AbsenceRecords");

            migrationBuilder.DropIndex(
                name: "IX_AbsenceRecords_CompanyId",
                table: "AbsenceRecords");
        }
    }
}
