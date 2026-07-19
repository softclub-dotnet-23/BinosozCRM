# PROGRESS — БригадаCRM

Каждый шаг ссылается на раздел `docs/MASTER.md` — читать нужно **только его**, не весь файл.
Теги: `[BE]` backend · `[BOT]` Telegram · `[FULL]` несколько сразу (backend + Telegram).

## Current Status
**Phase:** 3 — Явка, отсутствия, премии
**Last completed:** Phase 3, Step 3 (Zone B) — `Worker.TerminationDate` +
lifecycle увольнения
**Next step:** Phase 3, Steps 4-6 [BOT] отложены (см. §15) — переходим к
Step 7 [BE] Zone B — тесты: `LateMinutes` на числовых примерах §8.1,
grace-период, отсутствие вместо прогула → MASTER §8.1, §8.9 (no bot
dependency, unlike Phase 2's Step 9 — safe to do now)
**Build:** clean, 0 warnings (`dotnet build backend.slnx`)
**Tests:** `Tests/Api.IntegrationTests` — **41/41 passing**, confirmed for
real against Testcontainers/Postgres
**Updated:** 2026-07-19

See `docs/phase-summaries/Phase1-summary.md` for what Phase 1 built as a whole.

**Step 3 (Zone B) — `Worker.TerminationDate` + lifecycle увольнения.**
Retrofitted two Phase 1 Step 2 files — `IndividualTask` didn't exist back
then, so this guard genuinely couldn't have been built earlier:
`TerminateWorkerCommand` now blocks termination if the worker has an open
`IndividualTask` (new code `WORKER_HAS_OPEN_TASKS`); `ListBrigadeWorkersQuery`
now filters out `IsActive == false`, so a terminated worker "disappears
from active lists" (§8.9 point 5) without touching `IsDeleted`.

**§8.9 lists 5 termination points — only 2 are actually buildable right
now:** open-task block (done) and `IsActive=false`/roster filtering
(done). **Not implemented, flagged not skipped:** early `PayrollEntry`
formation for the period up to `TerminationDate`, and outstanding
`PayrollAdvance` rollup into that final calc — both need `PayrollEntry`'s
Application layer, which doesn't exist yet (Phase 5). Terminating a worker
today does **not** produce a final payroll draft. Also: §8.9's "closes or
reassigns" escape hatch for the open task only has "closes" (`Complete`)
actually built — no `ReassignIndividualTaskCommand` exists yet.

Verified with a throwaway check against real Postgres (4/4, deleted
after): termination succeeds with no open tasks; blocked with one open
(`WORKER_HAS_OPEN_TASKS`); succeeds once that task is completed;
terminated worker vanishes from the brigade roster. Full suite: 41/41, no
regressions.

**Step 2 (Zone B) — `AbsenceRecord`.**
`Application/AbsenceRecords/` — `CreateAbsenceRecordCommand` (Owner/Prorab/
Accountant, never Brigadir — §8.9: "нужен документ/решение"), List/Get.
Creation *is* the approval decision — `Approve()` called immediately by the
creator, since §9.4 lists no separate approve endpoint for this entity
(unlike `Timesheet`). Optional `Document` upload reuses the exact
`IPhotoStorageService`/signed-URL mechanism from `WorkOrderProgress` (§8.9:
"тот же механизм"). **Limitation, flagged not fixed:** allow-list is still
image-only (jpeg/png/webp) — a real medical certificate might be a PDF;
widening the allow-list is a deliberate call, not made here.

Also retrofitted Step 1's own `CheckInTimesheetCommand`/
`CreateManualTimesheetCommand`: §8.9's "Пересечение с `Timesheet` ...
конфликт, 400 ... не угадывать" is bidirectional — Step 1 only had the
forward check (creating an absence while a timesheet already exists); now
both directions reject with `TIMESHEET_ABSENCE_CONFLICT`, whichever record
is attempted second, regardless of order.

Verified with a throwaway check against real Postgres (6/6, deleted
after): create succeeds and auto-approves; forward conflict rejected;
**reverse conflict** (check-in against an existing `AbsenceRecord`)
rejected — the case Step 1 alone would have missed; document upload
round-trips storage-key → signed-URL; `DateTo < DateFrom` and `Reason`
length validation. Full suite: 41/41, no regressions.

**Step 1 (Zone B) — `Timesheet` + `LateMinutes`.**
`Application/Timesheets/` — `CheckInTimesheetCommand` (Brigadir, own-brigade
worker only), `CheckOutTimesheetCommand`, `CreateManualTimesheetCommand`
(Prorab+, `EnteredManually=true` — the no-Telegram fallback for open
question №9), `ApproveTimesheetCommand`, List/Get with Prorab-object /
Brigadir-own-brigade isolation. `Api/Controllers/TimesheetsController.cs`
— every route is literally named in §9.4, no inference needed this step.
`Timesheet` Domain entity + config (incl. the `LateMinutes` formula itself,
`CheckIn`/`CheckOut`/`Approve`) already existed from Phase 0 — this step is
Application/Api only. "Already checked in" reuses the `(WorkerId, Date)`
DB uniqueness constraint directly rather than a separate flag.

Verified with a throwaway check against real Postgres (7/7, deleted after):
both §8.1 worked numeric examples match exactly (15min late/grace=0 →
`LateMinutes=15`; 40min late/grace=5 → `35`); grace exceeding lateness
clamps to 0, not negative; `LateMinutes` is `null` (not `0`) when
`Worker.ShiftStartTime` is unset, confirmed the DTO doesn't coalesce that
away; double check-in same day → `TIMESHEET_ALREADY_CHECKED_IN`;
cross-brigade check-in → `WORKER_NOT_FOUND` (404, not 403); `CheckOut`
computes `HoursWorked`. Real permanent tests are Step 7's job (mirrors
Phase 2 Step 9's split), not written now. Full suite: 41/41, no regressions.

**Step 9a (Zone A) — WorkOrder/IndividualTask state machine + brigade-isolation tests.**
Split the same way Phase 1 Step 7 was — the BE-testable half now, the
bot-idempotency half (§10.3) parked alongside Steps 6-8's deferral, not
"soon", since there's no bot to test idempotency against until that
deferral lifts. `Tests/Api.IntegrationTests/WorkOrderStateMachineTests.cs`
(7 tests) + `IndividualTaskStateMachineTests.cs` (6 tests), real
Testcontainers/Postgres, no throwaways this time — this is exactly the
step where the state-machine coverage becomes permanent: full happy path
New→Assigned→InProgress→OnReview→Accepted→Closed; the Reject→Rework→
resubmit cycle; a table-driven check that all 6 non-Assign transitions
fail cleanly (`Result.Failure`, never an exception) from a freshly-created
`WorkOrder` still in `New`; `Submit` blocked with no `WorkOrderProgress`;
`Reject` without a reason fails FluentValidation; brigade isolation on
both entities (a Brigadir from a different brigade gets `*_NOT_FOUND`, 404
not 403); Prorab-object isolation on `Assign`; `IndividualTask`'s
`CompletedEarly` true/false on both sides of `DueAt`; double-`Start`
rejected; `Complete`-before-`Start` rejected.

Also recovered: this step had been started and interrupted in an earlier
session (background test run left with no completion record) — found the
three files already drafted on disk, verified them properly (full build,
ran them against real Postgres, then the full suite) rather than trusting
they were correct as found. All correct as-is; no changes needed.
`NoOpRealtimeNotifier.cs` (public, shared) added alongside them — every
WorkOrder transition handler needs an `IRealtimeNotifier` since Step 5,
and SignalR delivery itself isn't what these tests are checking.

Full suite: **41/41** (23 previous + 18 new), no regressions.

**Step 5 (Zone A) — SignalR hub.**
`Api/Hubs/WorkOrdersHub.cs` (`/hubs/work-orders`, `[Authorize]`): group
membership decided entirely server-side at connect time from JWT claims
(`company:{companyId}` for everyone, `brigade:{brigadeId}` additionally for
Brigadir via a `Worker.UserId` lookup) — no hub method exists for a client
to request a group, satisfying "группы из claims, никогда из клиентского
ввода" by construction, not by convention. `Application/Common/Interfaces/
IRealtimeNotifier.cs` + `Api/Hubs/SignalRRealtimeNotifier.cs` keep SignalR
out of Application (same reasoning as `IFormFile` in Step 4). Wired into
`WorkOrderTransitionHelper` — fires `WorkOrderStatusChanged` strictly after
`SaveChangesAsync` succeeds, never on a failed transition. All 7 WorkOrder
transition handlers now take `IRealtimeNotifier` (mechanical constructor
change only, no command-shape change — nothing for Shahrom's future bot
code to worry about). `Program.cs` also accepts the JWT via
`?access_token=` query string, but only for `/hubs` paths — browsers can't
attach an `Authorization` header to a WebSocket upgrade request.

**Bug caught before it shipped:** the first draft of the Brigadir
brigade-lookup in `OnConnectedAsync` used the ambient `context.Workers`
query (global `CompanyId` filter → `ICurrentUserService` →
`IHttpContextAccessor`). `IHttpContextAccessor` isn't reliably populated
through a Hub's connection lifecycle the way it is for a normal HTTP
request — would have silently broken Brigadir's brigade-group join (fails
closed, not a security hole, but a real functionality bug). Fixed: reads
`company_id` directly off `Context.User`'s claims, uses
`.IgnoreQueryFilters()` with an explicit `CompanyId` match instead of
depending on ambient state.

Only `WorkOrderStatusChanged` fires for real — `AttendanceMarked`/
`MaterialShortageReported`/`BonusPendingApproval`/`PayrollDraftReady` (also
named in §9.4) belong to entities with no write path yet (Phase 3-5).

Verified with a throwaway check against real Postgres (2/2, deleted after):
a successful transition notifies exactly once with the correct
company/brigade IDs, and the DB change is already committed/visible by the
time the notifier fires (confirms "after SaveChanges", not before); a
failed/invalid transition never notifies. Full-stack SignalR wire testing
(a real WebSocket connection, actual group delivery) wasn't attempted —
this project has avoided `WebApplicationFactory`/`TestServer` since Step
10, and that's what real end-to-end hub testing would need. Full suite:
23/23, no regressions.

**Step 4 (Zone A) — `WorkOrderProgress`, upload фото.**
No storage backend is named anywhere in MASTER (§11.9 only specifies
properties: signed URL, expiring, size-limited, allow-list MIME, outside
the web root) — resolved by explicit user decision: **local filesystem +
self-issued HMAC-signed URLs**, no cloud dependency added. Key design
choice: the DB (`WorkOrderProgress.PhotoUrls`, jsonb) stores stable storage
*keys*, not literal signed URLs — a signed URL saved permanently would go
dead once its expiry passed, so `WorkOrderProgressDto` mints a fresh signed
URL on every read instead (`Application/Common/Interfaces/
IPhotoStorageService.cs`, `Infrastructure/Storage/LocalPhotoStorageService.cs`).
`PhotoStorage:SigningKey` follows the exact `Jwt:SecretKey` pattern —
validated ≥32 bytes at startup (`ValidateOnStart`), never committed.

`SubmitWorkOrderProgressCommand`: Brigadir, own brigade only, only while
`WorkOrder.Status == InProgress` (§7.1) — new code `WORK_ORDER_NOT_IN_PROGRESS`,
distinct from `WORK_ORDER_INVALID_TRANSITION` since reporting progress
doesn't itself change `WorkOrder.Status`. Every photo's MIME/size validated
before any of them are saved (no partial-save-then-fail). `PhotosController`
(`GET /api/v1/photos/{key}?exp&sig`) is `[AllowAnonymous]` — the signature
itself is the access control (needed for `<img>` tags/bot-embedded links
that can't carry a JWT); invalid or expired reads as a plain 404.

Verified with a throwaway check against real Postgres + a real temp
directory (6/6 passed, deleted after): full submit succeeds and `PhotoUrls`
round-trips correctly through the `jsonb` column (genuinely uncertain
going in whether `IReadOnlyCollection<string>` needed an explicit
converter — confirmed it doesn't); disallowed MIME and oversized photo
both rejected pre-save; submit blocked outside `InProgress`; signature
validation correctly catches tampering, expiry, and cross-key reuse; saved
bytes read back exactly. Full suite: 23/23.

**Flagged, not built:** no way to read `WorkOrderProgress` entries back
(quantities/photos/comments) — §9.4 only lists the `POST`. A Prorab
reviewing an `OnReview` work order currently has no way to see what was
actually reported before `Accept`/`Reject`. Needs a decision on whether a
`GET` belongs in a future step.

**Step 3 (Zone A) — `TaskLog` в той же транзакции, что переход.**
Write side was already fully done by Steps 1–2 (`TaskLogs.Add` exists in
exactly `WorkOrderTransitionHelper`/`IndividualTaskTransitionHelper`,
covering every status transition for both entities) — nothing new needed
there. What was actually missing: the read side §9.4 explicitly names,
`GET /work-orders/{id}/log` (`Prorab+, Brigadir(own)`). Built
`GetWorkOrderLogQuery`/`TaskLogDto`, same isolation as `GetWorkOrderQuery`.
No `/individual-tasks/{id}/log` exists in §9.4, so none was built.
Verified with a throwaway check against real Postgres (1/1, deleted after):
log entries return in chronological order; a Brigadir from a different
brigade gets `WORK_ORDER_NOT_FOUND` on the log endpoint too, matching the
work order itself. Full suite: 23/23, no regressions.

**Step 2 (Zone A) — `IndividualTask` + state machine.**
`Application/IndividualTasks/` (Create/List/Get + Start/Complete),
`IndividualTaskTransitionHelper` (same TaskLog+`xmin` pattern as
`WorkOrder`'s, TaskLog written now, not deferred). `Api/Controllers/
IndividualTasksController.cs`, all Brigadir-only per §9.4's literal
listing. Brigade isolation on Create (`AssignedToWorkerId.BrigadeId ==
creator.BrigadeId`, else `INDIVIDUAL_TASK_WRONG_BRIGADE`) and on every
read/transition (cross-brigade → `INDIVIDUAL_TASK_NOT_FOUND`, 404 not 403).

**Real bug caught and fixed as a refactor:** §5.14 says `IndividualTask
.Code` shares WorkOrder's exact per-company sequence — flagged in Step 1's
generator comment but left unaddressed there (only `WorkOrder` existed
yet). Left alone, this step would have silently produced duplicate `BR-N`
codes across the two entity types. Fixed by merging into `Application/
Common/BusinessCodeGenerator.cs` (queries both tables now), updating
`CreateWorkOrderCommand` to use it, deleting the old WorkOrder-only
generator. Verified directly: `WorkOrder` create → `BR-1`, `IndividualTask`
create right after → `BR-2`, no collision.

Also extracted `WorkOrderAccess`'s Brigadir-own-brigade lookup into shared
`Application/Common/BrigadirAccess.cs` (both entities needed the identical
check), updating all 4 existing `WorkOrder` call sites. Reran the full
prior suite after the refactor — 23/23, no regressions.

**Not this step's scope, flagged for whoever picks these up:**
`IndividualTask.ApproveBonus` (Domain, already written in Phase 0) doesn't
actually gate on `CompletedEarly`, even though `BONUS_NOT_ELIGIBLE`'s
catalog description says it should ("подтверждение премии на задаче без
CompletedEarly"). Not fixed now — bonus proposal is Phase 3 Step 6 (bot),
approval is Phase 5 Step 5 (payroll); this step never calls either method.

Verified with a throwaway check against real Postgres (5/5 passed, then
deleted): create succeeds/rejects correctly on brigade match; `Code`
sequencing confirmed shared with `WorkOrder` as above; full lifecycle
(Assigned→InProgress→Done) writes exactly 2 `TaskLog` rows;
`CompletedEarly` computes correctly (`DueAt` a day out, completed now →
`true`); cross-brigade access reads as 404. Full suite after cleanup:
23/23.

**Step 1 (Zone A) — `WorkOrder` + state machine + `Code` (`BR-{N}`) + `xmin`.**
`Application/WorkOrders/` (Create/List/Get + all 7 transitions: Assign,
Start, SubmitForReview, Accept, Reject, Rework, Close), `WorkOrderCodeGenerator`,
`WorkOrderAccess` (Brigadir-own-brigade lookup via `Worker.UserId`, reused
Prorab-object isolation), `WorkOrderTransitionHelper` (one place for both
`TaskLog` writing and `xmin` concurrency handling across all 7 transitions).
`Api/Controllers/WorkOrdersController.cs`.

**Rule 3 applied immediately, not deferred to Step 3** (user decision,
asked because PROGRESS.md's plan otherwise split "state machine" (this
step) from "TaskLog in the same transaction" (Step 3) — which would have
meant transitions existing without TaskLog for however long, exactly the
anti-pattern Rule 3 names). Every transition here writes `TaskLog` in the
same `SaveChanges` call as the status change. Step 3's remaining scope is
now really just `IndividualTask`'s side of `TaskLog`, once that entity gets
an Application layer in Step 2 — its PROGRESS.md description should be
read narrower than it currently reads.

**Flagged interpretations — not literal §9.4/§7.1 matches, worth a second look:**
1. `/assign`, `/start`, `/rework`, `/close` have no dedicated endpoint in
   §9.4's table (only `/submit`, `/accept`, `/reject` are named) — built
   anyway, since the state machine is unreachable without a way to leave
   `New`. Role-gated by inference from §12 (Owner/Prorab general CRUA →
   Assign/Start/Close; Rework → Brigadir, paired with submit as the other
   half of "redo and resubmit").
2. §7.1's `SubmitForReview` guard names `PayRateType=Piecework` "у бригады",
   but `PayRateType` is a `Worker` field (§5.7) — `Brigade` has no such
   field at all. Interpreted as: the 100%-share requirement applies only if
   the brigade has ≥1 Piecework worker; a purely-Hourly brigade skips it.
   Since `WorkOrderPayoutShare` has no write path before Phase 5, this
   currently means Submit is blocked for any Piecework-containing brigade
   until then — correct fail-closed behavior, not a workaround.
3. **Coordination point (team-split §4):** `SubmitWorkOrderForReviewCommand`,
   `AcceptWorkOrderCommand`, `RejectWorkOrderCommand` are the exact contracts
   the Telegram bot will call once Shahrom builds that flow. Shapes are
   fixed now (`WorkOrderId` [+ `Reason` for Reject]) — flag if they need to
   change once a real caller exists.

Verified with a throwaway check against real Postgres (6/6 passed, then
deleted): `Code` sequences `BR-1`/`BR-2` correctly per company; the full
happy path (New→Assigned→InProgress→OnReview→Accepted→Closed) writes
exactly 5 `TaskLog` rows in the right order; an invalid transition (e.g.
`Start` on a `New` order) returns `Result.Failure(WORK_ORDER_INVALID_TRANSITION)`,
confirmed not an unhandled exception; `Reject`'s reason lands in
`TaskLog.Comment`; a Brigadir from a different brigade attempting `Submit`
gets `WORK_ORDER_NOT_FOUND` (404, not 403, per §11.5/§4's "не видит чужие
бригады"); a genuine `xmin` race between two contexts throws
`DbUpdateConcurrencyException`, caught and mapped to `CONCURRENCY_CONFLICT`.
Full suite after cleanup: 23/23, no regressions. New error code:
`ESTIMATE_ITEM_NOT_FOUND` (404, same "referenced row missing" pattern as
`BRIGADE_NOT_FOUND`/`WORKER_NOT_FOUND`).

**Step 7 (Zone A half) — Prorab object-isolation tests.**
`Tests/Api.IntegrationTests/ProrabObjectIsolationTests.cs` (real
Testcontainers/Postgres), 5 tests against `ListConstructionObjectsQuery`/
`GetConstructionObjectQuery`: zero `ProrabObjectAssignment` rows → sees all
objects (§1.2's stated default); one assignment → strict allow-list, the
unassigned object is excluded from the list and returns
`PRORAB_NOT_ASSIGNED_TO_OBJECT` (404, not 403, per §11.5) on direct read;
Owner bypasses the filter entirely regardless of any Prorab's assignments.
Ran against real Docker/Postgres on the first try (available on this
machine by this point) — 5/5 passed, then full suite 23/23, no regressions.

**Step 7 (Zone B half) — Worker 18+ boundary tests.**
`Tests/Api.IntegrationTests/CreateWorkerCommandHandlerTests.cs` (real
Testcontainers/Postgres, not InMemory — matches project convention): exactly
18 on `HireDate` allowed; one day short rejected (`WORKER_UNDERAGE`); 19
today but 17 on a backdated `HireDate` rejected — the last one is the actual
point of §8.3 ("проверка на дату HireDate, не на сегодня"), not just a
restatement of the other two. `PostgresFixture` gained a
`CreateDbContext(ICurrentUserService)` overload — the existing zero-arg one
hardcodes a `CompanyId`-less current-user, which silently empties out any
query against `ICompanyOwned` entities (`Brigade`/`Worker`) via the global
filter, even though `Add`/`SaveChanges` are unaffected (why the earlier FK
tests didn't need this). Originally verified only via a throwaway InMemory
run for the date arithmetic (3/3 passed, deleted after) plus a confirmed
`DockerUnavailableException` (not a logic failure) against real Postgres,
since Docker wasn't running on this machine at the time. **Re-verified for
real once Docker became available**: full suite (all 18 tests, all 5
DB-backed classes — Login/Refresh/Seed/ForeignKeyConstraint/
CreateWorkerCommandHandler) run against real Testcontainers/Postgres,
18/18 passed, 0 failures. `.github/workflows/backend-ci.yml` already runs
this same full-suite `dotnet test` on every push/PR to `master`, on
`ubuntu-latest` (Docker preinstalled) — confirmed real, not just a build
step; no CI changes were needed.

**Step 6 (Zone B) — masking `Document*` by role.**
Api-layer only (`Api/Contracts/Workers/WorkerResponse.cs`,
`Api/Contracts/Workers/WorkerProrabResponse.cs`, `WorkersController.cs`).
Resolved, by user decision, a mismatch this step surfaced: MASTER §11.6
describes masking a document *number* ("Prorab видит маскированный
`****4567`"), but `Worker` (Ahmad's entity) has no document-number field —
only `DocumentType` (a category string) and `DocumentExpiryDate`. Decided:
treat §11.6's masking language as written for a field the schema never
actually got; with nothing left to mask, Prorab sees both `DocumentType` and
`DocumentExpiryDate` as-is. That leaves `PayRate`/`PayRateType` as the only
real per-role difference reachable through this controller (Owner sees it,
Prorab doesn't, per §12) — `WorkersController` now picks `WorkerResponse` vs
`WorkerProrabResponse` via `User.IsInRole("Prorab")` instead of returning the
raw `WorkerDto`. Accountant's §12 entitlement ("R (с PayRate)", full
`Document*`) still has no route in — §9.4 doesn't give Accountant a
Worker-reading endpoint; presumably arrives via Payroll (Phase 5).

Verified with a throwaway check that ran the *real* MediatR pipeline
(`services.AddApplication()` + `AddLogging()`, in-memory `ApplicationDbContext`)
through the actual `WorkersController`, with a fake `ClaimsPrincipal` role
claim driving `User.IsInRole` — not just a unit test of the mapping function.
3/3 passed (Owner gets `WorkerResponse` with `PayRate` populated; Prorab gets
`WorkerProrabResponse`, both for `Create` and paginated `List`), then
deleted, no `Directory.Packages.props`/csproj trace left.

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
- [x] Step 3 [BE] — `TaskLog` для `IndividualTask` **в той же транзакции**, что переход (`WorkOrder`'s side already done in Step 1 — see its note) → MASTER §5.15, §7.1, §7.2
- [x] Step 4 [BE] — `WorkOrderProgress`, upload фото (подписанный URL, allow-list MIME) → MASTER §5.12, §11.9
- [x] Step 5 [BE] — SignalR-хаб, группы из claims (не из клиента), события **после** `SaveChanges` → MASTER §9.4
- [ ] Step 6 [BOT] — `TelegramLinkCode` (TTL 15мин, хеш, одноразовый), `TelegramLink`, `/start CODE` *(отложено — см. §15)* → MASTER §5.25, §10.2
- [ ] Step 7 [BOT] — **secret_token на webhook** + **идемпотентность через `INSERT` в `TelegramUpdateLog`** + всегда 200 *(отложено — см. §15)* → MASTER §5.26, §10.3
- [ ] Step 8 [BOT] — «Мои наряды»: отметка выполнения (валидация остатка), фото, отправка на проверку *(отложено — см. §15)* → MASTER §10.4
- [x] Step 9a [BE] — тесты: все переходы (разрешённые + запрещённые), изоляция бригады (404) → MASTER §7.1, §7.2
- [ ] Step 9b [BOT] — тесты: идемпотентность бота *(отложено — см. §15, вместе со Steps 6-8)* → MASTER §10.3

## Phase 3 — Явка, отсутствия, премии
**Goal:** зависит от `Worker` (Phase 1) и инфраструктуры статусов (Phase 2).

- [x] Step 1 [BE] — `Timesheet` + `LateMinutes` (computed при check-in, `PlannedStartTime` — снимок, `null` при незаданном `ShiftStartTime`) → MASTER §5.20, §8.1
- [x] Step 2 [BE] — `AbsenceRecord`: день с отсутствием не даёт `LateMinutes` и не прогул, конфликт с `Timesheet` → 400 → MASTER §5.21, §8.9
- [x] Step 3 [BE] — `Worker.TerminationDate` + lifecycle увольнения (открытые задачи, доли, финальный расчёт) → MASTER §8.9
- [ ] Step 4 [BOT] — «Моя бригада»: check-in/check-out за бригаду и себя *(отложено — см. §15)* → MASTER §10.4
- [ ] Step 5 [BOT] — фоновое напоминание о незакрытой смене (20:00 по настройке) *(отложено — см. §15)* → MASTER §8.4
- [ ] Step 6 [BOT] — «Личные задачи»: создание себе/рабочим, закрытие, `CompletedEarly` → предложение премии (черновик) *(отложено — см. §15)* → MASTER §8.7, §10.4
- [ ] Step 7 [BE] — тесты: `LateMinutes` на числовых примерах §8.1, grace-период, отсутствие вместо прогула → MASTER §8.1, §8.9

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
