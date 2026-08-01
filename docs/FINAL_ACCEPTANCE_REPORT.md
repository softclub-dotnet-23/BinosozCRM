# Final acceptance report

## Test environment

- Playwright `@playwright/test` 1.62.1 and Chromium are installed in `frontend/`.
- The suite has five real UI scenarios (invalid login plus Owner, Prorab, Brigadir and Accountant). It does not intercept or mock API calls.
- Vite is controlled by Playwright on `http://127.0.0.1:5173`; the app targets the real API on port 5080.

## Completed checks

- `npx tsc -b` — passed.
- `npm run lint` — passed.
- Playwright configuration, reporters, trace/screenshot/video failure diagnostics and artifact ignores are in place.

## Blocking infrastructure finding

A real acceptance run could not be completed: an already running API at `http://localhost:5000` returns `AUTH_INVALID_CREDENTIALS` for all documented demo accounts, while an isolated Development API listener on port 5080 never reaches `/health` because its PostgreSQL connection does not complete. This is an environment/data-state defect, not an E2E assertion failure. The blocked API process was stopped; no test was weakened, skipped, or made to mock the network.

## Required recovery command

Start PostgreSQL with a usable Development database, then run the API with `ASPNETCORE_ENVIRONMENT=Development`, `Jwt__SecretKey` and `--urls http://127.0.0.1:5080`. Verify `GET /health` and login as `+992900000001 / Demo12345!` before executing:

```powershell
cd frontend
npx playwright test
```

When the API is healthy and seeded, this suite provides desktop and mobile Chromium coverage for the four role flows.