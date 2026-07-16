---
name: review
description: Full audit of the current diff (or a named file/topic) against docs/MASTER.md — architecture, security, money correctness. Read-only.
disable-model-invocation: true
argument-hint: "[file-or-topic]"
---

Read the MASTER.md sections relevant to the changed files before reviewing.
Check everything below that applies. Skip categories that don't apply rather
than forcing a finding.

## 1. Money correctness — HIGHEST PRIORITY (MASTER §8)
This is a payroll system. A wrong number here means a real person is underpaid.
- `CalculatedAmount`: Hourly counts ONLY approved timesheets (`ApprovedAt IS NOT NULL`)
- `CalculatedAmount`: Piecework uses `Σ ReportedQty` (fact), NOT `PlannedQty` (plan)
- `LateMinutes` computed once at check-in, never editable afterwards
- `LateMinutes` uses the day's `PlannedStartTime` snapshot, not current `Worker.ShiftStartTime`
- `LateMinutes = null` (not 0) when `ShiftStartTime` unset — silent zero hides a config error
- `Σ SharePercent = 100` validated over the whole set at once, not per row
- `FinalAmount = Calculated − Lateness + Bonus − Advance ± Adjustment` — negative allowed, never silently zeroed
- Bonus never reaches payroll without `BonusApprovedByUserId`
- Advance settled with `SettledInPayrollEntryId`, never double-counted
- No money math in React or the bot — they display API output only

## 2. Isolation / IDOR (MASTER §11.5) — three layers, only one is automatic
- `CompanyId` — global query filter, automatic. Verify it's actually applied to new entities
- `BrigadeId` for Brigadir — MANUAL in every handler. A miss here is 🔴
- `ProrabObjectAssignment` for Prorab — MANUAL, with "no assignments = all objects" default
- 404, never 403, on cross-brigade/cross-object access
- No DTO bound directly to a domain entity (mass assignment)

## 3. State machines (MASTER §7)
- No public enum setter anywhere — transitions only via aggregate methods
- Every transition validates FROM before applying TO
- `TaskLog` written in the SAME transaction, not after, not "later"
- Invalid transition → `Result.Failure`, not exception, not silent no-op
- `WorkOrder`: submit requires ≥1 progress AND (piecework) shares summing to 100
- `IndividualTask`: `CompletedEarly` computed at close, never recomputed later
- `MaterialRequest`: auto-transition on `Σ Delivery.Qty` vs `Qty`

## 4. Telegram (MASTER §10.3)
- `secret_token` verified on every update, with `FixedTimeEquals` not `==`
- Idempotency via `INSERT` + unique index catch — NOT `SELECT ... IF NOT EXISTS`
- Always returns 200, even on internal error
- Bot calls MediatR handlers directly, not HTTP to our own API

## 5. Architecture (MASTER §2)
- Dependency direction: Domain(0 deps) ← Application ← Infrastructure ← WebApi/Bot
- No business logic in controllers, React components, or bot handlers
- No EF entities across the API boundary — DTOs only
- No rule duplicated between Application and React/bot

## 6. Security (MASTER §11)
- Secrets from env/secret store, never committed
- Refresh token: hashed at rest, rotated, reuse revokes the whole chain
- `User.IsActive` checked per-request, not only at login
- PII (`BirthDate`, `Document*`, `Phone`) never in logs; masked per role in DTOs
- Photo upload: signed URL, size limit, MIME allow-list (not blacklist)

## 7. Data layer
- No N+1; `AsNoTracking()` on read-only
- Money `decimal(18,2)`, quantities `decimal(18,3)`, never float/double
- `Guid.CreateVersion7()` + `ValueGeneratedNever()`
- `xmin` on `WorkOrder`, `IndividualTask`, `PayrollEntry`
- Indexes match MASTER §6

## 8. Async
- `CancellationToken` on every public async method
- No `.Result`/`.Wait()`, no `async void` outside event handlers

## 9. API (MASTER §9)
- Pagination on list endpoints; sort/filter allow-listed
- Error shape and codes match §9.1–9.2 exactly

## 10. Frontend (MASTER §13) — if React files changed
- Server state in TanStack Query, UI state in Zustand — no duplication
- Accept/Reject absent from DOM outside `OnReview` (not CSS-hidden)
- Optimistic drag&drop with rollback on rejected transition
- `ru-RU` locale, tabular-nums on money columns
- Types generated from Swagger, not hand-written

## 11. Business rules not invented (MASTER §17)
- Nothing from the 12 open questions hardcoded — defaults implemented as `Company` config

## 12. Tests
- New logic has a behavior test
- Cross-brigade-denied test on brigade-scoped endpoints
- Money formulas tested against the numeric examples in MASTER §8.0/§8.1/§8.8

## Output

### ✅ Good
### 🟡 Suggestions
### 🔴 Must fix — file + line, what's wrong, the exact fix

### Summary
N files reviewed. N issues (N 🔴, N 🟡).

Target: $ARGUMENTS (blank = current uncommitted diff)
