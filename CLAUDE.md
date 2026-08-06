# BINOSOZ / БригадаCRM — Project Instructions

Construction management CRM. Monorepo: `backend/` (ASP.NET Core .NET 9, Clean
Architecture, CQRS/MediatR, EF Core + PostgreSQL) + `frontend/` (React 19 + Vite +
TypeScript + Tailwind v4 + TanStack Query) + `docs/` (MASTER.md — спецификация,
PROGRESS.md, BACKEND_INTEGRATION_MATRIX.md, INTEGRATION_PROGRESS.md).

## Roles — the only four the backend issues

**Owner, Prorab, Brigadir, Accountant** (`Domain/Enums/Role.cs`). Worker is a domain
entity, not a login (MASTER §4). No administrator/worker/storekeeper UI roles.

## Backend rules (from AGENTS.md / MASTER.md — still binding)

- Money is calculated only on the backend; clients display what the API returns.
- `CompanyId` isolation is an EF global filter; `BrigadeId` (Brigadir) and
  `ProrabObjectAssignment` (Prorab) filtering is manual in every handler. 404, not 403.
- Status transitions only through aggregate methods, `TaskLog` in the same transaction.
- `Result<T>` for expected failures; exceptions for the unexpected.
- Error envelope: `{ "error": { "code", "message", "traceId" } }`.
- Enums serialize as **numbers** on the wire (no JsonStringEnumConverter); exceptions:
  `AuthTokensDto.Role` and dashboard `StatusCountDto.Status` are strings.
- Migrations: author manually, applied automatically at startup (`MigrateAsync`).
- Build: `dotnet build backend/backend.slnx` · Test: `dotnet test backend/backend.slnx`.
- Never `git push/pull/fetch/merge/rebase` — human-only actions.

## Frontend rules

- Single axios instance `frontend/src/services/apiClient.ts`; base URL from
  `VITE_API_BASE_URL` (frontend/.env.local); Bearer access token; silent refresh with
  deduplicated concurrent refresh (refresh token is one-time-use with reuse detection).
- All data comes from the backend API. No mock data, no demo login, no localStorage
  CRUD — this was removed deliberately; do not reintroduce.
- Backend DTO ↔ frontend types live in `frontend/src/services/types.ts` — numeric enum
  maps mirror `Domain/Enums/*.cs`; keep in sync.
- TanStack Query for server state. Loading → skeletons, errors → normal error states
  (never fall back to fake data), 401 → refresh flow, session storage keeps only tokens.
- Api reference: `docs/API.md` and `frontend/Api.md`.

## Working agreements

- `docs/MASTER.md` is the spec. If code and MASTER.md disagree — flag it, don't silently
  pick a side. Business rules (rates, formulas, thresholds) are never invented.
- Integration status lives in `docs/BACKEND_INTEGRATION_MATRIX.md` and
  `docs/INTEGRATION_PROGRESS.md` — read both at session start, keep them updated.
- The historical claim in AGENTS.md that "there is no web frontend" is obsolete: the
  React app in `frontend/` is a first-class API consumer alongside the Telegram bot.
