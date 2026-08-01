# Defense backend runbook

## Local PostgreSQL

Check Docker first:

```powershell
docker version
docker ps
```

Only when port `5432` is free and no equivalent container is running, start the
local development database:

```powershell
docker run --name binosoz-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=brigadacrm_dev -p 5432:5432 -d postgres:16
```

Set `ConnectionStrings__Default` (or `ConnectionStrings:Default` in local
development settings) to the PostgreSQL connection string. The documented
local-only example is `Host=localhost;Port=5432;Database=brigadacrm_dev;Username=postgres;Password=postgres`.
Never use this password outside local development.

## Migrations and API

The API applies migrations on startup. For an explicit local migration check:

```powershell
dotnet ef database update -p backend/Infrastructure -s backend/Api
dotnet run --project backend/Api
```

Swagger is available in Development at `https://localhost:<port>/swagger`.
Set `Jwt__SecretKey` to a development-only value of at least 32 bytes before
starting the API.

## Verification

```powershell
dotnet build backend/backend.slnx --configuration Release --no-restore
dotnet test backend/backend.slnx --configuration Release --no-build
```

The test suite uses isolated Testcontainers PostgreSQL databases; it does not
apply migrations to the normal developer database.

## Demo roles and critical routes

- Owner: company administration, user password reset, workers/objects lookups,
  payroll approval/payment, reports.
- Prorab: assigned-object operational access and scoped lookups/reports.
- Brigadir: own-brigade operational access and scoped lookups.
- Accountant: payroll creation and adjustment.

Critical routes include `/api/v1/auth/login`, `/api/v1/lookups/workers`,
`/api/v1/lookups/objects`, `/api/v1/payroll`, `/api/v1/users/{userId}/reset-password`,
and `/api/v1/reports/actual-cost`.
