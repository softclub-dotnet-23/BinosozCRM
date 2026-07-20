using System.Text.Json;

namespace Api.RateLimiting;

// MASTER §11.4 partitions /auth/login by IP+phone, not IP alone — otherwise
// one attacker hammering many phone numbers from one IP only burns one
// shared budget, and a distributed brute-force of a single phone number
// across many IPs isn't caught at all. The rate limiter's partition resolver
// is synchronous and runs after routing, so the phone has to be extracted
// and stashed in HttpContext.Items here, from a buffered body read, before
// UseRateLimiter() sees the request — then reset the stream position so
// model binding downstream still works normally.
//
// §11.2's "3 запроса/час на телефон" for /auth/forgot-password needs the
// exact same phone-extraction trick, so this middleware handles both
// routes rather than duplicating the buffered-body-read dance in a
// second middleware.
public sealed class LoginRateLimitKeyMiddleware(RequestDelegate next)
{
    public const string PhoneItemKey = "RateLimitPhone";

    private static readonly string[] PhonePartitionedPaths =
    [
        "/api/v1/auth/login",
        "/api/v1/auth/forgot-password"
    ];

    public async Task InvokeAsync(HttpContext context)
    {
        if (HttpMethods.IsPost(context.Request.Method) &&
            PhonePartitionedPaths.Any(path => context.Request.Path.Equals(path, StringComparison.OrdinalIgnoreCase)))
        {
            context.Request.EnableBuffering();

            try
            {
                using var document = await JsonDocument.ParseAsync(context.Request.Body, default, context.RequestAborted);
                if (document.RootElement.TryGetProperty("phone", out var phoneElement) && phoneElement.ValueKind == JsonValueKind.String)
                    context.Items[PhoneItemKey] = phoneElement.GetString();
            }
            catch (JsonException)
            {
                // Malformed body — fall through with no phone in Items; the
                // partition resolver falls back to IP-only, which is still safe.
            }
            finally
            {
                context.Request.Body.Position = 0;
            }
        }

        await next(context);
    }
}
