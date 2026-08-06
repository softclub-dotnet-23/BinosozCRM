namespace Api.Middleware;

// MASTER §11.3. HSTS itself is handled by the framework's UseHsts(); these
// are the headers ASP.NET Core doesn't set for you.
public sealed class SecurityHeadersMiddleware(RequestDelegate next)
{
    public Task InvokeAsync(HttpContext context)
    {
        context.Response.OnStarting(() =>
        {
            context.Response.Headers.XContentTypeOptions = "nosniff";
            context.Response.Headers.XFrameOptions = "DENY";
            context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
            context.Response.Headers.ContentSecurityPolicy = "default-src 'self'; frame-ancestors 'none'";
            return Task.CompletedTask;
        });

        return next(context);
    }
}
