# Demo runbook

1. Start PostgreSQL 16 locally (the Development connection string is in `backend/Api/appsettings.Development.json`).
2. Set `ASPNETCORE_ENVIRONMENT=Development` and a development JWT secret.
3. Run `dotnet run --project backend/Api`.
4. Run `npm ci` then `npm run dev` in `frontend/`.
5. Open the Vite URL (normally `http://localhost:5173`).

Use accounts listed in [DEMO_ACCOUNTS.md](DEMO_ACCOUNTS.md). No Telegram token, account, webhook, or bot process is required.

If login fails, delete only the local development database and restart so the idempotent Development seed can rebuild it. Do not use this procedure in production.