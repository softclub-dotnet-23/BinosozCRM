using Domain.Common;
using Microsoft.AspNetCore.Mvc;

namespace Api.Common;

// Provisional: maps Result failures to the §9.1 error envelope for the auth
// codes that exist so far. Step 8 (ExceptionHandlingMiddleware) replaces this
// with the full §9.2 catalogue and centralizes the mapping project-wide.
public static class ResultExtensions
{
    public static IActionResult ToActionResult(this Result result, HttpContext httpContext) =>
        result.IsSuccess ? new OkResult() : ToProblemResult(result.Error, httpContext);

    public static IActionResult ToActionResult<T>(this Result<T> result, HttpContext httpContext) =>
        result.IsSuccess ? new OkObjectResult(result.Value) : ToProblemResult(result.Error, httpContext);

    private static IActionResult ToProblemResult(Error error, HttpContext httpContext)
    {
        var payload = new
        {
            error = new
            {
                code = error.Code,
                message = error.Message,
                traceId = httpContext.TraceIdentifier
            }
        };

        return new ObjectResult(payload) { StatusCode = MapStatusCode(error.Code) };
    }

    private static int MapStatusCode(string code) => code switch
    {
        "AUTH_INVALID_CREDENTIALS" => StatusCodes.Status400BadRequest,
        "AUTH_ACCOUNT_DEACTIVATED" => StatusCodes.Status400BadRequest,
        "AUTH_TOKEN_EXPIRED" => StatusCodes.Status401Unauthorized,
        "AUTH_REFRESH_TOKEN_INVALID" => StatusCodes.Status401Unauthorized,
        "AUTH_REFRESH_TOKEN_REUSED" => StatusCodes.Status401Unauthorized,
        "VALIDATION_FAILED" => StatusCodes.Status400BadRequest,
        _ => StatusCodes.Status400BadRequest
    };
}
