# Final backend integration report

## Delivered

- Web role matrix: Owner and Prorab operate production modules; Accountant has read-only operational/financial access plus Payroll; Brigadir is restricted to their own brigade and work.
- Dashboard applies CompanyId filtering, Prorab object assignments and Brigadir own-brigade scope before aggregation.
- API has no runtime reference to `TelegramBot`, no Telegram-token options, and registers only API background services. Telegram entities remain optional persistence history.
- `GET /api/v1/brigades/mine` completes the Brigadir web identity flow; the page consumes it without a browser-supplied brigade id.
- Development seed creates the stable demonstration roles and complete data graph. It is enabled only by Development configuration and is idempotent.

## Role matrix

| Role | Web permissions |
|---|---|
| Owner | all company administration, operational data, payroll and settings |
| Prorab | scoped operational CRUD, work lifecycle approval and reports |
| Brigadir | own brigade, own work orders, progress, attendance and material reporting |
| Accountant | dashboard, read-only operational data, payroll and reports; no operational mutations |

## Verification

- `dotnet build backend/backend.slnx -c Release --no-restore` — passed, zero warnings.
- `dotnet test backend/backend.slnx -c Release --no-build` — 211 passed.
- `npm run lint`, `npx tsc -b`, `npm run build` in `frontend/` — passed.

## Demo accounts

See [DEMO_ACCOUNTS.md](DEMO_ACCOUNTS.md). All use development-only `Demo12345!`.

## Remaining product-scope limitations

`Stock`, `Transfers`, `Budgets`, `Assignments`, and standalone `Estimates` UI routes predate the backend domain model and still contain mock/placeholder views. They are recorded in the gap audit and must be removed from production navigation or receive a separately-approved domain/API module; they must not be represented as completed server functionality.

## Commands

```powershell
dotnet restore backend/backend.slnx
dotnet build backend/backend.slnx -c Release
dotnet test backend/backend.slnx -c Release --no-build
cd frontend
npm run lint
npx tsc -b
npm run build
```

Set `ASPNETCORE_ENVIRONMENT=Development`, configure the local PostgreSQL connection in `backend/Api/appsettings.Development.json`, and run `dotnet run --project backend/Api`. No Telegram configuration is required.

## Local commits

- `104c5b6 fix(auth): align web role matrix and dashboard scope`
- `ce0e47b docs: add final integration audit and api matrix`
- `3333071 feat(api): expose brigadir own brigade for web`
- `52b5abe feat(seed): finalize development demo accounts and data`