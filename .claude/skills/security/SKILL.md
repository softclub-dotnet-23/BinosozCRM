---
name: security
description: Security-focused review against MASTER.md §11. Read-only.
disable-model-invocation: true
argument-hint: "[path]"
---

Read MASTER.md §11 before reviewing. Review $ARGUMENTS (blank = current diff).

## Tokens (§11.1)
- Access JWT TTL ≤15 min; secret ≥32 bytes from env, never committed
- Refresh: separate table, HASHED at rest, not a JWT
- Rotation on every refresh; old one revoked
- Reuse of a used refresh → `AUTH_REFRESH_TOKEN_REUSED` + revoke the ENTIRE chain
- `User.IsActive` checked per request, not just at login

## Password reset (§11.2)
- `/forgot-password` always 200 regardless of whether the phone exists
- Reset token: crypto-random, hashed, TTL 1h, single-use
- On reset: revoke ALL refresh tokens
- Rate limit 3/hour per phone (SMS-bombing channel otherwise)

## Transport (§11.3)
- HTTPS, HSTS, CSP, `nosniff`, `X-Frame-Options: DENY`
- CORS allow-list, never `AllowAnyOrigin` with credentials

## Rate limiting (§11.4)
- `/auth/login` 5/15min per IP+phone — without it passwords are brute-forceable
- `/auth/forgot-password` 3/hour
- Webhook has its own limit

## Authorization / IDOR (§11.5)
- `CompanyId` filter present (automatic)
- `BrigadeId` filter present in EVERY Brigadir-facing handler (manual — this is where
  the bug will be)
- `ProrabObjectAssignment` checked for Prorab handlers
- 404 not 403

## PII (§11.6)
- `BirthDate`/`Document*`/`Phone` never logged — explicit Serilog destructuring policy
- Document masked for Prorab (`****4567`), full only Owner/Accountant, invisible to Brigadir
- Masking in the Response DTO, not the client

## Telegram (§10.3)
- `secret_token` verified, `FixedTimeEquals`
- Idempotency via unique-index INSERT
- Always 200

## Audit (§11.7)
- Failed logins in their own log category
- `AdminAuditLog` on role change, deactivation, `PayRate` change, advance issued, payroll paid

## Storage (§11.9)
- Argon2id or PBKDF2 ≥210k
- Postgres `SSL Mode=Require` off-localhost; non-superuser DB account
- Uploads: signed URL, size limit, MIME allow-list, stored outside web root

## Dependencies (§11.8)
- `dotnet list package --vulnerable` clean

Only real, specific findings with file + line and the exact fix. Nothing wrong →
say so plainly.
