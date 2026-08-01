# Demo runbook

## Development database

Use only the dedicated development container; do not modify the legacy `binosoz-postgres` container on port 5432.

```powershell
docker start binosoz-postgres-dev
docker exec binosoz-postgres-dev pg_isready -U postgres -d brigadacrm_dev
```

The verified endpoint is:

- Host: `127.0.0.1`
- Port: `5433`
- Database: `brigadacrm_dev`
- Username: `postgres`

## Start API

Run from Git Bash at the repository root:

```bash
export ASPNETCORE_ENVIRONMENT='Development'
export ConnectionStrings__Default='Host=127.0.0.1;Port=5433;Database=brigadacrm_dev;Username=postgres;Password=js0770'
export Jwt__SecretKey='binosoz-local-jwt-secret-key-2026-demo'
export FileStorage__SignedUrlSecret='binosoz-local-file-secret-key-2026-demo'
export Cors__AllowedOrigins__0='http://localhost:5178'
export Seed__DemoDataEnabled='true'
dotnet run --project backend/Api -- --urls http://127.0.0.1:5080
```

Wait for `GET http://127.0.0.1:5080/health` to return 200. Startup applies migrations and reconciles the Development demo dataset before serving requests.

## Start frontend

In another terminal:

```powershell
cd frontend
npm ci
npm run dev -- --host localhost --port 5178
```

Open `http://localhost:5178`. The frontend's development API target is `http://127.0.0.1:5080`.

## Demo accounts

| Role | Phone | Password |
|---|---|---|
| Owner | `+992900000001` | `Demo12345!` |
| Prorab | `+992900000002` | `Demo12345!` |
| Brigadir | `+992900000003` | `Demo12345!` |
| Accountant | `+992900000004` | `Demo12345!` |

These are Development-only credentials. No Telegram token, webhook, bot process, or production secret is needed.

## Acceptance verification

With PostgreSQL and the API running:

```powershell
cd frontend
npx playwright test
```

Final verified result: **10 passed, 0 failed, 0 skipped** — invalid password plus all four roles in desktop and mobile Chromium.

For the complete validation sequence:

```powershell
dotnet restore backend/backend.slnx
dotnet build backend/backend.slnx -c Release
dotnet test backend/backend.slnx -c Release --no-build
cd frontend
npm ci
npm run lint
npx tsc -b
npm run build
npx playwright test
```

## Troubleshooting

If a documented account fails, do not change its credentials or delete the database by default. First confirm the API uses port 5433, `ASPNETCORE_ENVIRONMENT=Development`, `Seed__DemoDataEnabled=true`, and the connection string above. The Development seed reconciles existing stale demo accounts on each API startup.
