using Api.Common;

namespace Api.Middleware;

// MASTER §3/§9.1: the one place an unhandled exception turns into the
// standard error envelope. Must run first in the pipeline — everything
// downstream (routing, auth, controllers) can throw. Full details go to the
// server log only; the client gets a generic message and a traceId to
// correlate with it, never a stack trace or exception message.
public sealed class ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (Exception ex)
        {
            logger.LogError(
                ex,
                "Unhandled exception processing {Method} {Path} (traceId {TraceId})",
                context.Request.Method,
                context.Request.Path,
                context.TraceIdentifier);

            await ErrorEnvelope.WriteAsync(
                context,
                StatusCodes.Status500InternalServerError,
                "INTERNAL_ERROR",
                "An unexpected error occurred.");
        }
    }
}
