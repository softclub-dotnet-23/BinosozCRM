namespace Application.Common.Interfaces;

// MASTER §11.2: delivery priority is (1) Telegram, if TelegramLink exists
// — "бесплатно, без внешнего провайдера" — then (2) manual reset through
// Owner. Channel (1) needs the Telegram bot, which is deferred with every
// other [BOT] step in this project; this interface exists so the token
// side of the flow (generation, hashing, TTL, one-time use) is fully real
// right now, with delivery itself swappable once the bot lands — not
// blocked on it, not faked to look like it works when it doesn't.
public interface IPasswordResetDeliveryService
{
    // A delivery implementation must explicitly declare that it can put a
    // secret into the user's hands. Returning success from an unavailable
    // channel must never cause a usable token to be persisted.
    bool CanDeliver { get; }
    Task DeliverAsync(Guid userId, string phone, string plainToken, bool hasTelegramLink, CancellationToken cancellationToken);
}
