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
public sealed class LoginRateLimitKeyMiddleware(RequestDelegate next)
{
    public const string PhoneItemKey = "RateLimitPhone";

    public async Task InvokeAsync(HttpContext context)
    {
        if (HttpMethods.IsPost(context.Request.Method) &&
            context.Request.Path.Equals("/api/v1/auth/login", StringComparison.OrdinalIgnoreCase))
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
