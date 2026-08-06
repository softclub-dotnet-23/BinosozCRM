# Phase 1 — Объекты и бригады — ✅ COMPLETE (2026-07-18)

**Goal:** без объекта и бригады нечего назначать. All 7 steps done — Zone A
(Ahmad): Steps 1, 4, 5, 6; Zone B (Shahrom): Steps 2, 3; joint: Step 7.

## What was built

- **`Customer`** (§5.5) — `GET,POST /customers`, Prorab+.
- **`ConstructionObject`** (§5.9) — `GET,POST /objects`, `GET,PUT /objects/{id}`,
  Prorab+, filtered by `ProrabObjectAssignment` (§1.2 default: no assignments
  = sees all; one assignment = strict allow-list).
- **`EstimateItem`** (§5.10) — `GET,POST /objects/{id}/estimate-items`, scoped
  under its parent object, same isolation as the object itself.
- **`ProrabObjectAssignment`** (§5.8) — `GET,POST /objects/{id}/prorabs`,
  Owner only. Shared `ProrabObjectAccess` helper (`Application/Objects/`)
  applied to every object-scoped handler rather than duplicating the
  assignment lookup — a missed copy there would have been exactly the
  "isolation gap" class of bug AGENTS.md calls 🔴.
- **`Worker`** (§5.7, Zone B) — 18+ on `HireDate` (hard `WORKER_UNDERAGE`),
  `ShiftStartTime`, nullable `UserId`, PII fields. `GET,POST
  /brigades/{id}/workers`, `PUT /workers/{id}/terminate`, Prorab+.
- **`Brigade`** (§5.6, Zone B) — `GET,POST /brigades`, `PUT
  /brigades/{id}/brigadir` (Owner only — see "Deviations" below).
- **`AdminAuditLog`** (§5.16/§11.7) — `AdminAuditSaveChangesInterceptor`
  (Scoped), watches `ChangeTracker` for `User.Role`, `User.IsActive`
  (→false), `Worker.PayRate`, `Brigade.BrigadirUserId`. An interceptor, not
  per-handler calls, so it audits the one real call site that exists today
  (`AssignBrigadirCommand`) and the other three automatically once their
  endpoints land in a later phase.
- **Role-based masking** (§11.6/§12) — `WorkerDto` nulls `PayRate`/
  `DocumentType`/`DocumentExpiryDate` for anyone but Owner/Accountant,
  including on a Prorab's own create-response. Serilog
  `Destructure.ByTransforming` wired for `Worker`/`WorkerDto` (separate
  concern from the DTO masking — logs are a different exposure surface).

## Key files

- `Application/{Customers,Objects,Workers,Brigades}/` — commands/queries.
- `Api/Controllers/{Customers,Objects,Workers,Brigades}Controller.cs`.
- `Infrastructure/Persistence/Interceptors/AdminAuditSaveChangesInterceptor.cs`.
- `Domain/Entities/ConstructionObject.cs` — gained `Update()` (see below).
- `Application/Workers/WorkerDto.cs` — role-aware masking.
- `Tests/Api.IntegrationTests/{WorkerAgeGuardTests,ProrabObjectAssignmentIsolationTests}.cs`.

## Migrations

None this phase — all Phase 1 entities (`Customer`, `ConstructionObject`,
`EstimateItem`, `ProrabObjectAssignment`, `Brigade`, `Worker`,
`AdminAuditLog`) already existed in the schema from Phase 0's
`InitialCreate`/`AddForeignKeyConstraints` migrations (Steps 10/12). This
phase was Application/API/interceptor work on top of an already-complete
schema — no `Infrastructure/Migrations/` changes.

## Architecture decisions and deviations from MASTER.md

1. **`PUT /brigades/{id}/brigadir` — Owner only, resolved contradiction.**
   §9.4's endpoint table says Owner; §13's Phase 1 DoD line says Prorab does
   it; §12's role matrix gives Prorab general Brigade `CRU` with no stated
   carve-out. Decided **Owner only**, per §9.4 literally. User decision, not
   picked silently. **Still open in MASTER.md itself** — worth squaring away.
2. **`ConstructionObject.Update()` added to Domain.** §9.4 lists `GET,PUT
   /objects/{id}` and §12 gives full `CRU`, but Domain only had
   `ChangeStatus`/`Complete` — no way to update `Name`/`Address`/dates/`Budget`.
   Added for this step's own deliverable, not scope creep. `Status`
   transitions stay on the existing aggregate methods (Rule 3).
3. **`Customer.Update()`/`EstimateItem.Update()` exist in Domain, unused.**
   §9.4 has no `PUT` endpoint for either despite §12 calling both "CRU" for
   Owner/Prorab. Implemented exactly what §9.4 lists; **flagged, not
   invented** — may be a real gap in §9.4, not a deliberate omission.
4. **`PRORAB_NOT_ASSIGNED_TO_OBJECT` vs `OBJECT_NOT_FOUND`.** Self-corrected
   mid-phase: isolation-guard failures use the dedicated §9.2 code
   (`PRORAB_NOT_ASSIGNED_TO_OBJECT`, existed since Step 10, unused until
   Step 4), not `OBJECT_NOT_FOUND` — that stays for genuinely missing/wrong-
   company rows. Both 404; the closed-model rule is about not distinguishing
   403 vs. 404, not about hiding which 404 sub-reason applies.
5. **`AdminAuditLog` via interceptor, not per-handler calls.** Deliberate:
   only one of the four tracked changes (`BrigadirAssigned`) has an existing
   endpoint; an interceptor audits it today and the other three
   automatically once their endpoints exist, without relying on future
   handlers remembering to log.
6. **§11.6's document-number mask doesn't map to any real field.** §11.6
   describes a `****4567`-style partial mask on a document *number*;
   `Worker` only has `DocumentType` (category string) and
   `DocumentExpiryDate` — no number field exists. Implemented hide-entirely
   for Prorab instead of inventing a new PII field. **Still open in
   MASTER.md** — either drop the `****4567` framing or add the field it
   presupposes.
7. **`CreateConstructionObjectCommand` not gated by `ProrabObjectAssignment`.**
   §1.2 governs visibility of existing objects ("видит"), not creation of
   new ones; §12's role matrix gives Prorab a plain "C" with no
   "назначенные" qualifier (unlike the "R").
8. **No role check on assigned users.** `AssignBrigadirCommand` and
   `AssignProrabCommand` don't verify the target user actually has
   `Role == Brigadir`/`Prorab` — not a stated MASTER invariant, consistent
   with `Worker.UserId` (Step 2) not being checked either.

## Known issues / gaps deferred

- MASTER.md itself still needs updating for deviations #1 and #6 above —
  the code has made a defensible call, but the spec document hasn't been
  reconciled yet.
- `Customer`/`EstimateItem` `Update()` methods remain unwired to any
  endpoint (deviation #3) — pick up if/when §9.4 gains those routes.
- `Worker.Create()` still throws `ArgumentException` for the 18+ guard
  instead of returning `Result<Worker>` (flagged by Shahrom in Step 2,
  not fixed this phase — Domain is Ahmad's file, noted for a future pass).
- Postgres credentials on this dev machine remain unresolved (parked
  mid-Phase-1) — every Postgres-backed test in this phase is
  compile-verified only locally; Docker is also unavailable here. CI
  (`ubuntu-latest`, Docker preinstalled) is the first real execution of all
  22 tests in `Tests/Api.IntegrationTests`.

## Test coverage

`Tests/Api.IntegrationTests`: 22 tests total (15 from Phase 0 + 7 new this
phase). 5 pass locally without Docker (`ForcePasswordChangeMiddlewareTests`
— pure unit, no DB). 17 need Docker/Postgres, verified only via throwaway
EF InMemory checks run and deleted during each step (no permanent trace) —
untested for real until CI or a working local Postgres. New permanent
files this phase: `WorkerAgeGuardTests.cs` (3), `ProrabObjectAssignmentIsolationTests.cs` (4).

## Preview: Phase 2 — Наряды и задачи (ядро)

`WorkOrder` + state machine + `Code` (`BR-{N}` per company) + `xmin`,
`IndividualTask` + its own state machine, `TaskLog` written in the same
transaction as every status change (Rule 3 — no exceptions, unlike this
phase's `AdminAuditLog` interceptor), `WorkOrderProgress` with photo upload,
a SignalR hub for real-time status events, and Telegram bot v1 (currently
**deferred** per the user's 2026-07-18 decision — see MASTER §15 open
questions). This is the phase everything else depends on: no orders, no
work to track, no payroll to calculate later.
