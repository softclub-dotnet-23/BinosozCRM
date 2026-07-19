# PROGRESS — БригадаCRM

Каждый шаг ссылается на раздел `docs/MASTER.md` — читать нужно **только его**, не весь файл.
Теги: `[BE]` backend · `[BOT]` Telegram · `[FULL]` несколько сразу (backend + Telegram).

## Current Status
**Phase 1 — Объекты и бригады: ✅ COMPLETE (2026-07-18)** — see
`docs/phase-summaries/Phase1-summary.md`.
**Phase 2 — Наряды и задачи (ядро): functionally ✅ COMPLETE for now
(backend).** All `[BE]` steps done (1–5, 9's backend half); Steps 6–8
`[BOT]` and Step 9's bot-idempotency slice stay unchecked, blocked on the
2026-07-18 bot deferral — moved on to Phase 3 backend steps per the user's
2026-07-19 decision, not a phase-summary-worthy completion (no
`Phase2-summary.md` written; the phase isn't actually finished, just
unblocked from further backend work until the bot returns).
**Phase 3 — Явка, отсутствия, премии: functionally ✅ COMPLETE for now
(backend).** Steps 1/2/7 done; Step 3 partial (its "финальный расчёт"
clause blocked on Phase 5's `CalculatedAmount`/`PayrollAdvance`, same as
noted below); Steps 4–6 `[BOT]` unchecked, blocked on the 2026-07-18 bot
deferral. No `Phase3-summary.md` — not actually finished, same
"functionally complete for now" status as Phase 2.
**Phase:** 4 — Материалы
**Last completed:** Phase 3, Step 7
**Next step:** Phase 4, Step 1 [BE] — `MaterialConsumptionReport`
(уникальность на день → update, не дубль) → MASTER §5.18, §8.2
**Build:** clean, 0 warnings (`dotnet build backend.slnx`)
**Tests:** `Tests/Api.IntegrationTests` — 99 tests, confirmed via `dotnet test` (69 pass locally, 30 need Docker — see below)
**Updated:** 2026-07-19

**Phase 3, Step 7 [BE] — тесты: `LateMinutes` numeric examples, grace
period, absence-instead-of-no-show.** Two new permanent test files:

- `TimesheetLateMinutesTests.cs` (pure domain, no DB — 11 tests):
  `Timesheet.CheckIn` exercised directly with deterministic timestamps
  against §8.1's exact worked example set (15/0/40/10 minutes late), both
  grace=0 and grace=5 configurations, plus edge cases the worked examples
  don't cover: arriving within the grace period clamps to 0 rather than
  going negative (`max(0, lateMinutes) - grace` needs the *second*
  `Math.Max(0, ...)` the formula implies), arriving early is 0 not
  negative, and `LateMinutes` stays `null` (not `0`) when
  `Worker.ShiftStartTime` isn't configured — same §8.1 rule Step 1's
  throwaway check first verified, now permanent.
- `AbsenceTimesheetConflictTests.cs` (real Postgres via `PostgresFixture`
  — 4 tests): permanentizes the two-way `TIMESHEET_ABSENCE_CONFLICT` guard
  built in Steps 1/2 — filing an absence over an existing check-in and
  checking in during a filed absence are both rejected; non-overlapping
  dates succeed on both sides; `IsPaid=true`/`IsPaid=false` absences are
  recorded distinctly (§8.9's "`IsPaid=false` → не входит никуда" needs
  that distinction to survive into Phase 5's payroll consumption).

**Σ`LateMinutes`/`LatenessDeductionAmount` aggregation across a pay
period is out of scope** — that needs a period-level query that doesn't
exist yet (Phase 5 Step 4). This step tests the per-check-in computation
§8.1 actually specifies, not the payroll rollup.

Build clean, 0 warnings. Suite: 99 total (was 84) — 69 pass locally (all
11 new domain tests included), 30 need Docker (26 pre-existing + 4 new
Postgres-backed); confirmed every failure is the expected
`DockerUnavailableException` fail-fast, not a real assertion failure.
**Phase 3 is now functionally complete for backend** — Steps 4–6 `[BOT]`
stay deferred, Step 3's "финальный расчёт" clause stays blocked on Phase
5, same as Phase 2's situation.

**Phase 3, Step 3 [BE] — `Worker.TerminationDate` lifecycle (partial).**
`TerminateWorkerCommand` already existed (Phase 1 Step 2) but was bare —
no guards, no lifecycle. §8.9 lists five things that happen on
termination; this step covers what's actually buildable right now:

1. **Open `IndividualTask` blocks termination** — new
   `WORKER_HAS_OPEN_TASKS` (400): `TerminateWorkerCommandHandler` now
   checks for any `IndividualTask` assigned to the worker with `Status !=
   Done` and refuses outright, per §8.9's "не удалять молча — там может
   быть незакрытая работа."
2. **`WorkOrderPayoutShare` rows stay untouched** — no code needed; that
   entity has no Application layer yet (Phase 5 Step 1), so there was
   nothing to accidentally touch in the first place.
5. **`IsActive = false` drops the worker from active lists, not history**
   — `Worker.Terminate()` already set `IsActive = false` (Phase 1);
   `ListBrigadeWorkersQuery` now filters to `IsActive = true` by default,
   with a new `IncludeInactive` opt-in (no separate audit/history endpoint
   exists to view terminated workers otherwise).

**Explicitly NOT built — items 3 and 4, genuinely blocked, not a scope
shortcut:** "текущий `PayrollEntry` формируется... досрочно" and
"непогашенные авансы попадают в этот финальный расчёт" both need §8.0's
`CalculatedAmount` formula and `PayrollAdvance` settlement — neither
exists anywhere in Application yet (`WorkOrderPayoutShare`,
`CalculatedAmount`, `PayrollAdvance`, `PayrollEntry.Approve()` are all
still-unbuilt Phase 5 Steps 1/3/6/7). Building them now would mean
implementing payroll calculation as a side effect of a Phase 3 step —
flagged here so Phase 5's termination tie-in isn't forgotten once
`CalculatedAmount` lands. **Checklist item stays unchecked** — this is
part of Step 3, not all of it.

Verified with 2 throwaway xUnit tests against a temporary EF InMemory
context (written, run — 2/2 passed — then deleted, same
`Microsoft.EntityFrameworkCore.InMemory`-added-then-reverted pattern as
every other throwaway check this session): an open task blocks
termination and the worker stays `IsActive`; termination succeeds once the
task is `Done`, and the worker disappears from the default active-worker
list while remaining visible via `IncludeInactive`. Docker still
unavailable — suite count unchanged (84 total, 58 pass, 26 need Docker).

**Phase 3, Step 2 [BE] — `AbsenceRecord`.** Domain entity + EF config
already existed; built the Application/API surface. New
`AbsencesController`: `GET,POST /absences` — Prorab+/Accountant only, per
§8.9's "создаёт прораб или бухгалтер (не бригадир — нужен
документ/решение)" — the only controller in this codebase with zero
Brigadir-reachable actions.

**Judgment call, documented in code — no separate `/absences/{id}/approve`
endpoint exists in §9.4's table**, unlike `WorkOrder`/`Timesheet`. Read
that as: the creator's decision *is* the approval, since only
Prorab+/Accountant can create an `AbsenceRecord` at all — `Approve()` is
called immediately inside `CreateAbsenceRecordCommandHandler` rather than
leaving `ApprovedByUserId` permanently `null` with no way to ever set it.

**The two-way conflict from §8.9** ("человек отмечен И в отпуске —
конфликт, 400: либо отметка ошибочна, либо отсутствие. Не угадывать."):
`TIMESHEET_ABSENCE_CONFLICT` (already in the error catalog from Step 1,
unused until now) fires from both directions —
`CreateAbsenceRecordCommandHandler` rejects filing an absence over a date
range that already has a real check-in, and `CheckInCommandHandler` (plus
`CreateTimesheetCommand`'s backdated-correction path, when it's actually
recording a check-in) rejects a check-in landing on a day already covered
by an `AbsenceRecord`. Neither guesses which side is wrong — both are
rejected outright, per the literal "не угадывать."

**`ListAbsenceRecordsQuery` is company-wide, not object-scoped** — another
judgment call: §9.4 lists `GET /absences` without an "(own)"/object
qualifier (unlike `WorkOrder`'s explicit "(own, read)"), and
`AbsenceRecord` has no `ObjectId` field to scope by in the first place —
the automatic `CompanyId` filter is the only isolation axis available.

Verified with 3 throwaway xUnit tests against a temporary EF InMemory
context (written, run — 3/3 passed — then deleted, including a temporary
`Microsoft.EntityFrameworkCore.InMemory` reference added and reverted from
`Directory.Packages.props`/the test csproj, no trace left): filing an
absence over an existing check-in is rejected; checking in during a filed
absence is rejected; non-overlapping dates succeed cleanly on both sides.
Docker still unavailable — suite count unchanged (84 total, 58 pass, 26
need Docker); numeric-example tests for lateness/absence interaction are
Step 7's job.

**Phase 3, Step 1 [BE] — `Timesheet` + `LateMinutes` computed at
check-in.** Domain entity + `TimesheetConfiguration` already existed
(Ahmad-owned Domain layer per the team split, same pattern as
`WorkOrder`/`IndividualTask` before Phase 2's Application layers landed) —
`Timesheet.CheckIn`/`CheckOut`/`Approve` already implemented §8.1's formula
exactly. This step built the Application/API surface: new
`TimesheetAccess` (mirrors `WorkOrderAccess`/`BrigadeAccess` — Brigadir
scoped to own `BrigadeId` via the timesheet's `Worker`, Prorab+ scoped by
`ProrabObjectAssignment` on `ObjectId`).

`POST /timesheets/check-in` (Brigadir — own brigade or self, §8.4's "за
всю бригаду и за себя"): finds or creates the `Timesheet` row for
`(WorkerId, Date)`, rejects a repeat with `TIMESHEET_ALREADY_CHECKED_IN`
if `CheckInAt` is already set. `POST /timesheets/{id}/check-out` and
`POST /timesheets/{id}/approve` (Prorab+) follow the same access pattern.
`GET /timesheets` — Prorab+ object-scoped / Brigadir own-brigade (joins
through `Worker.BrigadeId` since `Timesheet` has no `BrigadeId` field
itself).

**Judgment call, documented in code — `POST /timesheets`'s exact scope
wasn't literally specified.** §9.4 lists `POST /timesheets` without the
"(own, read)" qualifier used elsewhere, and §8.4 flatly states "только
бригадир отмечает" (only the Brigadir marks attendance). Read `POST
/timesheets` as the backdated-correction path — distinct from the live
`/check-in` flow — always `EnteredManually = true`, Brigadir-only (not
opened to Prorab+, since §8.4 doesn't carve out an exception for them).
Worth reconciling in a `docs` pass if this reading turns out wrong.

New `TIMESHEET_NOT_FOUND` (404) in `ErrorCodeCatalog` — same "real code,
not in §9.2's literal table" pattern as `WORK_ORDER_NOT_FOUND`.

Verified with 7 throwaway xUnit tests against a temporary EF InMemory
context (written, run — 7/7 passed — then deleted, including a temporary
`Microsoft.EntityFrameworkCore.InMemory` reference added and reverted from
`Directory.Packages.props`/the test csproj, no trace left): `LateMinutes`
matches **both** of §8.1's worked numeric examples exactly (grace=0 → 15
late minutes; grace=5 → 10); `LateMinutes` is `null`, not `0`, when
`Worker.ShiftStartTime` isn't configured; a second same-day check-in is
rejected; `CheckOut` computes `HoursWorked`; a Brigadir of a different
brigade cannot check in someone else's worker (`WORKER_NOT_FOUND`);
`Approve` sets `ApprovedByUserId`/`ApprovedAt` correctly. Docker still
unavailable — suite count unchanged (84 total, 58 pass, 26 need Docker);
no new permanent tests this step (`AbsenceRecord`'s `TIMESHEET_ABSENCE_CONFLICT`
and numeric-example tests are Step 2's and Step 7's jobs respectively).

**Phase 2, Step 9 [FULL] — тесты (backend half only).** MASTER §7.1/§7.2
call for "все переходы (разрешённые + запрещённые), изоляция бригады
(404)"; §10.3's bot-idempotency tests are out of reach until the bot
deferral is revisited. Built the two halves that are actually testable
today, 62 new tests total:

- `WorkOrderStateMachineTests.cs` / `IndividualTaskStateMachineTests.cs`
  (pure domain, no DB — 53 tests): every allowed edge of both state
  machines plus every disallowed edge from every reachable state via
  `[Theory]`, including `WorkOrder.Rework`/`Close` and
  `IndividualTask.ProposeBonus`/`ApproveBonus` — none of which have an API
  handler yet, but the entity guards exist and needed covering per §7.1/
  §7.2's literal "все переходы." Caught my own wrong assumption while
  writing these: `IndividualTask.CompletedEarly` is `DueAt is not null &&
  completedAt < DueAt.Value` — with no `DueAt` at all that's `false`, not
  `null` (nullable represents "not yet computed pre-`Done`," not
  "unknown"). Test was wrong, not the code; fixed the test.
- `WorkOrderIsolationTests.cs` / `IndividualTaskIsolationTests.cs` (real
  Postgres via `PostgresFixture`, mirrors Phase 1 Step 7's style — 9 tests):
  Prorab object-assignment isolation and Brigadir cross-brigade rejection
  (404, not 403) for the handlers Steps 1–3 actually built, plus `TaskLog`
  correctness — right `FromStatus`/`ToStatus` pairs, `Reject`'s reason
  landing in `Comment`, two log rows in the right order across
  Assign→Start.

Suite total: 84 (was 22) — 58 pass locally (Docker-free), 26 need Docker
(17 pre-existing + 9 new), confirmed every one of the 26 fails in ~1ms with
`DockerUnavailableException`, not a real assertion failure. **Checklist
item left unchecked** — this is half of Step 9, not all of it.

**Phase 2, Step 5 [BE] — SignalR-хаб, группы из claims, события после
`SaveChanges`.** New `WorkOrdersHub` (`Api/Hubs`) at `/hubs/work-orders`,
`[Authorize]` — on connect, joins `company:{companyId}` read straight off
the JWT's own `company_id` claim (`CurrentUserService.CompanyIdClaimType`).
No hub method ever takes a client-supplied group name — `CompanyId` is the
only isolation claim actually baked into the token (confirmed against
`JwtTokenService`: `UserId`/`CompanyId`/`Role`, nothing brigade- or
object-scoped), so "по компании" is the finest group this step can build
without inventing a new claim. Finer BrigadeId/ProrabObjectAssignment
targeting is a real possible refinement, not covered by §9.4's literal
text — flagged, not built.

New `IWorkOrderRealtimeNotifier` (Application) / `SignalRWorkOrderNotifier`
(Api, via `IHubContext<WorkOrdersHub>`) sends `WorkOrderStatusChanged` to
the company group. Wired into all five existing WorkOrder transition
handlers (`Assign`/`Start`/`Submit`/`Accept`/`Reject`) — each calls the
notifier **after** its own `SaveChangesAsync`, literally matching §9.4's
"события после `SaveChanges`, не до." `Program.cs`: `AddSignalR()`,
`MapHub`, and a JWT-bearer `OnMessageReceived` fallback reading
`?access_token=` from the query string (browser SignalR clients can't set
an `Authorization` header on a WebSocket handshake) — scoped to the hub's
own path only, never applied to REST requests.

**Only `WorkOrderStatusChanged` this step.** §9.4 also lists
`AttendanceMarked`, `MaterialShortageReported`, `BonusPendingApproval`,
`PayrollDraftReady` — none of those features exist yet (Phase 3/4/5), so
there's nothing to fire them from; the hub/notifier pattern is ready for
each to plug in once its owning step lands.

Verified with 2 throwaway xUnit tests against a temporary EF InMemory
`IApplicationDbContext` (written, run — 2/2 passed — then deleted,
including a temporary `Microsoft.EntityFrameworkCore.InMemory` package
reference added and reverted from `Directory.Packages.props`/the test
csproj, no trace left): `AssignWorkOrderCommandHandler` calls the notifier
exactly once with the correct `(companyId, workOrderId, "New",
"Assigned")` tuple, and — critically — the `TaskLog` row is already
committed by the time the notifier fires, proving the ordering; a rejected
transition (already `Assigned`, re-assign attempted) never calls the
notifier at all. Docker still unavailable — suite count unchanged (22
total, 5 pass, 17 need Docker); no new permanent tests this step.

**Phase 2, Step 4 [BE] — `WorkOrderProgress`, upload фото (подписанный
URL, allow-list MIME).** Greenfield — no file/blob storage abstraction
existed anywhere in the repo before this step (confirmed by search). New
`IFileStorageService` (Application/Common/Interfaces), implemented by
`LocalFileStorageService` (Infrastructure/Files): disk storage under a
configured `RootPath` outside the web root, HMAC-SHA256 signed URLs with
expiry (`GetSignedUrl`/`TryValidateSignedUrl`), MIME-derived extensions
from the same allow-list the validator enforces, and path-traversal
rejection (`Path.GetFileName(key) != key` → reject — every key this
service ever hands out is a bare `{guid}.{ext}`, so any mismatch means the
caller supplied something it didn't mint). New `FilesController`
(`GET /files/{key}?exp&sig`, `[AllowAnonymous]` — the signature+expiry
pair *is* the authorization here, not a JWT, since a photo URL embedded in
an already-authenticated response has to be directly fetchable, e.g. by an
`<img>` tag or the Telegram bot relaying it).

`AddWorkOrderProgressCommand`: `POST /work-orders/{id}/progress`, Brigadir
own-brigade only (`WorkOrderAccess.GetForBrigadirAsync`, same isolation as
Step 3's other Brigadir handlers), gated on `WorkOrder.Status ==
InProgress` per §7.1's "`ReportedQty` принимается только при `InProgress`"
— returns `WORK_ORDER_INVALID_TRANSITION`, the same code every other
wrong-status attempt uses. **Not a state transition** (`WorkOrder.Status`
doesn't change), so no `TaskLogWriter` call here, unlike every Step 3
handler. FluentValidation enforces §11.9's size limit and MIME allow-list
per photo, injecting `IOptions<FileStorageOptions>` into the validator
(config-driven, not hardcoded, same pattern as `JwtOptions`).
`WorkOrderProgress.PhotoUrls` stores opaque storage **keys**, not literal
URLs — signed URLs are minted fresh on every read (`WorkOrderProgressDto
.FromEntity`) since a URL persisted at write time would eventually expire
while sitting in the database.

New `FileStorage` config section (`RootPath`, `SignedUrlExpiryMinutes`,
`MaxFileSizeBytes`, `AllowedContentTypes`) in `appsettings.json` — all
non-secret, safe to commit. `SignedUrlSecret` follows the exact pattern
`Jwt:SecretKey` already established: absent from every checked-in
appsettings file, `ValidateOnStart` requires it set and ≥32 bytes via
ENV/user-secrets (MASTER §11.1's reasoning applied to §11.9).

Verified with 3 throwaway xUnit tests directly against
`LocalFileStorageService` (written, run — 3/3 passed — then deleted, no
csproj/trace left): save → signed URL → validate → read round-trips the
exact bytes with the right content type; an expired or tampered signature
is rejected; a `../../etc/passwd`-style key throws rather than escaping
`RootPath`. Made `LocalFileStorageService` `public` rather than `internal`
— matches every other Infrastructure service (`Argon2PasswordHasher`,
`JwtTokenService`, `CurrentUserService`), all public, none of them
`internal`; this also happened to be what the throwaway test needed to
construct it directly.

Only `POST .../progress` this step — §9.4 lists no separate `GET` for
listing progress reports, so none was added. Docker still unavailable —
suite count unchanged (22 total, 5 pass, 17 need Docker); no new permanent
tests (that's Step 9's job).

**Phase 2, Step 3 [BE] — `TaskLog` в той же транзакции, что переход.** New
`Application/Common/TaskLogWriter.cs`: `Append` only adds to the tracked
`DbContext` — it never calls `SaveChangesAsync` itself, so the caller's
existing single `SaveChangesAsync` (already writing the entity's new
`Status`) is what makes the entity change and the log write atomic (Rule 3).
Wired into `IndividualTask.Start`/`Complete` (already existed, just needed
the log call) and every new `WorkOrder` transition handler.

**`WorkOrder`'s remaining §7.1 transitions built out in full**, not just
the log wiring: `AssignWorkOrderCommand`, `StartWorkOrderCommand`,
`SubmitWorkOrderForReviewCommand`, `AcceptWorkOrderCommand`,
`RejectWorkOrderCommand`, `GetWorkOrderLogQuery` — `Api/Controllers/
WorkOrdersController.cs` now exposes `POST .../assign|start|submit|accept|
reject` and `GET .../log`. New `WorkOrderAccess` helper (mirrors
`ProrabObjectAccess`/`BrigadeAccess`): Prorab+ scoped by
`ProrabObjectAssignment` on the order's `ObjectId`, Brigadir scoped to their
own `BrigadeId` via their linked `Worker` row — same 404-not-403 pattern as
every other isolation check in this codebase.

**Found — `/assign` and `/start` aren't in §9.4's literal endpoint table**
(only `/submit`, `/accept`|`/reject`, `/log` are listed), but without them a
`WorkOrder` could never leave `New` via the API and `/submit` could never
succeed — decided with the user to add them anyway, Prorab+ for `/assign`
(same role as `Create`), Brigadir-own-brigade for `/start` (mirrors
`IndividualTask`). `/rework` and `/close` are still not exposed — same
class of gap, out of this step's scope. Worth reconciling MASTER §9.4's
table itself in a `docs` pass.

**Found — §7.1 says the piecework payout-share gate is keyed "у бригады"
(on the brigade)**, but `PayRateType` (§5.7) only exists per-`Worker`, not
on `Brigade` — there's no brigade-level field to read. Judgment call, not
an invented business rule: `SubmitWorkOrderForReviewCommand` treats a
brigade as "piecework" for this gate if it has ≥1 worker with
`PayRateType.Piecework`; if none, the 100%-payout-share requirement is
trivially satisfied (doesn't apply). `WorkOrderProgress` (gates `≥1`
report) and `WorkOrderPayoutShare` (gates the 100% sum) are both queried
for real here even though no handler can create either yet — Step 4 and
Phase 5 Step 1 will start returning `true`/populated data with no change
needed in this handler.

Build clean, 0 warnings. Tests unchanged from Step 2's baseline — Docker
still unavailable on this machine, 5/22 pass locally, the other 17 are all
`DockerUnavailableException` (Testcontainers), not real failures; no new
permanent tests this step (that's Step 9's job).

**Phase 2, Step 2 [BE] — `IndividualTask` + state machine.** Same situation
as Step 1: the entity, its state machine (`Start`/`Complete`/`ProposeBonus`/
`ApproveBonus`, all `Result`-returning, `CompletedEarly` correctly computed
**at closing** per §7.2/§8.5), and `xmin` already existed — nothing in
`Application`/`Api` referenced it. Built `Application/IndividualTasks/`
(`CreateIndividualTaskCommand`, `StartIndividualTaskCommand`,
`CompleteIndividualTaskCommand`, `ListIndividualTasksQuery`),
`Api/Controllers/IndividualTasksController.cs`: `GET,POST
/individual-tasks`, `POST .../start`, `POST .../complete` — **`Brigadir`
only**, per §9.4's endpoint table (no Prorab+ split for this one, unlike
`WorkOrder`).

**Not built: `ProposeBonus`/`ApproveBonus` endpoints.** §8.5 covers the
premium-proposal flow, but Phase 3's own step list (Step 6, `[BOT]`,
"«Личные задачи»: ... → предложение премии") explicitly scopes that to a
later, currently-deferred bot step — not this one. This step is exactly
what its checklist line says: the `Assigned→InProgress→Done` state machine
and the same-brigade assignment check, nothing past that.

**New shared `BrigadeAccess` helper** (`Application/IndividualTasks/`,
mirrors Phase 1 Step 4's `ProrabObjectAccess`): resolves the calling
Brigadir's own `BrigadeId` via their linked `Worker` row (§4 — a Brigadir
is simultaneously a `User` and a `Worker`, `Worker.UserId`), used by every
handler here instead of duplicating the lookup. `Start`/`Complete` on a
task belonging to another brigade → new `INDIVIDUAL_TASK_NOT_FOUND` (404,
not 403 — §4's "не видит чужие бригады"); `Create` targeting a worker
outside the caller's own brigade → the already-existing
`INDIVIDUAL_TASK_WRONG_BRIGADE` (400, per §9.2's actual table — this is
the first handler to ever raise it). A caller with no linked `Worker` row
at all (shouldn't happen for a real Brigadir, but handled) →
`WORKER_NOT_FOUND`.

`CreateIndividualTaskCommand` reuses `Company.ReserveNextCode()` from Step
1 — confirmed the shared sequence actually works across both entity types
in the verification below (a `WorkOrder` and an `IndividualTask` in the
same company get consecutive codes, not independent per-entity counters).
Same `DbUpdateConcurrencyException` → `CONCURRENCY_CONFLICT` handling as
`CreateWorkOrderCommand`.

Verified with a throwaway EF InMemory check (1 test, written, run, deleted
— no `Directory.Packages.props`/csproj trace left): a Brigadir creates a
task for a co-worker in their own brigade (`BR-1`, following a WorkOrder
create that failed validation and correctly did **not** consume a code
number) and is rejected assigning to a worker in another brigade
(`INDIVIDUAL_TASK_WRONG_BRIGADE`); `Start` succeeds on their own task and
returns `INDIVIDUAL_TASK_NOT_FOUND` for a nonexistent one; `Complete` sets
`Done` and computes `CompletedEarly`; `List` returns only the caller's own
brigade's tasks; a user with no linked `Worker` row gets `WORKER_NOT_FOUND`.
Docker still unavailable — suite count unchanged (22 total, 5 pass, 17 need
Docker); xUnit tests for `IndividualTask` are Step 9's job.

**Phase 2, Step 1 [BE] — `WorkOrder` + state machine + `Code` + `xmin`.**
The `WorkOrder` entity, its full state machine (`Assign`/`Start`/
`SubmitForReview`/`Accept`/`Reject`/`Rework`/`Close`, all returning
`Result`), the unique `(CompanyId, Code)` index, and `xmin` **already
existed** — from the original Domain-layer commit plus Step 12's FK pass.
Nothing in `Application`/`Api` referenced it. This step's actual work:
`Application/WorkOrders/` (`CreateWorkOrderCommand`, `ListWorkOrdersQuery`),
`Api/Controllers/WorkOrdersController.cs`: `GET,POST /work-orders`,
Prorab+, per MASTER §9.4.

**Only `Create`/`List` this step — no `/submit`, `/accept`, `/reject`,
etc.** Those are real state *transitions*, and Rule 3 ("every transition
writes `TaskLog` in the same transaction — not 'logging we'll add later'")
isn't satisfiable yet: `TaskLog` wiring is explicitly Step 3, not built.
`Create` isn't a transition (no `FromStatus`), so it's exempt. Exposing the
transition endpoints now would either violate Rule 3 or need re-touching
every action handler once Step 3 lands — same reasoning Phase 1 Step 4
used to defer `AdminAuditLog` wiring to its own step.

**`Code` generation needed a real migration — a per-company counter shared
with `IndividualTask`.** MASTER §5.14 says `IndividualTask.Code` uses "та
же последовательность, что WorkOrder" — one shared counter, not
per-entity. Added `Company.NextCodeNumber` (int) + `Company.ReserveNextCode()`
(`"BR-{N}"`, increments) — `Company` already holds other per-company
settings, and is Ahmad-owned Domain. Also added `xmin` to `Company` (same
pattern as `WorkOrder`/`IndividualTask`/`PayrollEntry`): two concurrent
requests racing on `NextCodeNumber` would otherwise silently compute the
same code and hit the `(CompanyId, Code)` unique-index violation as a raw,
uncaught exception; `xmin` turns that into a catchable
`DbUpdateConcurrencyException` → the existing `CONCURRENCY_CONFLICT` code,
reusing established machinery instead of a retry-loop or raw-SQL lock.

**Caught and fixed a bug in my own first migration draft, before
committing:** `AddColumn<int>` for `NextCodeNumber` defaulted to `0`, not
`1` — EF Core's migration generator uses `default(int)`, not the CLR
property initializer, unless `.HasDefaultValue(...)` is set explicitly.
Without the fix, every already-seeded `Company` would have backfilled to
`0`, and its first `WorkOrder`/`IndividualTask` would have been "BR-0", not
"BR-1". Deleted the draft migration, added `.HasDefaultValue(1)` to
`CompanyConfiguration`, regenerated.

New `ESTIMATE_ITEM_NOT_FOUND` (404) for the optional `EstimateItemId` —
same 404-not-403 pattern as `OBJECT_NOT_FOUND`/`BRIGADE_NOT_FOUND`.
`CreateWorkOrderCommand` applies the same `ProrabObjectAccess` isolation
guard as `CreateEstimateItemCommand` (Phase 1 Step 4) — a `WorkOrder`
always references an *existing* object, unlike creating a brand-new
`ConstructionObject`. `ListWorkOrdersQuery` only builds the Prorab+ half of
`GET,POST /work-orders` — Brigadir's "own, read" half isn't built; Brigadir
has no authenticated path anywhere in this codebase yet (their interface
is the Telegram bot, deferred).

Verified with a throwaway EF InMemory check (2 tests, written, run,
deleted — no `Directory.Packages.props`/csproj trace left): `Code` is
`BR-1` then `BR-2` on successive creates for the same company (proves the
counter persists across separate `SaveChanges` calls); object/brigade/
estimate-item not-found each rejected with the right code; a Prorab with
one assignment can create on that object but is blocked
(`PRORAB_NOT_ASSIGNED_TO_OBJECT`) on another; list totals match. Did **not**
attempt to simulate the `xmin`/`CONCURRENCY_CONFLICT` race with
InMemory — that's genuinely Postgres-specific behavior (real row-version
semantics), not something the InMemory provider reproduces meaningfully;
noting this as an inference-verified, not execution-verified, part of the
design, same caveat class as every other Docker-gated limitation this
session. Docker still unavailable — suite count unchanged (22 total, 5
pass, 17 need Docker); xUnit tests for `WorkOrder` are Step 9's job (Phase
2's test step).

**Step 7 [BE] — joint tests: 18+, изоляция прораба по объектам.** New,
permanent (not throwaway) `Tests/Api.IntegrationTests` files, real Postgres
via the Step 10 `PostgresFixture` — first tests written directly against
Step 1/4's own Application handlers rather than auth:

- `WorkerAgeGuardTests.cs` (3 tests, MASTER §8.3): exactly 18 on `HireDate`
  succeeds; one day short fails `WORKER_UNDERAGE`; a backdated `HireDate`
  (born 2008-07-01, hired on their 16th birthday in 2024 — already 18
  *today*, whenever "today" runs) still fails — proves the guard checks age
  **at `HireDate`**, not at call time, per §8.3's explicit "не должно
  проходить только потому, что человек уже вырос."
- `ProrabObjectAssignmentIsolationTests.cs` (4 tests, MASTER §1.2/§11.5):
  zero assignments → Prorab sees every object; one assignment → sees only
  that one, and `Get` on the other returns `PRORAB_NOT_ASSIGNED_TO_OBJECT`
  (not `OBJECT_NOT_FOUND` — the object genuinely exists, just isn't
  theirs); Owner is never restricted regardless of assignments; a duplicate
  assignment is rejected `PRORAB_ALREADY_ASSIGNED`.

Added a `FixedCurrentUserService` + `PostgresFixture.CreateDbContext(ICurrentUserService)`
overload (`PostgresFixture.cs`) — every prior Postgres-backed test ran
unauthenticated (`NullCurrentUserService`, correct for login/refresh/seed);
this is the first step needing a real `CompanyId`/`Role`/`UserId` context,
since both the age guard and the isolation check read `ICurrentUserService`
directly.

**Docker still unavailable on this machine** — these 7 new tests are
compile-verified only here, same limitation as every Postgres-backed test
since Step 10. Verified the underlying logic separately with a throwaway EF
InMemory check running the *exact same* handler calls and assertions
(written, run — 2/2 passed — then deleted, no `Directory.Packages.props`/
csproj trace left) before trusting the permanent Postgres versions.
Suite total: 22 (was 15) — 5 pass locally (Docker-free), 17 need Docker,
all 17 new+existing failures are the expected `DockerUnavailableException`,
not real test failures.

**Phase 1 is now complete — all 7 steps done** (Steps 1/4/5/6 Zone A this
session, Steps 2/3 Zone B). Phase-summary write-up and the ✅ COMPLETE stamp
are `done`'s job, not `go`'s — not written yet, follows when the user runs
`done`.

**Step 6 — маскирование `Document*`/`PayRate` по ролям.**
`WorkerDto.FromEntity` now takes the caller's `Role?` and nulls out
`PayRate`, `DocumentType`, `DocumentExpiryDate` for anyone who isn't
Owner/Accountant — Prorab (the only other role currently able to reach
`GET,POST /brigades/{id}/workers`, per §9.4) gets all three back as `null`,
including on the response to their **own** `POST` (they typed the value in,
but the response still masks it — one rule, no special-case for "you just
told me this"). `PayRate` went from `decimal` to `decimal?` on the DTO to
represent "hidden."

**Scope note — wider than the checklist line's literal wording, on
purpose.** The PROGRESS.md line for this step only says "Document*", but
Shahrom's Step 2 writeup already flagged that Step 6 was meant to cover
*both* "hiding `PayRate` from Prorab" and "masking `Document*`" — matching
MASTER §12's role matrix row (`Worker | ... | CRU (без PayRate) | ... |
R (с PayRate)`), not just §11.6. Did both here rather than leaving PayRate
for a step that was never itemized separately.

**Found — MASTER §11.6 assumes a field that doesn't exist.** §11.6 says
"полный номер документа виден только Owner/Accountant... Prorab видит
маскированный (`****4567`)" — i.e. a partial-reveal mask on a document
*number*. `Worker` (§5.7) only has `DocumentType` (a category string, e.g.
"Passport") and `DocumentExpiryDate` — there's no document-number field
anywhere in the Domain model to apply a `****4567`-style mask to. Not
inventing a new PII field to satisfy this literally (that's a data-model
decision, not a masking one) — implemented the closest honest reading of
the intent with what actually exists: Prorab gets `Document*` fields
**hidden entirely** (`null`), not partially revealed, since there's nothing
to partially reveal. Worth resolving in MASTER.md itself — either drop the
`****4567` framing or add the number field it presupposes.

**Closed a gap flagged back in Step 8**, also under §11.6: `Serilog
.Destructure.ByTransforming` for PII now exists in `Program.cs`, for both
`Worker` and `WorkerDto` — excludes `Phone`/`BirthDate`/`DocumentType`/
`DocumentExpiryDate`/`PayRate` from anything logged via `{@Worker}`/
`{@WorkerDto}` destructuring. Deliberately separate from the DTO-level
role-masking above: logs are a different exposure surface (retained
longer, read by ops/devs regardless of the original caller's role), so
this isn't redundant with it — an Owner's own request could still leak PII
into a log line without this.

Verified with a throwaway EF InMemory check (written, run, deleted — no
`Directory.Packages.props`/csproj trace left): Owner's create-response and
list-response both show full `PayRate`/`DocumentType`/`DocumentExpiryDate`;
a Prorab's create-response (for a worker *they* just entered) and
list-response both show `null` for all three; non-PII fields
(`FullName`/`Phone`) stay visible either way. Docker still unavailable
here — suite count unchanged (15 total, 5 pass, 10 need Docker); xUnit
tests for this step are Step 7's job — the very next one.

**Step 5 (Zone A) — `AdminAuditLog` + interceptor.**
New `Infrastructure/Persistence/Interceptors/AdminAuditSaveChangesInterceptor.cs`,
registered `Scoped` (unlike `AuditableEntitySaveChangesInterceptor`, which is
`Singleton` — this one needs `ICurrentUserService`, itself Scoped, for
`ActorUserId`/`CompanyId`). Watches `ChangeTracker` on every `SaveChanges`
for exactly the four things this step's checklist names: `User.Role`
(→ `RoleChanged`), `User.IsActive` true→false (→ `UserDeactivated`),
`Worker.PayRate` (→ `PayRateChanged`, unconditional per §11.7 — "изменение
PayRate пишется всегда", no threshold), `Brigade.BrigadirUserId`
(→ `BrigadirAssigned`).

**Interceptor, not per-handler calls — deliberately.** MASTER §9.4 has no
endpoint yet for changing a user's role, deactivating a user, or changing a
worker's `PayRate` — only `AssignBrigadirCommand` (Step 3) exists among the
four. An interceptor means this audits that one real call site *today* and
will audit the other three automatically the moment their endpoints land in
a later phase, without anyone needing to remember to add an explicit
`AdminAuditLog` call at each new site — the same class of "missed check is
🔴, not a suggestion" risk AGENTS.md calls out for brigade/prorab isolation,
just applied to audit logging instead. This also finally closes the gap
Step 3 flagged: "No `AdminAuditLog` entry written for the [brigadir]
assignment yet... flagged so `BrigadirAssigned` isn't forgotten once it
lands" — it's wired now, verified against the real
`AssignBrigadirCommandHandler`, not a re-implementation.

No actor (`ICurrentUserService.CompanyId`/`UserId` both null — e.g.
`SeedDataService` at startup, before any JWT exists) → no audit row,
silently. Nothing to attribute the change to.

`OldValueJson`/`NewValueJson` serialize as `{"value":"<ToString()>"}` —
uniform across the enum/bool/decimal/Guid? fields tracked here rather than
type-specific formatting per field.

Verified with a throwaway EF InMemory check (2 tests, written, run, deleted
— no `Directory.Packages.props`/csproj trace left): creating a User/Worker/
Brigade produces zero audit rows (only modifications are audited, not
creates); changing `Role` + deactivating in one `SaveChanges` produces
exactly `RoleChanged` + `UserDeactivated`, both correctly attributed
(`CompanyId`/`ActorUserId`); `ChangePayRate` produces `PayRateChanged`;
calling the real `AssignBrigadirCommandHandler` produces `BrigadirAssigned`
with the new user's id in `NewValueJson`; a context with no authenticated
actor produces zero rows on a `Deactivate()` call. Docker still unavailable
here — suite count unchanged (15 total, 5 pass, 10 need Docker); xUnit
tests for this step are Step 7's job.

**Step 4 (Zone A) — `ProrabObjectAssignment` + фильтрация объектов по прорабу.**
`Application/Objects/AssignProrabCommand.cs` + `ListObjectProrabsQuery.cs`
(`POST,GET /objects/{id}/prorabs`, Owner only, overriding the controller's
default `Owner,Prorab` gate) plus a new `ProrabObjectAccess` helper used by
every object-scoped handler from Step 1: `ListConstructionObjectsQuery`
(filters), `GetConstructionObjectQuery`, `UpdateConstructionObjectCommand`,
`CreateEstimateItemCommand`, `ListEstimateItemsQuery` (all reject access to
an unassigned object). One shared helper instead of duplicating the
assignment lookup five times — a missed copy would have been exactly the
"🔴, not a suggestion" isolation gap AGENTS.md warns about.

Implements MASTER §1.2's default literally: `GetAllowedObjectIdsAsync`
returns `null` (no restriction) for Owner, or for a Prorab with **zero**
`ProrabObjectAssignment` rows — the "one prorab, no setup needed" case.
Once a Prorab has even one assignment, it returns the allow-list and
everything outside it is rejected.

**Corrected my own first draft**: initially returned `OBJECT_NOT_FOUND` for
the isolation-guard failures, reusing Step 1's genuine-not-found code. MASTER
§9.2 already defines a dedicated code for exactly this case —
`PRORAB_NOT_ASSIGNED_TO_OBJECT`, 404 — which existed in `ErrorCodeCatalog`
since Step 10 but had no caller until now. Fixed before committing: `OBJECT_NOT_FOUND`
stays for a genuinely missing/wrong-company object, `PRORAB_NOT_ASSIGNED_TO_OBJECT`
for "exists, but not yours." Both 404 — the closed-model rule (§9's "404, not
403, don't confirm existence") is about not distinguishing 403 vs. 404, not
about hiding which 404 sub-reason applies, and MASTER's own dedicated code
confirms that reading.

New `PRORAB_ALREADY_ASSIGNED` (409) — the unique `(ProrabUserId, ObjectId)`
constraint on `ProrabObjectAssignment` (§5.8) means a repeat assignment is
checked explicitly before insert rather than left to bubble up as a raw
DB unique-violation. No check that the assigned user actually has
`Role == Prorab` — not a stated MASTER invariant, same call as
`AssignBrigadirCommand` (Step 3) and `Worker.UserId` (Step 2).

**`CreateConstructionObjectCommand` is deliberately NOT gated by
assignment** — §1.2's wording is about visibility ("видит"/sees), and
there's no existing object yet to scope a fresh `Create` against; the role
matrix's plain "C" (no "назначенные" qualifier, unlike the R) reads the same
way.

Verified with a throwaway EF InMemory check (written, run, deleted — no
`Directory.Packages.props`/csproj trace left): a fresh Prorab with zero
assignments sees both test objects; after the Owner assigns them to one,
the list narrows to exactly that one; `Get`/`CreateEstimateItem` on the
unassigned object both return `PRORAB_NOT_ASSIGNED_TO_OBJECT`, on the
assigned one both succeed; duplicate assignment → `PRORAB_ALREADY_ASSIGNED`;
assigning a nonexistent user → `USER_NOT_FOUND`. Docker still unavailable
here — suite count unchanged by this step (15 total, 5 pass, 10 need
Docker); xUnit tests for this step are Step 7's job.

**Step 1 (Zone A) — `Customer`, `ConstructionObject`, `EstimateItem`.**
`Application/Customers/` (`CreateCustomerCommand`, `ListCustomersQuery`),
`Application/Objects/` (`CreateConstructionObjectCommand`,
`ListConstructionObjectsQuery`, `GetConstructionObjectQuery`,
`UpdateConstructionObjectCommand`, `CreateEstimateItemCommand`,
`ListEstimateItemsQuery`), `Api/Controllers/CustomersController.cs` +
`ObjectsController.cs`: `GET,POST /customers`, `GET,POST /objects`,
`GET,PUT /objects/{id}`, `GET,POST /objects/{id}/estimate-items` — all
Prorab+ per MASTER §9.4. `IApplicationDbContext` gained `Customers`/
`ConstructionObjects`/`EstimateItems` `DbSet`s (same catch-up `ApplicationDbContext`
already had them, interface hadn't). New codes `CUSTOMER_NOT_FOUND`/
`OBJECT_NOT_FOUND` in `ErrorCodeCatalog`, same 404-not-403 pattern as
`BRIGADE_NOT_FOUND` from Step 2. No `ProrabObjectAssignment` filtering on the
objects list yet — that's explicitly Step 4's scope, not invented here.

**Added `ConstructionObject.Update()` to Domain** (Ahmad's file, needed for
this step's own deliverable, not scope creep): MASTER §9.4 lists
`GET,PUT /objects/{id}` as a general update endpoint and §12's role matrix
gives Owner/Prorab full `CRU`, but Domain only had `ChangeStatus`/`Complete`
— no way to update `Name`/`Address`/dates/`Budget` at all. Added `Update()`
for those plain fields, keeping `Status` transitions on the existing
aggregate methods (Rule 3) — the handler calls `Update()` for the descriptive
fields and separately `Complete()` or `ChangeStatus()` depending on the
requested status, rather than folding status into `Update()`'s own
parameters.

**Found, not fixed — Domain has `Customer.Update()`/`EstimateItem.Update()`
already, unused.** Both entities already carry `Update()` methods (predating
this step) even though MASTER §9.4's endpoint list has no `PUT /customers/{id}`
or per-item estimate update — only `GET,POST` for both. Implemented exactly
what §9.4 lists, nothing invented; flagging since §12's role matrix calls
both "CRU" for Owner/Prorab, so an update endpoint may be a real gap in §9.4
rather than a deliberate omission — worth squaring away in MASTER.md, same
class of issue as the Brigade `PUT /brigadir` role contradiction from Step 3.

Verified with a throwaway EF InMemory check (written, run — 1 test, 12
assertions covering create/list/get/update/complete for objects, both
not-found paths, estimate item create + list, customer create + list — all
passed, then deleted, no `Directory.Packages.props`/csproj trace left).
Docker still unavailable here — Postgres-backed `Api.IntegrationTests` count
unchanged by this step (15 total, 5 pass, 10 need Docker); xUnit tests for
this step itself are Step 7's job, not written now.

**Step 3 (Zone B) — `Brigade`, назначение бригадира.**
`Application/Brigades/` (`CreateBrigadeCommand`, `ListBrigadesQuery`,
`AssignBrigadirCommand`), `Api/Controllers/BrigadesController.cs`:
`POST,GET /brigades` (Owner/Prorab), `PUT /brigades/{id}/brigadir` (Owner
only). `AssignBrigadirCommand` allows `UserId: null` to clear an assignment —
`Brigade.AssignBrigadir(Guid?)` was already written to support it. No check
that the target user has `Role == Brigadir` — not a stated MASTER invariant,
would have been inventing a rule (same call as `Worker.UserId` in Step 2). No
`AdminAuditLog` entry written for the assignment yet — that's Zone A's Phase
1 Step 5, not built yet; flagged so `BrigadirAssigned` isn't forgotten once
it lands.

**Resolved a self-contradiction in MASTER.md, decided by the user, not
picked silently:** who can call `PUT /brigades/{id}/brigadir`? §9.4's
endpoint table says **Owner** only; §13's Phase 1 DoD line ("прораб
создаёт объект, бригаду, **назначает бригадира**...") explicitly describes
**Prorab** doing it; §12's role matrix gives Prorab general `CRU` on
`Brigade` with no stated carve-out for `BrigadirUserId` specifically (unlike
`Worker.PayRate`, which *is* explicitly carved out). **Decided: Owner only**,
per §9.4 literally — implemented that way. Worth Ahmad/the user squaring away
in MASTER.md itself at some point so this doesn't need re-deciding.

Verified with a throwaway EF InMemory check (7/7 passed, then deleted, no
`Directory.Packages.props`/csproj trace left): create succeeds; assign and
clear-assignment both work; brigade-not-found, user-not-found, and
cross-company-brigade (global `CompanyId` filter hides it, doesn't leak it)
all return the expected 404s; pagination works. No new error codes needed —
`BRIGADE_NOT_FOUND`/`USER_NOT_FOUND` already existed from Step 2. Real xUnit
tests for this step are Step 7's job, not written now.

**Step 2 (Zone B) — `Worker`: 18+ on `HireDate`, `ShiftStartTime`, PII fields.**
Application/Api layer only (`backend/Application/Workers/`,
`backend/Api/Controllers/WorkersController.cs`) — `CreateWorkerCommand`,
`ListBrigadeWorkersQuery` (first paginated endpoint in the project, §9.3 shape:
`items/page/pageSize/totalCount`, page size clamped to max 100),
`TerminateWorkerCommand`. Endpoints gated `[Authorize(Roles = "Owner,Prorab")]`
per §9.4 "Prorab+"; `CompanyId` isolation is the automatic EF global filter,
no manual `BrigadeId` scoping needed since Brigadir has no access to this
endpoint yet (not enumerated in §9.4). `IApplicationDbContext` gained
`Brigades`/`Workers` `DbSet`s (Ahmad's `ApplicationDbContext` already exposed
them; the interface hadn't caught up). Full role-based field visibility
(hiding `PayRate` from Prorab, masking `Document*`) is deliberately **not**
done here — that's Step 6's explicit scope ("маскирование Document* по ролям
— разные Response DTO"), and this step's own checklist line only asks for the
fields to exist and the age guard to hold, not the masking pass.

**Found and flagged for Ahmad, not fixed (Domain/Persistence are his files):**
1. `Worker.Create()` throws `ArgumentException` for the 18+ guard instead of
   returning `Result<Worker>` — the only factory in Domain that does this
   (`WorkOrder`/`IndividualTask`/`MaterialRequest` all return `Result` from
   every guarded method). Without a workaround, hitting this guard would
   bubble as an unhandled exception → generic `500 INTERNAL_ERROR`, not the
   hard `400 WORKER_UNDERAGE` §8.3 requires (and which was already sitting in
   `ErrorCodeCatalog.cs`, unreachable). Stopgapped in
   `CreateWorkerCommandHandler` with a narrow
   `catch (ArgumentException ex) when (ex.ParamName == "birthDate")` mapping
   to `Result.Failure(WORKER_UNDERAGE)`. Recommend Ahmad align `Worker.Create`
   to the `Result` pattern when he next touches that file.
2. The **zero-FK-constraints gap flagged at the end of Step 10** is still
   open — no dedicated step was ever inserted for it, and this step is the
   first to actually exercise it: `Worker.BrigadeId`/`Worker.UserId` are
   exactly the "real cross-entity writes" that note warned about. Mitigated
   here at the Application layer only — `CreateWorkerCommandHandler` checks
   `Brigades`/`Users` existence before insert (→ `BRIGADE_NOT_FOUND` /
   `USER_NOT_FOUND`, both new codes, same "404, not in §9.2's table, real
   anyway" pattern as `PASSWORD_CHANGE_REQUIRED`) — but there's still no
   DB-level referential integrity. Needs a dedicated step (Ahmad: entities +
   configs + migration) before Phase 2 adds more of these.

Verified with a throwaway EF InMemory check (written, run — 6/6 passed,
then deleted, no `Directory.Packages.props`/csproj trace left): create
succeeds for a valid brigade; underage returns `WORKER_UNDERAGE` as a
`Result`, confirmed *not* an unhandled exception; brigade-not-found and
cross-company-brigade (another company's `Brigade.Id` guessed) both return
`BRIGADE_NOT_FOUND` — confirming the global `CompanyId` filter actually hides
the row rather than leaking it; terminate flips `IsActive`/sets
`TerminationDate`; list pagination scopes correctly to one brigade and
excludes another's workers. Docker unavailable on this machine (see Step 10)
— no Postgres-backed run possible here; xUnit tests for this step itself are
Step 7's job, not written now, per "one task at a time".

**Test count corrected**: PROGRESS.md previously said "14 tests" for Step 10;
running the actual suite now shows 12 (5 pass without Docker, 7 fail with
`DockerUnavailableException` — `LoginCommandHandlerTests` ×3,
`RefreshTokenCommandHandlerTests` ×3, `SeedDataServiceTests` ×1). The "14"
was a stale estimate in that note, not a regression — this step touched none
of those test files. Correcting the count here since it's the first time
since Step 10 the suite was actually re-run.

**Step 10 — auth tests, and a migration gap found along the way.** Writing
DB-backed tests surfaced that **no EF Core migration had ever been created**
in this repo — `backend/Infrastructure/Migrations/` didn't exist, and no
PROGRESS.md step across 1–9 ever itemized one. `Program.cs`'s
`Database.MigrateAsync()` at startup was a silent no-op against a real
Postgres — `users`/`refresh_tokens`/etc. never existed as tables. Fixed as a
plan-mode prerequisite (CLAUDE.md requires plan mode for anything touching
`Infrastructure/Migrations/`): added a **local `dotnet-ef` tool manifest**
(`backend/.config/dotnet-tools.json`, pinned to 10.0.10 — matches the
project's actual EF Core version; the previously-global 9.0.17 install was
a version mismatch and the global-update command was declined, so this is
scoped to the repo instead) and generated `InitialCreate` from the existing
Domain + `Infrastructure/Persistence/Configurations/*` (complete since
`c21b842`). Spot-checked: `decimal` columns all render as the `numeric(p,s)`
MASTER §5 specifies (`numeric(18,2)` money, `numeric(18,3)` quantities,
`numeric(5,2)` `SharePercent`, no EF-default guesses), `TelegramUpdateLog
.UpdateId` has its unique index (Rule 4), no `CompanyId`/soft-delete filter
artifacts leaked into the schema (query-time only, as expected).

**Found and deliberately did not fix in this step:** reviewing the
generated migration showed **zero `AddForeignKey`/`table.ForeignKey` calls
across all 26 entities** — none of the `Infrastructure/Persistence/
Configurations/*.cs` files configure a relationship (`HasOne`/`WithMany`/
`HasForeignKey`), so every FK-shaped column (`WorkOrder.ObjectId`,
`Brigade.BrigadirUserId`, etc.) is a bare `Guid`/`Guid?` with indexes but no
DB-level referential integrity. Predates this session (Domain layer from
`c21b842`). Flagged to the user rather than silently fixed or silently
ignored — adding relationships to all 26 entities is a separate, much larger
task than Step 10's scope, and would mean regenerating `InitialCreate`
again. **Done as Phase 0 Step 12, before Phase 1** (added and completed
2026-07-18, per user request — see Step 12 writeup below).

**Tests written** (`backend/Tests/Api.IntegrationTests`), covering exactly
Step 10's checklist:
- `ForcePasswordChangeMiddlewareTests` — pure unit test (`DefaultHttpContext`
  + a stubbed `next`), no DB. Confirms 403 `PASSWORD_CHANGE_REQUIRED` on any
  path except `/auth/change-password`/`/auth/logout` when the claim is set,
  pass-through otherwise. Runs and passes locally without Docker.
- `LoginCommandHandlerTests` — success (persists a *hashed*, not plaintext,
  refresh token), wrong password, deactivated account — same
  `AUTH_INVALID_CREDENTIALS` for wrong-password and unknown-phone, confirming
  the handler's no-enumeration comment is actually true.
- `RefreshTokenCommandHandlerTests` — rotation (old token revoked +
  `ReplacedByTokenId` set), reuse-of-a-revoked-token (revokes the *whole*
  active chain, not just the reused token), unknown token.
- `SeedDataServiceTests` — one test, deliberately: `SeedDataService` gates
  owner-creation on "does *any* Owner exist in the DB?" (not per-company), so
  two separate `[Fact]`s calling `SeedAsync` with different options would
  race on that global gate depending on xUnit's run order. First-run-creates
  and second-run-is-a-no-op are asserted together against the same options
  in one test to avoid that.
- Login/Refresh handler tests deliberately use `Role.Prorab` for their test
  users, not `Owner` — they share one Postgres container/database (via
  `ICollectionFixture`) with `SeedDataServiceTests`, and an `Owner` created
  there would trip that same global gate and break the seed test's
  assumptions.

**This machine has no Docker** (`docker` not found) — the 9
Testcontainers-backed tests (Login/Refresh/Seed) could not actually be
executed here, only compiled. Verified real execution isn't silently
skipped: running them locally fails loudly with a Docker-daemon-unreachable
stack trace, not a false pass. `ForcePasswordChangeMiddlewareTests` (no
Docker needed) was run locally and passes — 5/5. The `.github/workflows/
backend-ci.yml` `ubuntu-latest` runner has Docker preinstalled, so the
Testcontainers tests will get their first real execution there, once pushed
(push stays human-only per AGENTS.md).

Package notes: `FluentAssertions` pinned to **7.2.2**, not the latest
(8.10.0) — v8 introduced a commercial Xceed license above a revenue/team-size
threshold; 7.x is the last Apache-2.0 release. Decided with the user rather
than picked silently, since licensing cost isn't a code decision.
`Microsoft.AspNetCore.Mvc.Testing` was added then removed — started toward a
`WebApplicationFactory`-based approach, switched to direct handler +
real-`ApplicationDbContext` tests instead (Step 10's five scenarios are
Application-layer behavior, not HTTP-pipeline behavior — no JWT-bearer/
TestServer wiring needed).

**CI (Step 9):** `.github/workflows/backend-ci.yml` — restore → build (Release)
→ test → `dotnet list package --vulnerable`. Zero-warnings не проверяется
отдельным шагом CI — он уже механически гарантирован
`TreatWarningsAsErrors=true` в `backend/Directory.Build.props` (Step 1): любое
предупреждение компилятора и есть провал шага build. `dotnet list package
--vulnerable` по умолчанию **не роняет** пайплайн даже при находках — это
просто отчёт, exit code всегда 0 — поэтому gate сделан вручную поверх
`--format json`: если у любого проекта в выводе появляется ключ `frameworks`,
значит нашлись уязвимые пакеты, шаг падает явно (`exit 1`). Проверка на
локали не завязана — раньше пробовал грепать человекочитаемый текст
(`"has the following vulnerable packages"`), но он выводится на языке
рантайма (у меня локально — по-русски), а раннер GitHub Actions обычно
английский; JSON-схема одна и та же независимо от локали. Проверил оба
случая не только на «сейчас пакетов нет»: синтетический JSON с
`vulnerabilities` в `frameworks` подтвердил, что проверка действительно
падает, когда должна, а не просто всегда молчит. `dotnet test` пока не падает
и не находит ничего — тестовых проектов ещё нет (Step 10) — но команда уже
на месте и завершается кодом 0, ничего чинить не придётся, когда тесты
появятся. Миграции по-прежнему ревьюит человек (не CI-шаг, MASTER §11.8) —
это про PR review, не про автоматизацию. Деплой сознательно не добавлен —
цель этого шага буквально «build + test + vulnerable-scan + zero-warnings»,
куда именно деплоить не решено.

**Нет веб-панели — решено окончательно.** Старый Step 9 (React-каркас) был
основан на MASTER §13.1, но весь §13/§14 (Frontend/Design) удалён из
`docs/MASTER.md` ещё в начале работы над Phase 0 (коммит `7cfa06c`). Я успел
начать React-каркас по общим канонам (Vite+React18+TS, Zustand, Axios+JWT-
интерцептор, protected routes) — код собирался и работал, но пользователь
решил, что панель не нужна вообще: Owner/Prorab/Accountant работают через
REST API напрямую (Postman/скрипты/внешний клиент), не через встроенную
веб-панель. Весь код в `frontend/` удалён (каталог вернулся к состоянию
только с `Api.md`), все `[FE]`-шаги вычеркнуты из плана по всем фазам,
`docs/MASTER.md` обновлён (§0 — две поверхности вместо трёх, §2 — убрана
строка Frontend из стека, §15 — убраны упоминания React из описаний фаз).
Единственное, что осталось от той попытки — `Application/Auth/AuthTokensDto.cs`
теперь возвращает `Role` в ответе логина/рефреша; это осталось намеренно —
полезно для любого прямого потребителя API, не только для несостоявшейся
панели, и никак не мешает REST-only модели.

**Error handling (Step 8):** `ExceptionHandlingMiddleware` is first in the
pipeline — catches anything unhandled anywhere downstream, logs full details
server-side, returns generic `500 INTERNAL_ERROR` with a `traceId` and nothing
else — no exception type, message, or stack trace ever reaches the client.
`Api/Common/ErrorCodeCatalog.cs` now has the full §9.2 code→HTTP-status table
(plus `PASSWORD_CHANGE_REQUIRED` from §5.27, which §9.2's table omits);
`ResultExtensions` uses it instead of the old auth-only switch.
`MATERIAL_REQUEST_OVERDELIVERY` is deliberately excluded — §9.2 marks it
`200`, a UI warning, not a `Result.Failure` case. Unknown codes default to
`400`, not a crash — §9.2 documents the interesting cases, not literally every
transition guard on all 26 entities.

**Serilog (MASTER §2/§3), wired within this step at explicit user request**
(it wasn't itemized as its own PROGRESS step, and I'd initially flagged rather
than silently deciding either way — resolved: do it now, as part of Step 8,
since it's exactly what `ExceptionHandlingMiddleware`'s logging call needed
anyway). `builder.Host.UseSerilog(...)` reads the `Serilog` appsettings
section (`MinimumLevel`/`WriteTo`/`Enrich`, `appsettings.json`), console sink,
`UseSerilogRequestLogging()` added for structured per-request logs. Code
against `ILogger<T>` is unchanged — Serilog is a provider swap, not an API
change, so `ExceptionHandlingMiddleware` didn't need editing. Column-level PII
exclusion (`Serilog.Destructure.ByTransforming`, §11.6) has nothing to attach
to yet — the PII-bearing DTOs (`Worker.BirthDate`/`DocumentType`/etc.) don't
exist until Phase 1; noting this so it isn't forgotten once they do. Confirmed
live, not just by reading config: running the app shows Serilog's own
`[HH:mm:ss ERR] ...` console format on EF Core's internal connection-failure
log, proving `UseSerilog()` actually replaced the default provider.

**Found and fixed a reconciliation gap** while building the catalog:
`WorkOrder.SubmitForReview`'s payout-share guard (written back in the Domain
block, before this catalog existed) used `WORK_ORDER_PAYOUT_SHARE_INCOMPLETE`,
which isn't in §9.2 — the spec's code for "Σ SharePercent ≠ 100" is
`WORK_ORDER_SHARES_INVALID`. Renamed to match.

Verified with a throwaway TestServer check: an endpoint that throws with a
secret string in the exception message returns 500 with `INTERNAL_ERROR` and
a `traceId`, and the response body contains neither the secret, the exception
type name, nor a stack trace; a non-throwing endpoint is unaffected; catalog
spot-checks (401/404/409/429/403/default-400) all match §9.2.

**Health/CORS/security headers (Step 7):** `/health` = liveness only
(`Predicate = _ => false`, no dependency checks run — just "is the process
alive"); `/health/ready` runs everything currently registered, which today is
just `AddDbContextCheck<ApplicationDbContext>()`, so it's 503 exactly when
Postgres is unreachable. `SecurityHeadersMiddleware` sets
`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
`Referrer-Policy: strict-origin-when-cross-origin`,
`Content-Security-Policy: default-src 'self'; frame-ancestors 'none'` on every
response; `UseHsts()` (non-Development only) + `UseHttpsRedirection()` cover
the rest of §11.3. CORS is an explicit allow-list from `Cors:AllowedOrigins`
config (empty by default, not a wildcard) — kept as-is even without a web
panel, since any direct API client (Postman/scripts) served from a browser
context would still need it; `appsettings.json` has a `CHANGE_ME` placeholder.
Verified with a throwaway TestServer check standing in a fake failing health
check for Postgres: `/health` stays 200 while it's failing, `/health/ready`
correctly returns 503; an allowed `Origin` gets `Access-Control-Allow-Origin`
echoed back, a disallowed one gets no CORS header at all (browser blocks it
client-side); all four security headers present on a plain response.

**Rate limiting (Step 6):** `/auth/login` — 5 attempts / 15 minutes, partitioned
by IP+phone (not IP alone — MASTER §11.4 wants each phone number to have its
own budget, so brute-forcing one phone from many IPs is still caught).
`LoginRateLimitKeyMiddleware` reads `phone` from a buffered request body
before the built-in `Microsoft.AspNetCore.RateLimiting` fixed-window limiter
partitions on it; rejection returns `429 RATE_LIMITED` in the §9.1 envelope
(factored the envelope writer out to `Api/Common/ErrorEnvelope.cs`, now shared
with `ForcePasswordChangeMiddleware`). **Found and fixed a real bug while
verifying this**: `UseRateLimiter()` was originally called before
`UseRouting()`/`MapControllers()`, so the endpoint-specific `auth-login`
policy silently never applied — every request just passed straight through,
no 429 ever, no error, no warning. Caught it with a throwaway TestServer
check, not by reading the code; fixed by adding an explicit `app.UseRouting()`
before `app.UseRateLimiter()`. Re-verified after the fix: 5 attempts for one
phone succeed, the 6th is 429; a second phone number from the same IP still
gets its own full budget.

**Seed + forced password change (Step 5):** `SeedDataService` runs after
`MigrateAsync`, before the host serves requests — creates the one `Company`
row and 3 seed `Owner`s from `Seed` config (`appsettings.json`, non-secret
placeholders) + `SEED_OWNER_{1,2,3}_PASSWORD` env vars (flat naming per §5.27,
deliberately not nested under `Seed`). Idempotent: re-running is a silent
no-op once any `Owner` exists. `PUT /auth/change-password` clears
`ForcePasswordChange`; `ForcePasswordChangeMiddleware` rejects every other
authenticated request with `403 PASSWORD_CHANGE_REQUIRED` while it's set,
reading a `force_password_change` JWT claim (not a DB read per request) —
`change-password` and `logout` are the only exempt paths. Verified end-to-end
with a throwaway check: seed run twice creates exactly 1 company / 3 owners
both times, each seeded owner's token carries `force_password_change=true`,
wrong current password is rejected, correct change clears the flag and a
freshly issued token afterward carries `force_password_change=false`, old
password stops working.

**Domain layer (Ahmad, `docs/TEAM_SPLIT_Backend_2people.md` §2.0/§3):** all 26
entities + all EF configurations written ahead of the sequential steps above,
Zone B first, so Shahrom isn't blocked on entity availability once he starts.
Company (Step 2) was fully satisfied as a side effect. Global query filters
(`CompanyId` + soft-delete, via reflection in `ApplicationDbContext.OnModelCreating`)
are wired (Step 3) — verified with a throwaway EF InMemory check.

**Auth (Step 4):** Argon2id password hashing (`Konscious.Security.Cryptography.Argon2`,
random salt, `CryptographicOperations.FixedTimeEquals`), JWT access tokens
(15 min, `company_id`/role claims — single-Company deployment, so the claim
comes from the one seeded `Company` row, not a `User.CompanyId` that doesn't
exist), `RefreshToken` rotation + reuse detection (`POST /auth/login`,
`/auth/refresh`, `/auth/logout`). `Jwt:SecretKey` is deliberately **not** in
any committed appsettings file (§11.1) — set it via user-secrets locally or
`Jwt__SecretKey` env var in any environment, ≥32 bytes, or the app fails fast
at startup (`ValidateOnStart`). Verified end-to-end with a throwaway handler-level
check: wrong password / unknown phone both return `AUTH_INVALID_CREDENTIALS`
(no user enumeration), rotation issues a new refresh token, reusing the
rotated-away token returns `AUTH_REFRESH_TOKEN_REUSED` and revokes the whole
chain, logout is idempotent. Found and fixed a real bug during this: the
`CompanyId` global filter (Step 3) would have silently broken `/auth/refresh`
lookups, since there's no authenticated context yet at that point in the flow —
those specific queries now call `.IgnoreQueryFilters()` deliberately.

---

## Phase 0 — Foundation
**Goal:** авторизация, роли, безопасность с первого дня. Без этого остальное не имеет смысла.

- [x] Step 1 [BE] — solution (Domain/Application/Infrastructure/WebApi/TelegramBot), MediatR + FluentValidation + `Result<T>`, авто-миграция при старте, zero-warnings → MASTER §2, §3
- [x] Step 2 [BE] — `Company` (первая сущность — от неё зависят все `CompanyId`), настройки: `PieceworkDistributionMode`, `LatenessGraceMinutes`, `LatenessNotifyThresholdMinutes`, `PayrollPeriodType` → MASTER §5.1
- [x] Step 3 [BE] — `User` (+ `ForcePasswordChange`), роли, global query filters (soft-delete + `CompanyId`) через reflection → MASTER §5.2, §11.5
- [x] Step 4 [BE] — Argon2id, JWT (access 15 мин), `RefreshToken` с **ротацией и обнаружением повторного использования** → MASTER §5.3, §11.1
- [x] Step 5 [BE] — **`SeedData`**: `Company` + 3 × `Owner` из конфига/ENV, идемпотентно, `ForcePasswordChange = true`. `PUT /auth/change-password` + middleware, блокирующий остальные запросы, пока флаг не снят → MASTER §5.27
- [x] Step 6 [BE] — rate limiting на `/auth/login` (5/15мин) **сразу**, не потом → MASTER §11.4
- [x] Step 7 [BE] — `/health`, `/health/ready`, CORS allow-list, security-заголовки (HSTS/CSP/nosniff) → MASTER §11.3, §11.8
- [x] Step 8 [BE] — `ExceptionHandlingMiddleware` + формат ошибки + каталог кодов → MASTER §9.1, §9.2
- [x] Step 9 [FULL] — CI: build + test + `dotnet list package --vulnerable`, zero-warnings → MASTER §11.8
- [x] Step 10 [BE] — тесты: логин (успех/неверный пароль/деактивирован), ротация refresh, повторное использование, seed идемпотентен (второй запуск ничего не создаёт), `ForcePasswordChange` блокирует запросы → MASTER §11.1, §5.27
- [ ] Step 11 [BOT] — регистрация бота у `@BotFather` (разовый шаг вне кода, делает Owner), токен → ENV *(отложено — см. §15)* — MASTER §10.0
- [x] Step 12 [BE] — FK constraints на все 26 сущностей: `HasOne`/`WithMany`/`HasForeignKey`
      в `Infrastructure/Persistence/Configurations/*.cs` для каждого `Guid`/`Guid?`
      столбца, который сейчас ссылается на другую сущность без реального FK
      (`WorkOrder.ObjectId`, `Brigade.BrigadirUserId` и т.д. — по одному на каждую
      сущность из MASTER §5), затем новая миграция (`dotnet tool run dotnet-ef migrations add
      AddForeignKeyConstraints`, review перед коммитом, не применять руками). Найдено
      при ревью `InitialCreate` (Step 10) — ни одна из 26 конфигураций не объявляет
      связь, в схеме нет ссылочной целостности на уровне БД вообще. Отдельный шаг,
      **до** Phase 1, потому что Phase 1 начинает писать реальные кросс-сущностные
      записи (`Worker.UserId`, `Brigade.BrigadirUserId`, `ProrabObjectAssignment`) —
      проще зафиксировать целостность до того, как появятся данные, которые могут
      её нарушать. Ahmad-owned (весь Domain/Infrastructure/Persistence, §2.0
      team-split) → MASTER §5, §6

## Phase 1 — Объекты и бригады
**Goal:** без объекта и бригады нечего назначать.

- [x] Step 1 [BE] — `Customer`, `ConstructionObject`, `EstimateItem` → MASTER §5.5, §5.9, §5.10
- [x] Step 2 [BE] — `Worker`: 18+ **на дату HireDate** (hard 400), `ShiftStartTime`, `UserId` nullable, PII-поля → MASTER §5.7, §8.3
- [x] Step 3 [BE] — `Brigade`, назначение бригадира (`Worker.UserId` ↔ `Brigade.BrigadirUserId`) → MASTER §5.6
- [x] Step 4 [BE] — `ProrabObjectAssignment` + фильтрация объектов по прорабу (дефолт: нет назначений = видит все) → MASTER §1.2, §11.5
- [x] Step 5 [BE] — `AdminAuditLog` + interceptor: смена роли, деактивация, `PayRate`, назначение бригадира → MASTER §5.16, §11.7
- [x] Step 6 [BE] — маскирование `Document*` по ролям (разные Response DTO, не CSS) → MASTER §11.6, §12
- [x] Step 7 [BE] — тесты: 18+ (ровно 18 / на день меньше / задним числом), изоляция прораба по объектам → MASTER §8.3, §1.2

## Phase 2 — Наряды и задачи (ядро)
**Goal:** ради этого всё остальное. Здесь же входит бот — без него бригадир не может ничего.

- [x] Step 1 [BE] — `WorkOrder` + state machine + `Code` (`BR-{N}` per company) + `xmin` → MASTER §5.11, §7.1
- [x] Step 2 [BE] — `IndividualTask` + state machine (`AssignedToWorkerId` в своей бригаде) → MASTER §5.14, §7.2, §8.5
- [x] Step 3 [BE] — `TaskLog` **в той же транзакции**, что переход → MASTER §5.15, §7.1
- [x] Step 4 [BE] — `WorkOrderProgress`, upload фото (подписанный URL, allow-list MIME) → MASTER §5.12, §11.9
- [x] Step 5 [BE] — SignalR-хаб, группы из claims (не из клиента), события **после** `SaveChanges` → MASTER §9.4
- [ ] Step 6 [BOT] — `TelegramLinkCode` (TTL 15мин, хеш, одноразовый), `TelegramLink`, `/start CODE` *(отложено — см. §15)* → MASTER §5.25, §10.2
- [ ] Step 7 [BOT] — **secret_token на webhook** + **идемпотентность через `INSERT` в `TelegramUpdateLog`** + всегда 200 *(отложено — см. §15)* → MASTER §5.26, §10.3
- [ ] Step 8 [BOT] — «Мои наряды»: отметка выполнения (валидация остатка), фото, отправка на проверку *(отложено — см. §15)* → MASTER §10.4
- [ ] Step 9 [FULL] — тесты: все переходы (разрешённые + запрещённые), изоляция бригады (404), идемпотентность бота → MASTER §7.1, §7.2, §10.3

## Phase 3 — Явка, отсутствия, премии
**Goal:** зависит от `Worker` (Phase 1) и инфраструктуры статусов (Phase 2).

- [x] Step 1 [BE] — `Timesheet` + `LateMinutes` (computed при check-in, `PlannedStartTime` — снимок, `null` при незаданном `ShiftStartTime`) → MASTER §5.20, §8.1
- [x] Step 2 [BE] — `AbsenceRecord`: день с отсутствием не даёт `LateMinutes` и не прогул, конфликт с `Timesheet` → 400 → MASTER §5.21, §8.9
- [ ] Step 3 [BE] — `Worker.TerminationDate` + lifecycle увольнения (открытые задачи, доли, финальный расчёт) → MASTER §8.9
- [ ] Step 4 [BOT] — «Моя бригада»: check-in/check-out за бригаду и себя *(отложено — см. §15)* → MASTER §10.4
- [ ] Step 5 [BOT] — фоновое напоминание о незакрытой смене (20:00 по настройке) *(отложено — см. §15)* → MASTER §8.4
- [ ] Step 6 [BOT] — «Личные задачи»: создание себе/рабочим, закрытие, `CompletedEarly` → предложение премии (черновик) *(отложено — см. §15)* → MASTER §8.7, §10.4
- [x] Step 7 [BE] — тесты: `LateMinutes` на числовых примерах §8.1, grace-период, отсутствие вместо прогула → MASTER §8.1, §8.9

## Phase 4 — Материалы
**Goal:** независима от Phase 3, идёт после ядра.

- [ ] Step 1 [BE] — `MaterialConsumptionReport` (уникальность на день → update, не дубль) → MASTER §5.18, §8.2
- [ ] Step 2 [BE] — `MaterialRequest` + `QtyDelivered` + статус `PartiallyDelivered` → MASTER §5.17, §7.3
- [ ] Step 3 [BE] — `MaterialDelivery` + **авто-переход** заявки по `Σ Qty` (частичная/полная) → MASTER §8.2, §7.3
- [ ] Step 4 [BE] — `MaterialShortageReported` при `QtyShortage > 0` — сразу, не дожидаясь заявки → MASTER §8.2
- [ ] Step 5 [BOT] — «Материалы»: дневной отчёт → при нехватке предложение заявки одним действием *(отложено — см. §15)* → MASTER §10.4
- [ ] Step 6 [BE] — тесты: авто-переход при частичной/полной/пере-поставке → MASTER §8.2

## Phase 5 — Зарплата
**Goal:** зависит от всего. Здесь считаются реальные деньги реальных людей.

- [ ] Step 1 [BE] — `WorkOrderPayoutShare` + инвариант `Σ SharePercent = 100` (проверка набора разом, не построчно) → MASTER §5.13, §1.1
- [ ] Step 2 [BOT] — флоу распределения долей при закрытии наряда (остаток, блок при ≠100%) *(отложено — см. §15)* → MASTER §10.4
- [ ] Step 3 [BE] — **`CalculatedAmount`**: Hourly (только принятые табели) и Piecework (факт × доля) + оплачиваемые отсутствия → MASTER §8.0
- [ ] Step 4 [BE] — `LatenessDeductionAmount` за период → MASTER §8.1
- [ ] Step 5 [BE] — подтверждение премии (`BonusApprovedByUserId`) → `BonusAmount` в расчёт по `CompletedAt` → MASTER §8.7
- [ ] Step 6 [BE] — `PayrollAdvance` + `AdvanceDeductedAmount` + `SettledInPayrollEntryId` → MASTER §5.23, §8.8
- [ ] Step 7 [BE] — `PayrollEntry.Approve()`: `FinalAmount` = Calculated − Lateness + Bonus − Advance ± Adjustment. **Отрицательный результат допустим**, не обнулять → MASTER §8.8
- [ ] Step 8 [BE] — фоновая задача: черновики за период + алерт, если не сформировалась → MASTER §11.8
- [ ] Step 9 [BE] — `GET /objects/{id}/cost-breakdown`: материалы + **ФОТ** (Piecework прямо, Hourly пропорционально часам) → MASTER §8.10
- [ ] Step 10 [BE] — тесты на числовых примерах §8.0/§8.1/§8.8: Hourly 7040, вычет 43.33, аванс → итог 4196.67 → MASTER §8.0, §8.8

## Phase 6 — Полировка и запуск
**Goal:** обзорный слой + всё, без чего нельзя пускать на реальные деньги.

- [ ] Step 1 [BE] — `GET /dashboard/work-status` (агрегат `WorkOrder` + `IndividualTask`) → MASTER §8.6
- [ ] Step 2 [BE] — фоновая задача просрочки + уведомления → MASTER §9.4
- [ ] Step 3 [BOT] — уведомления всем ролям (маршрутизация по `TelegramLink`) *(отложено — см. §15)* → MASTER §10.3
- [ ] Step 4 [BOT] — язык `tg` + `/language`, `.resx` ресурсы *(отложено — см. §15)* → MASTER §10.6
- [ ] Step 5 [BE] — `/auth/forgot-password` + `/auth/reset-password` (`PasswordResetToken`, TTL 1ч, отзыв всех refresh) → MASTER §5.4, §11.2
- [ ] Step 6 [BE] — бэкапы (`pg_dump` + WAL, retention 30д, вне сервера) + **проверка восстановления** → MASTER §11.8
- [ ] Step 7 [BE] — мониторинг: алерты на 5xx, пачку неудачных логинов, упавшую фоновую задачу → MASTER §11.8
- [ ] Step 8 [FULL] — **`security` полный проход по §11 + пентест — до первого реального использования на деньгах** → MASTER §11
- [ ] Step 9 [FULL] — `docs` — сверка MASTER.md с реальным кодом перед запуском → MASTER §16

---

## Открытые вопросы (MASTER §15) — НЕ решать самому

Если шаг упирается в один из них  — реализуй дефолт, оставь настраиваемым, отметь здесь:

- [ ] №6 Переработка — вне MVP (нет `ShiftEndTime` и нормы часов). Решить после Phase 3.
- [ ] №8 SMS-провайдер для сброса пароля — пока Telegram + ручной сброс через Owner (по API, панели нет).
- [ ] №9 Fallback без Telegram у бригадира — пока прораб отмечает через API напрямую (`EnteredManually`), без встроенной панели.
- [ ] №7 История ставок (`WorkerPayRateHistory`) — не храним, смена действует с даты изменения.
- [ ] Telegram-бот отложен, дата возврата не определена — решение пользователя
      (2026-07-18). Backend-шаги продолжаются без него; все `[BOT]`-шаги в
      чеклисте выше помечены `*(отложено — см. §15)*`, но не удалены и не
      вычеркнуты — вернёмся к ним отдельным решением, не по умолчанию.
