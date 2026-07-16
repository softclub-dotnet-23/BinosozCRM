---
name: bot
description: Scaffold a Telegram bot flow per MASTER.md §10.
disable-model-invocation: true
argument-hint: "[flow]"
---

New skill — the old doc set had no bot command at all. The bot is the Brigadir's entire
interface, not a notification add-on, so it needs its own procedure.

1. Read `docs/MASTER.md` §10.4 (the flow, step by step — it specifies the exact
   sequence of messages and buttons) and §10.5 (what the bot must NOT do).
2. Check §12 for what this role may see. The bot never shows another worker's `PayRate`.

Build:
- Reply keyboard, not typed commands — the brigadir shouldn't memorize syntax
- Call the MediatR handler **directly**. Never an HTTP client to our own API, never a
  second copy of a business rule
- `Result.Failure` → human-readable message, not a raw error code

Non-negotiable (§10.3):
- **Idempotency**: `INSERT` into `TelegramUpdateLog` with the unique index, catch the
  violation. NOT `SELECT ... IF NOT EXISTS THEN INSERT` — that races on parallel
  delivery. The database is the only arbiter.
- **`secret_token`** verified on every update, `FixedTimeEquals` not `==`.
- **Always return 200**, even on internal error. A 500 makes Telegram retry forever.
- Photo confirmed to the user only **after** the backend saved it — not optimistically.
  Failed → say so plainly, don't go silent.
- No money computed in the bot. `LateMinutes`, deductions, totals — all from the API.

Flow: $ARGUMENTS
