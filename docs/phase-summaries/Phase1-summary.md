# Phase 1 — Объекты и бригады — summary

**Completed:** 2026-07-18
**Goal (PROGRESS.md):** без объекта и бригады нечего назначать.

## What was built

Zone A (Ahmad) and Zone B (Shahrom) worked in parallel per
`docs/TEAM_SPLIT_Backend_2people.md` — Domain entities for all of Phase 1
already existed from Phase 0's upfront Domain block (§2.0), so both zones
went straight to Application/Api.

**Zone A:**
- `Customer`, `ConstructionObject`, `EstimateItem` — CRUD + list, Prorab+ gated.
- `ProrabObjectAssignment` — assignment endpoint + `ProrabObjectAccess` helper
  (MASTER §1.2's central isolation rule: zero assignments = sees all objects,
  one or more = strict allow-list), wired into every `ConstructionObject`
  read/write handler.
- `AdminAuditLog` — `AdminAuditSaveChangesInterceptor` watches `ChangeTracker`
  on every `SaveChanges` for role changes, deactivation, `PayRate` changes,
  and brigadir assignment; writes the audit row automatically rather than
  each handler doing it by hand.
- FK constraints migration (`AddForeignKeyConstraints`) — closed a gap
  flagged at the end of Phase 0 Step 10 (zero `AddForeignKey` calls across
  all 26 entities); real referential integrity now exists at the DB level
  for the entities this phase touches.

**Zone B:**
- `Worker` — creation/list/terminate under a brigade, 18+ guard checked
  against `HireDate` not "today" (MASTER §8.3), `ShiftStartTime`, PII fields
  present on the entity.
- `Brigade` — creation/list, brigadir assignment (`PUT /brigades/{id}/brigadir`,
  **Owner-only** — see deviation below).
- Role-based response shaping for `Worker` — `WorkerResponse` (Owner/Accountant,
  full) vs `WorkerProrabResponse` (Prorab, no `PayRate`/`PayRateType`).

**Joint (Step 7):**
- `CreateWorkerCommandHandlerTests` — three `HireDate` boundary cases: exactly
  18 (allowed), one day short (rejected), and the case that actually matters
  per §8.3 — 19 years old *today* but 17 on a *backdated* `HireDate`
  (rejected; confirms the check runs against `HireDate`, not the clock).
- `ProrabObjectIsolationTests` — zero-assignment default, strict allow-list
  once assigned, 404-not-403 on an unassigned object, Owner bypass.

## Key files

- `backend/Application/{Objects,Customers,Workers,Brigades}/` — all Phase 1
  Application-layer code.
- `backend/Api/Controllers/{ObjectsController,CustomersController,WorkersController,BrigadesController}.cs`
- `backend/Api/Contracts/{Workers,Brigades}/` — request DTOs + the two
  role-shaped Worker response DTOs.
- `backend/Infrastructure/Persistence/Interceptors/AdminAuditSaveChangesInterceptor.cs`
- `backend/Tests/Api.IntegrationTests/{CreateWorkerCommandHandlerTests,ProrabObjectIsolationTests,ForeignKeyConstraintTests}.cs`

## Migrations

- `20260718065441_InitialCreate` (Phase 0 Step 10) — base schema, no FKs.
- `20260718091028_AddForeignKeyConstraints` (this phase) — real
  `AddForeignKey` calls for the relationships this phase's writes actually
  exercise (`Worker.BrigadeId`/`UserId`, `ConstructionObject.CustomerId`,
  `ProrabObjectAssignment.ProrabUserId`/`ObjectId`, etc.). Not necessarily
  exhaustive over all ~73 relationships across all 26 entities —
  `ForeignKeyConstraintTests` documents itself as "representative checks",
  not full coverage; the rest arrive as later phases start writing those
  entities for real.

## Architecture decisions / deviations from MASTER.md

1. **`PUT /brigades/{id}/brigadir` restricted to Owner, not Prorab+.**
   MASTER.md contradicts itself on this: §9.4's endpoint table says Owner
   only; §13's Phase 1 DoD prose explicitly says "прораб... назначает
   бригадира"; §12's role matrix gives Prorab general `CRU` on `Brigade`
   with no stated carve-out. Resolved by explicit user decision (not picked
   silently) in favor of §9.4's literal endpoint table. **MASTER.md itself
   still has the contradiction and should be reconciled** — flagged, not
   fixed, since editing the spec is a bigger call than this phase's scope.
2. **`Worker.Document*` is not masked for Prorab.** §11.6 describes masking
   a document *number* ("`****4567`"), but `Worker` only has `DocumentType`
   (a category string) and `DocumentExpiryDate` — no number field was ever
   added to the schema. By explicit user decision, treated as: nothing left
   to mask, so Prorab sees both fields unmasked. The only real per-role
   split Step 6 ended up implementing is hiding `PayRate`/`PayRateType`
   from Prorab.
3. **`Worker.Create()` throws `ArgumentException` instead of returning
   `Result<Worker>`** for the 18+ guard — the only Domain factory that does
   this; every other guarded transition (`WorkOrder`, `IndividualTask`,
   `MaterialRequest`) returns `Result`. Stopgapped at the Application
   boundary (`CreateWorkerCommandHandler` catches the specific
   `ArgumentException` and maps it to `WORKER_UNDERAGE`) rather than edited,
   since Domain is Ahmad's exclusive file per the team-split's hard
   boundary — flagged for him to align later, not silently left inconsistent.
4. **Accountant has no Worker-reading endpoint yet.** §12's role matrix
   gives Accountant `R (с PayRate)` on `Worker` and full `Document*`, but
   §9.4 never lists a route for it — only `Prorab+` on
   `GET /brigades/{id}/workers`. Left unbuilt; presumably arrives via
   Payroll endpoints in Phase 5, not invented here.

## Known issues / deferred

- FK constraints are representative, not exhaustive (see Migrations above) —
  entities not yet written to for real (most of Phase 2 onward) don't have
  their relationships proven under load yet.
- Brigadir has no endpoint to read own-brigade workers (§12 says `R (own
  brigade)`, but §9.4 doesn't list a route) — not built, not needed by
  anything yet.
- Zero-warnings, zero-FK gap from Phase 0 Step 10 is now closed for this
  phase's entities specifically, not globally re-verified across all 26.

## Test coverage

23/23 passing, confirmed against real Testcontainers/Postgres (not just
compiled) once Docker became available on the dev machine mid-phase:
- Phase 0's 15 (Login/Refresh/Seed/ForcePasswordChange/ForeignKeyConstraint).
- 3 new: `Worker` 18+ boundary cases.
- 5 new: Prorab object-isolation cases.

`.github/workflows/backend-ci.yml` runs the identical full-suite `dotnet
test` (not a filtered subset) on every push/PR to `master`, on
`ubuntu-latest` (Docker preinstalled) — confirmed to actually execute the
Testcontainers tests, not just build.

## Next: Phase 2 — Наряды и задачи (ядро)

The core of the whole system: `WorkOrder` + its state machine (`New →
Assigned → InProgress → OnReview → Accepted/Rejected → Closed`), `Code`
generation (`BR-{N}` per company), `IndividualTask`, `TaskLog` written in
the same transaction as every status transition (Rule 3), `WorkOrderProgress`
with photo upload, and a SignalR hub for real-time status events. This is
also where the Telegram bot enters — v1 covers linking (`TelegramLinkCode`,
TTL+hash), webhook `secret_token` + idempotency via `TelegramUpdateLog`, and
the bot's "Мои наряды"/"Моя бригада" flows, which call directly into Zone
A's `WorkOrder` MediatR commands (the one deliberate cross-zone coupling
point, per team-split §4). The bot work is currently deferred per the open
questions in PROGRESS.md — backend steps proceed without it until that's
revisited.
