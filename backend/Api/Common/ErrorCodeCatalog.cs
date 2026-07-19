using Microsoft.AspNetCore.Http;

namespace Api.Common;

// MASTER §9.2, plus PASSWORD_CHANGE_REQUIRED from §5.27 (real, just not in
// the §9.2 table). MATERIAL_REQUEST_OVERDELIVERY is deliberately excluded —
// §9.2 marks it 200, "not an error, a UI warning", so it never flows through
// Result.Failure/this catalogue at all.
//
// BRIGADE_NOT_FOUND / WORKER_NOT_FOUND / USER_NOT_FOUND (Phase 1 Step 2),
// CUSTOMER_NOT_FOUND / OBJECT_NOT_FOUND (Phase 1 Step 1): same pattern as
// WORK_ORDER_NOT_FOUND / PRORAB_NOT_ASSIGNED_TO_OBJECT — a route or body
// reference to another company's row (or no row at all) reads as 404, not
// 400/403, per MASTER §11.5 rule 2. Not in §9.2's table either, same as
// PASSWORD_CHANGE_REQUIRED above.
//
// PRORAB_ALREADY_ASSIGNED (Phase 1 Step 4): not in §9.2's table — the unique
// (ProrabUserId, ObjectId) constraint on ProrabObjectAssignment (§5.8) means
// a repeat assignment would otherwise be a raw DB unique-violation; surfaced
// as a clean 409, same family as CONCURRENCY_CONFLICT (an existing-state
// conflict, not a validation failure or a missing row).
//
// WORK_ORDER_NOT_IN_PROGRESS / PHOTO_TOO_LARGE / PHOTO_INVALID_TYPE (Phase 2
// Step 4): not in §9.2's table either. The first is §7.1's "ReportedQty
// принимается только при InProgress" guard — not a status transition itself
// (progress reports don't change WorkOrder.Status), so it doesn't reuse
// WORK_ORDER_INVALID_TRANSITION. The other two enforce §11.9's photo rules
// (size limit, allow-list MIME) at the Application boundary.
//
// WORKER_HAS_OPEN_TASKS (Phase 3 Step 3): not in §9.2's table — §8.9's
// termination lifecycle, point 1: a Worker with an open (Status != Done)
// IndividualTask can't be terminated until a Brigadir closes or reassigns
// it. Cross-aggregate guard, so it lives in the Application handler, not
// Worker.Terminate() itself (a plain Domain mutator, no Result).
//
// MATERIAL_REQUEST_NOT_FOUND / MATERIAL_REQUEST_INVALID_TRANSITION (Phase 4
// Step 2): same "not in §9.2's table" pattern as WORK_ORDER_*. Note:
// force-close's "обязательный комментарий" (§7.3/§9.4) is validated at the
// Application boundary but currently has nowhere to persist — MaterialRequest
// has no Comment field. Flagged as "нужно от Ахмада" in
// ForceCloseMaterialRequestCommand, not silently dropped without a trace.
//
// WORK_ORDER_PAYOUT_SHARES_LOCKED / WORK_ORDER_PAYOUT_SHARE_WRONG_BRIGADE
// (Phase 5 Step 1): not in §9.2's table — §7.3's boundary case ("доли можно
// переписать, пока не Accepted") implies a lock after Accepted that isn't
// spelled out as its own error code; WRONG_BRIGADE mirrors
// INDIVIDUAL_TASK_WRONG_BRIGADE's precedent (a share for a worker outside
// the work order's own brigade is a 400, not silently accepted).
//
// PAYROLL_ENTRY_NOT_FOUND / PAYROLL_ENTRY_NOT_DRAFT (Phase 5 Step 3): same
// "not in §9.2's table" pattern. NOT_DRAFT surfaces PayrollEntry.UpdateDraft()'s
// existing Domain guard — POST /payroll is an upsert (create-or-recalculate,
// see CreatePayrollEntryCommand), and a second call against an
// already-Approved/Paid entry must fail cleanly, not silently overwrite a
// locked-in FinalAmount.
//
// PAYROLL_ENTRY_INVALID_TRANSITION (Phase 5 Step 7): Domain's own guard on
// Approve()/Pay(), now wired up. PAYROLL_ENTRY_RECALCULATION_REQUIRED
// (Phase 5 Step 7, not in §9.2's table): ApprovePayrollEntryCommand's own
// safety check — if an advance was issued (or settled elsewhere) after this
// entry's AdvanceDeductedAmount was last computed, the two sums no longer
// match, and approving would lock in a stale FinalAmount. Caller must
// recalculate via POST /payroll first.
//
// Codes an entity raises that aren't in this list yet (e.g. individual
// entity-specific transition guards not called out in §9.2) fall through to
// the 400 default below — §9.2 documents the interesting/non-obvious cases,
// not literally every failure mode of all 26 entities.
public static class ErrorCodeCatalog
{
    private static readonly Dictionary<string, int> StatusCodesByCode = new()
    {
        ["AUTH_INVALID_CREDENTIALS"] = StatusCodes.Status400BadRequest,
        ["AUTH_ACCOUNT_DEACTIVATED"] = StatusCodes.Status400BadRequest,
        ["AUTH_TOKEN_EXPIRED"] = StatusCodes.Status401Unauthorized,
        ["AUTH_REFRESH_TOKEN_INVALID"] = StatusCodes.Status401Unauthorized,
        ["AUTH_REFRESH_TOKEN_REUSED"] = StatusCodes.Status401Unauthorized,
        ["AUTH_RESET_TOKEN_INVALID"] = StatusCodes.Status400BadRequest,
        ["PASSWORD_CHANGE_REQUIRED"] = StatusCodes.Status403Forbidden,
        ["VALIDATION_FAILED"] = StatusCodes.Status400BadRequest,
        ["WORKER_UNDERAGE"] = StatusCodes.Status400BadRequest,
        ["WORKER_HAS_OPEN_TASKS"] = StatusCodes.Status400BadRequest,
        ["BRIGADE_NOT_FOUND"] = StatusCodes.Status404NotFound,
        ["WORKER_NOT_FOUND"] = StatusCodes.Status404NotFound,
        ["USER_NOT_FOUND"] = StatusCodes.Status404NotFound,
        ["CUSTOMER_NOT_FOUND"] = StatusCodes.Status404NotFound,
        ["OBJECT_NOT_FOUND"] = StatusCodes.Status404NotFound,
        ["ESTIMATE_ITEM_NOT_FOUND"] = StatusCodes.Status404NotFound,
        ["WORK_ORDER_INVALID_TRANSITION"] = StatusCodes.Status400BadRequest,
        ["WORK_ORDER_NOT_FOUND"] = StatusCodes.Status404NotFound,
        ["WORK_ORDER_SHARES_INVALID"] = StatusCodes.Status400BadRequest,
        ["WORK_ORDER_PAYOUT_SHARES_LOCKED"] = StatusCodes.Status400BadRequest,
        ["WORK_ORDER_PAYOUT_SHARE_WRONG_BRIGADE"] = StatusCodes.Status400BadRequest,
        ["WORK_ORDER_NO_PROGRESS"] = StatusCodes.Status400BadRequest,
        ["WORK_ORDER_NOT_IN_PROGRESS"] = StatusCodes.Status400BadRequest,
        ["PHOTO_TOO_LARGE"] = StatusCodes.Status400BadRequest,
        ["PHOTO_INVALID_TYPE"] = StatusCodes.Status400BadRequest,
        ["INDIVIDUAL_TASK_WRONG_BRIGADE"] = StatusCodes.Status400BadRequest,
        ["INDIVIDUAL_TASK_NOT_FOUND"] = StatusCodes.Status404NotFound,
        ["INDIVIDUAL_TASK_INVALID_TRANSITION"] = StatusCodes.Status400BadRequest,
        ["TIMESHEET_ALREADY_CHECKED_IN"] = StatusCodes.Status400BadRequest,
        ["TIMESHEET_ABSENCE_CONFLICT"] = StatusCodes.Status400BadRequest,
        ["TIMESHEET_NOT_FOUND"] = StatusCodes.Status404NotFound,
        ["ABSENCE_RECORD_NOT_FOUND"] = StatusCodes.Status404NotFound,
        ["MATERIAL_CONSUMPTION_REPORT_NOT_FOUND"] = StatusCodes.Status404NotFound,
        ["MATERIAL_REQUEST_NOT_FOUND"] = StatusCodes.Status404NotFound,
        ["MATERIAL_REQUEST_INVALID_TRANSITION"] = StatusCodes.Status400BadRequest,
        ["MATERIAL_DELIVERY_NOT_FOUND"] = StatusCodes.Status404NotFound,
        ["PAYROLL_ADJUSTMENT_REASON_REQUIRED"] = StatusCodes.Status400BadRequest,
        ["PAYROLL_ALREADY_PAID"] = StatusCodes.Status400BadRequest,
        ["PAYROLL_ENTRY_NOT_FOUND"] = StatusCodes.Status404NotFound,
        ["PAYROLL_ENTRY_NOT_DRAFT"] = StatusCodes.Status400BadRequest,
        ["PAYROLL_ENTRY_INVALID_TRANSITION"] = StatusCodes.Status400BadRequest,
        ["PAYROLL_ENTRY_RECALCULATION_REQUIRED"] = StatusCodes.Status400BadRequest,
        ["BONUS_NOT_ELIGIBLE"] = StatusCodes.Status400BadRequest,
        ["PRORAB_NOT_ASSIGNED_TO_OBJECT"] = StatusCodes.Status404NotFound,
        ["PRORAB_ALREADY_ASSIGNED"] = StatusCodes.Status409Conflict,
        ["CONCURRENCY_CONFLICT"] = StatusCodes.Status409Conflict,
        ["TELEGRAM_LINK_CODE_EXPIRED"] = StatusCodes.Status400BadRequest,
        ["TELEGRAM_LINK_CODE_INVALID"] = StatusCodes.Status400BadRequest,
        ["RATE_LIMITED"] = StatusCodes.Status429TooManyRequests,
        ["INTERNAL_ERROR"] = StatusCodes.Status500InternalServerError
    };

    public static int GetStatusCode(string code) =>
        StatusCodesByCode.GetValueOrDefault(code, StatusCodes.Status400BadRequest);
}
