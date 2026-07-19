using Microsoft.AspNetCore.Http;

namespace Api.Common;

// MASTER §9.2, plus PASSWORD_CHANGE_REQUIRED from §5.27 (real, just not in
// the §9.2 table). MATERIAL_REQUEST_OVERDELIVERY is deliberately excluded —
// §9.2 marks it 200, "not an error, a UI warning", so it never flows through
// Result.Failure/this catalogue at all.
//
// BRIGADE_NOT_FOUND / WORKER_NOT_FOUND / USER_NOT_FOUND (Phase 1 Step 2),
// CUSTOMER_NOT_FOUND / OBJECT_NOT_FOUND (Phase 1 Step 1), ESTIMATE_ITEM_NOT_FOUND
// (Phase 2 Step 1), INDIVIDUAL_TASK_NOT_FOUND (Phase 2 Step 2, a task
// belonging to another brigade — §4's "не видит чужие бригады (404, не
// 403)"), TIMESHEET_NOT_FOUND (Phase 3 Step 1, same reasoning): same pattern
// as WORK_ORDER_NOT_FOUND / PRORAB_NOT_ASSIGNED_TO_OBJECT — a route or body
// reference to another company's/brigade's row (or no row at all) reads as
// 404, not 400/403, per MASTER §11.5 rule 2. Not in §9.2's table either,
// same as PASSWORD_CHANGE_REQUIRED above.
//
// PRORAB_ALREADY_ASSIGNED (Phase 1 Step 4): not in §9.2's table — the unique
// (ProrabUserId, ObjectId) constraint on ProrabObjectAssignment (§5.8) means
// a repeat assignment would otherwise be a raw DB unique-violation; surfaced
// as a clean 409, same family as CONCURRENCY_CONFLICT (an existing-state
// conflict, not a validation failure or a missing row).
//
// WORKER_HAS_OPEN_TASKS (Phase 3 Step 3): not in §9.2's table — §8.9's
// termination lifecycle blocks Worker.Terminate outright while the worker
// has an IndividualTask with Status != Done ("не удалять молча, там может
// быть незакрытая работа").
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
        ["WORK_ORDER_NO_PROGRESS"] = StatusCodes.Status400BadRequest,
        ["INDIVIDUAL_TASK_WRONG_BRIGADE"] = StatusCodes.Status400BadRequest,
        ["INDIVIDUAL_TASK_INVALID_TRANSITION"] = StatusCodes.Status400BadRequest,
        ["INDIVIDUAL_TASK_NOT_FOUND"] = StatusCodes.Status404NotFound,
        ["TIMESHEET_ALREADY_CHECKED_IN"] = StatusCodes.Status400BadRequest,
        ["TIMESHEET_NOT_FOUND"] = StatusCodes.Status404NotFound,
        ["TIMESHEET_ABSENCE_CONFLICT"] = StatusCodes.Status400BadRequest,
        ["PAYROLL_ADJUSTMENT_REASON_REQUIRED"] = StatusCodes.Status400BadRequest,
        ["PAYROLL_ALREADY_PAID"] = StatusCodes.Status400BadRequest,
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
