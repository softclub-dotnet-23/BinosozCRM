# Final acceptance report

## Final result

Acceptance completed on 2026-08-02. The real Development stack was used throughout; Playwright did not intercept, stub, or mock HTTP traffic.

## Verified environment

| Component | Verified value |
|---|---|
| PostgreSQL container | `binosoz-postgres-dev` |
| PostgreSQL endpoint | `127.0.0.1:5433` |
| Database / user | `brigadacrm_dev` / `postgres` |
| API | `http://127.0.0.1:5080` (`Development`) |
| Frontend | `http://localhost:5178` |

`docker exec binosoz-postgres-dev pg_isready -U postgres -d brigadacrm_dev` reported `accepting connections`; the database exists. The legacy `binosoz-postgres` container on port 5432 was not changed.

## Demo accounts

All direct `POST /api/v1/auth/login` checks returned HTTP 200 before the E2E run.

| Role | Phone | Password |
|---|---|---|
| Owner | `+992900000001` | `Demo12345!` |
| Prorab | `+992900000002` | `Demo12345!` |
| Brigadir | `+992900000003` | `Demo12345!` |
| Accountant | `+992900000004` | `Demo12345!` |

## Root cause and remediation

The development database already contained brigades from an older seed. `DemoSeedDataService` treated the presence of any brigade as proof that all demo data was current and returned before reconciling the documented web accounts. That left stale roles/password hashes and could leave accounts absent or forced to change password.

The seed now reconciles the four documented accounts on an existing dataset: it creates missing accounts, restores the expected role, active state and `Demo12345!` password, and re-establishes the Brigadir-to-brigade/worker relation. `Existing_demo_dataset_reconciles_documented_web_accounts` is the regression test for this condition.

Additional real-E2E fixes:

- the invalid-login scenario uses a dedicated nonexistent number, so it cannot exhaust Owner's intentional 5-per-15-minute login budget;
- the mobile Sidebar is an overflow-constrained flex drawer, so lower navigation items remain reachable;
- desktop and mobile navigation locators wait for the real drawer state rather than relying on hidden duplicate markup.

## Final verification

| Check | Result |
|---|---|
| `dotnet restore backend/backend.slnx` | passed |
| `dotnet build backend/backend.slnx -c Release` | passed, zero warnings |
| `dotnet test backend/backend.slnx -c Release --no-build` | **212 passed, 0 failed, 0 skipped** |
| `npm ci` | passed |
| `npm run lint` | passed |
| `npx tsc -b` | passed |
| `npm run build` | passed |
| `npx playwright test` | **10 passed, 0 failed, 0 skipped** (18.0 s) |

The Playwright run covered invalid password, Owner, Prorab, Brigadir and Accountant in both Chromium desktop (1440×1000) and Chromium mobile (390×844).

## Reproducible acceptance commands

```powershell
docker start binosoz-postgres-dev
docker exec binosoz-postgres-dev pg_isready -U postgres -d brigadacrm_dev
```

Start the API from Git Bash:

```bash
export ASPNETCORE_ENVIRONMENT='Development'
export ConnectionStrings__Default='Host=127.0.0.1;Port=5433;Database=brigadacrm_dev;Username=postgres;Password=js0770'
export Jwt__SecretKey='binosoz-local-jwt-secret-key-2026-demo'
export FileStorage__SignedUrlSecret='binosoz-local-file-secret-key-2026-demo'
export Cors__AllowedOrigins__0='http://localhost:5178'
export Seed__DemoDataEnabled='true'
dotnet run --project backend/Api -- --urls http://127.0.0.1:5080
```

In another terminal:

```powershell
cd frontend
npm ci
npm run lint
npx tsc -b
npm run build
npx playwright test
```

## Remaining limitations

- Telegram bot delivery remains intentionally deferred by the product roadmap; web access does not depend on Telegram.
- `npm ci` reports two high-severity transitive dependency advisories. No `npm audit fix --force` was applied because it can introduce unreviewed breaking upgrades; address them in a dedicated dependency-upgrade task.
