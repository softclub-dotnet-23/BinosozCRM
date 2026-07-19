using Application.Common.Interfaces;

namespace Api.Auth;

// MASTER §11.2's real delivery channels (Telegram bot, or manual reset by
// an Owner who's reachable) both require the bot integration this project
// has deferred — see IPasswordResetDeliveryService's own comment. This is
// a stand-in, not a fake: it never puts the plaintext token in an HTTP
// response (that would defeat the whole point of a hashed, one-time
// token), and only logs the token itself in Development, where the log
// stream is a local console, not a production log aggregator that PII
// exclusion policies (§11.6, Program.cs's Serilog.Destructure rules) are
// built to keep clear of secrets.
public sealed class LoggingPasswordResetDeliveryService(
    ILogger<LoggingPasswordResetDeliveryService> logger,
    IHostEnvironment environment) : IPasswordResetDeliveryService
{
    public Task DeliverAsync(Guid userId, string phone, string plainToken, bool hasTelegramLink, CancellationToken cancellationToken)
    {
        if (environment.IsDevelopment())
        {
            logger.LogInformation(
                "[DEV ONLY] Password reset token for user {UserId} ({Phone}): {Token} — real delivery ({Channel}) is not wired up yet.",
                userId, phone, plainToken, hasTelegramLink ? "Telegram" : "manual Owner reset");
        }
        else
        {
            logger.LogWarning(
                "Password reset requested for user {UserId} but no delivery channel is wired up yet (expected: {Channel}). The token cannot reach the user until the Telegram bot integration lands.",
                userId, hasTelegramLink ? "Telegram" : "manual Owner reset");
        }

        return Task.CompletedTask;
    }
}
