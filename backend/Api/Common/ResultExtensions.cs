using Domain.Common;
using Microsoft.AspNetCore.Mvc;

namespace Api.Common;

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

        return new ObjectResult(payload) { StatusCode = ErrorCodeCatalog.GetStatusCode(error.Code) };
    }
}
