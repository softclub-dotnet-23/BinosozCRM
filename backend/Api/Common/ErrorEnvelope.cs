namespace Api.Common;

// The §9.1 error shape, for the handful of places (middleware, rate limiter
// rejection) that need to write it directly instead of going through
// ResultExtensions.ToActionResult.
public static class ErrorEnvelope
{
    public static Task WriteAsync(HttpContext context, int statusCode, string code, string message, CancellationToken cancellationToken = default)
    {
        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json";

        return context.Response.WriteAsJsonAsync(new
        {
            error = new
            {
                code,
                message,
                traceId = context.TraceIdentifier
            }
        }, cancellationToken);
    }
}
