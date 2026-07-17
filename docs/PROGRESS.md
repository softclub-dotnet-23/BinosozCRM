# PROGRESS — БригадаCRM

Каждый шаг ссылается на раздел `docs/MASTER.md` — читать нужно **только его**, не весь файл.
Теги: `[BE]` backend · `[FE]` React · `[BOT]` Telegram · `[FULL]` несколько сразу.

## Current Status
**Phase:** 0 — Foundation
**Last completed:** Phase 0, Step 8
**Next step:** Phase 0, Step 9 (React scaffold)
**Build:** clean, 0 warnings (`dotnet build backend.slnx`)
**Tests:** — (Step 11)
**Updated:** 2026-07-17

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
config (empty by default, not a wildcard) — `appsettings.json` has a
`CHANGE_ME` placeholder for the real panel origin, `appsettings.Development.json`
allows `http://localhost:5173` (Vite dev server) so local frontend dev isn't
blocked. Verified with a throwaway TestServer check standing in a fake failing
health check for Postgres: `/health` stays 200 while it's failing,
`/health/ready` correctly returns 503; an allowed `Origin` gets
`Access-Control-Allow-Origin` echoed back, a disallowed one gets no CORS
header at all (browser blocks it client-side); all four security headers
present on a plain response.

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

Role-based HTTP **authorization** (`[Authorize(Roles=...)]` on non-auth
endpoints) is still pending — no other endpoints exist yet to authorize.
`ExceptionHandlingMiddleware`/full §9.2 error catalogue is Step 8; until then
`Api/Common/ResultExtensions.cs` maps only the auth error codes.

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
- [ ] Step 9 [FE] — React каркас (Vite/TS), protected routes по роли, страница логина, экран принудительной смены пароля, Axios + JWT-интерцептор → MASTER §13.1
- [ ] Step 10 [FULL] — CI: build + test + `dotnet list package --vulnerable`, zero-warnings → MASTER §11.8
- [ ] Step 11 [BE] — тесты: логин (успех/неверный пароль/деактивирован), ротация refresh, повторное использование, seed идемпотентен (второй запуск ничего не создаёт), `ForcePasswordChange` блокирует запросы → MASTER §11.1, §5.27
- [ ] Step 12 [BOT] — регистрация бота у `@BotFather` (разовый шаг вне кода, делает Owner), токен → ENV → MASTER §10.0

## Phase 1 — Объекты и бригады
**Goal:** без объекта и бригады нечего назначать.

- [ ] Step 1 [BE] — `Customer`, `ConstructionObject`, `EstimateItem` → MASTER §5.5, §5.9, §5.10
- [ ] Step 2 [BE] — `Worker`: 18+ **на дату HireDate** (hard 400), `ShiftStartTime`, `UserId` nullable, PII-поля → MASTER §5.7, §8.3
- [ ] Step 3 [BE] — `Brigade`, назначение бригадира (`Worker.UserId` ↔ `Brigade.BrigadirUserId`) → MASTER §5.6
- [ ] Step 4 [BE] — `ProrabObjectAssignment` + фильтрация объектов по прорабу (дефолт: нет назначений = видит все) → MASTER §1.2, §11.5
- [ ] Step 5 [BE] — `AdminAuditLog` + interceptor: смена роли, деактивация, `PayRate`, назначение бригадира → MASTER §5.16, §11.7
- [ ] Step 6 [BE] — маскирование `Document*` по ролям (разные Response DTO, не CSS) → MASTER §11.6, §12
- [ ] Step 7 [FE] — CRUD объектов/заказчиков/сметы по `docs/MASTER.md` §14 (не временная вёрстка) → MASTER §13.4, §14
- [ ] Step 8 [FE] — CRUD бригад, состав, валидация 18+ на клиенте с показом возраста → MASTER §13.4
- [ ] Step 9 [FULL] — тесты: 18+ (ровно 18 / на день меньше / задним числом), изоляция прораба по объектам → MASTER §8.3, §1.2

## Phase 2 — Наряды и задачи (ядро)
**Goal:** ради этого всё остальное. Здесь же входит бот — без него бригадир не может ничего.

- [ ] Step 1 [BE] — `WorkOrder` + state machine + `Code` (`BR-{N}` per company) + `xmin` → MASTER §5.11, §7.1
- [ ] Step 2 [BE] — `IndividualTask` + state machine (`AssignedToWorkerId` в своей бригаде) → MASTER §5.14, §7.2, §8.5
- [ ] Step 3 [BE] — `TaskLog` **в той же транзакции**, что переход → MASTER §5.15, §7.1
- [ ] Step 4 [BE] — `WorkOrderProgress`, upload фото (подписанный URL, allow-list MIME) → MASTER §5.12, §11.9
- [ ] Step 5 [BE] — SignalR-хаб, группы из claims (не из клиента), события **после** `SaveChanges` → MASTER §9.4
- [ ] Step 6 [BOT] — `TelegramLinkCode` (TTL 15мин, хеш, одноразовый), `TelegramLink`, `/start CODE` → MASTER §5.25, §10.2
- [ ] Step 7 [BOT] — **secret_token на webhook** + **идемпотентность через `INSERT` в `TelegramUpdateLog`** + всегда 200 → MASTER §5.26, §10.3
- [ ] Step 8 [BOT] — «Мои наряды»: отметка выполнения (валидация остатка), фото, отправка на проверку → MASTER §10.4
- [ ] Step 9 [FE] — 4 представления (Board/List/Calendar/Table), Kanban drag&drop **с откатом** при отказе backend → MASTER §13.3
- [ ] Step 10 [FE] — правая панель деталей, Accept/Reject **не в DOM** вне `OnReview`, Reject с обязательной причиной → MASTER §13.4
- [ ] Step 11 [FULL] — тесты: все переходы (разрешённые + запрещённые), изоляция бригады (404), идемпотентность бота → MASTER §7.1, §7.2, §10.3

## Phase 3 — Явка, отсутствия, премии
**Goal:** зависит от `Worker` (Phase 1) и инфраструктуры статусов (Phase 2).

- [ ] Step 1 [BE] — `Timesheet` + `LateMinutes` (computed при check-in, `PlannedStartTime` — снимок, `null` при незаданном `ShiftStartTime`) → MASTER §5.20, §8.1
- [ ] Step 2 [BE] — `AbsenceRecord`: день с отсутствием не даёт `LateMinutes` и не прогул, конфликт с `Timesheet` → 400 → MASTER §5.21, §8.9
- [ ] Step 3 [BE] — `Worker.TerminationDate` + lifecycle увольнения (открытые задачи, доли, финальный расчёт) → MASTER §8.9
- [ ] Step 4 [BOT] — «Моя бригада»: check-in/check-out за бригаду и себя → MASTER §10.4
- [ ] Step 5 [BOT] — фоновое напоминание о незакрытой смене (20:00 по настройке) → MASTER §8.4
- [ ] Step 6 [BOT] — «Личные задачи»: создание себе/рабочим, закрытие, `CompletedEarly` → предложение премии (черновик) → MASTER §8.7, §10.4
- [ ] Step 7 [FE] — экран Явка: `LateMinutes` с тултипом-расшифровкой, `EnteredManually` иконкой, отсутствия своим цветом → MASTER §13.4, §14.3
- [ ] Step 8 [FE] — блок подтверждения премии в правой панели + предупреждение «не войдёт без подтверждения» → MASTER §13.4, §14.3
- [ ] Step 9 [FULL] — тесты: `LateMinutes` на числовых примерах §8.1, grace-период, отсутствие вместо прогула → MASTER §8.1, §8.9

## Phase 4 — Материалы
**Goal:** независима от Phase 3, идёт после ядра.

- [ ] Step 1 [BE] — `MaterialConsumptionReport` (уникальность на день → update, не дубль) → MASTER §5.18, §8.2
- [ ] Step 2 [BE] — `MaterialRequest` + `QtyDelivered` + статус `PartiallyDelivered` → MASTER §5.17, §7.3
- [ ] Step 3 [BE] — `MaterialDelivery` + **авто-переход** заявки по `Σ Qty` (частичная/полная) → MASTER §8.2, §7.3
- [ ] Step 4 [BE] — `MaterialShortageReported` при `QtyShortage > 0` — сразу, не дожидаясь заявки → MASTER §8.2
- [ ] Step 5 [BOT] — «Материалы»: дневной отчёт → при нехватке предложение заявки одним действием → MASTER §10.4
- [ ] Step 6 [FE] — два потока рядом (отчёты | заявки), бейдж «повторяется», прогресс частичной поставки → MASTER §13.4, §14.3
- [ ] Step 7 [FULL] — тесты: авто-переход при частичной/полной/пере-поставке → MASTER §8.2

## Phase 5 — Зарплата
**Goal:** зависит от всего. Здесь считаются реальные деньги реальных людей.

- [ ] Step 1 [BE] — `WorkOrderPayoutShare` + инвариант `Σ SharePercent = 100` (проверка набора разом, не построчно) → MASTER §5.13, §1.1
- [ ] Step 2 [BOT] — флоу распределения долей при закрытии наряда (остаток, блок при ≠100%) → MASTER §10.4
- [ ] Step 3 [BE] — **`CalculatedAmount`**: Hourly (только принятые табели) и Piecework (факт × доля) + оплачиваемые отсутствия → MASTER §8.0
- [ ] Step 4 [BE] — `LatenessDeductionAmount` за период → MASTER §8.1
- [ ] Step 5 [BE] — подтверждение премии (`BonusApprovedByUserId`) → `BonusAmount` в расчёт по `CompletedAt` → MASTER §8.7
- [ ] Step 6 [BE] — `PayrollAdvance` + `AdvanceDeductedAmount` + `SettledInPayrollEntryId` → MASTER §5.23, §8.8
- [ ] Step 7 [BE] — `PayrollEntry.Approve()`: `FinalAmount` = Calculated − Lateness + Bonus − Advance ± Adjustment. **Отрицательный результат допустим**, не обнулять → MASTER §8.8
- [ ] Step 8 [BE] — фоновая задача: черновики за период + алерт, если не сформировалась → MASTER §11.8
- [ ] Step 9 [BE] — `GET /objects/{id}/cost-breakdown`: материалы + **ФОТ** (Piecework прямо, Hourly пропорционально часам) → MASTER §8.10
- [ ] Step 10 [FE] — экран Зарплата: чек-расшифровка, табличные цифры, отрицательный итог красным с пояснением → MASTER §13.4, §14.3
- [ ] Step 11 [FE] — блок распределения сдельщины (сумма % крупно, красная при ≠100) → MASTER §13.4
- [ ] Step 12 [FULL] — тесты на числовых примерах §8.0/§8.1/§8.8: Hourly 7040, вычет 43.33, аванс → итог 4196.67 → MASTER §8.0, §8.8

## Phase 6 — Полировка и запуск
**Goal:** обзорный слой + всё, без чего нельзя пускать на реальные деньги.

- [ ] Step 1 [BE] — `GET /dashboard/work-status` (агрегат `WorkOrder` + `IndividualTask`) → MASTER §8.6
- [ ] Step 2 [FE] — Kanban на дашборде, графики (закрытые наряды, топ нехваток) → MASTER §13.4
- [ ] Step 3 [BE] — фоновая задача просрочки + уведомления → MASTER §9.4
- [ ] Step 4 [BOT] — уведомления всем ролям (маршрутизация по `TelegramLink`) → MASTER §10.3
- [ ] Step 5 [BOT] — язык `tg` + `/language`, `.resx` ресурсы → MASTER §10.6
- [ ] Step 6 [BE] — `/auth/forgot-password` + `/auth/reset-password` (`PasswordResetToken`, TTL 1ч, отзыв всех refresh) → MASTER §5.4, §11.2
- [ ] Step 7 [FULL] — бэкапы (`pg_dump` + WAL, retention 30д, вне сервера) + **проверка восстановления** → MASTER §11.8
- [ ] Step 8 [FULL] — мониторинг: алерты на 5xx, пачку неудачных логинов, упавшую фоновую задачу → MASTER §11.8
- [ ] Step 9 [FULL] — **`security` полный проход по §11 + пентест — до первого реального использования на деньгах** → MASTER §11
- [ ] Step 10 [FULL] — `docs` — сверка MASTER.md с реальным кодом перед запуском → MASTER §18

---

## Открытые вопросы (MASTER §17) — НЕ решать самому

Если шаг упирается в один из них — реализуй дефолт, оставь настраиваемым, отметь здесь:

- [ ] №6 Переработка — вне MVP (нет `ShiftEndTime` и нормы часов). Решить после Phase 3.
- [ ] №8 SMS-провайдер для сброса пароля — пока Telegram + ручной сброс через Owner.
- [ ] №9 Fallback без Telegram у бригадира — пока прораб отмечает через панель (`EnteredManually`).
- [ ] №7 История ставок (`WorkerPayRateHistory`) — не храним, смена действует с даты изменения.
