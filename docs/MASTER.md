# БригадаCRM — MASTER PROMPT

**Один файл на весь проект: backend, Telegram-бот.** Свёрнуты `Brigadir1.zip` (4 промта), `Brigadir2.zip` (12 docs), ревью пробелов (11 пунктов) и всё, что найдено при финальном разборе. Это спецификация, не код — по ней пишет человек или AI-агент, шаг за шагом.

---

# ЧАСТЬ I. РАМКА

## 0. Что строим

CRM для реальной стройкомпании в Таджикистане: бригады на объектах, наряды, явка с автоматическим учётом опозданий, материалы, зарплата с вычетами/премиями/авансами. Не учебный проект — это деньги реальных людей, ошибка в расчёте зарплаты = человек недополучил.

**Две поверхности, один backend:**

| Поверхность | Кто | Почему именно так |
|---|---|---|
| Telegram-бот | Brigadir (и рабочие через него), уведомления остальным ролям | Объект = перчатки, солнце, плохой интернет. Telegram уже стоит, переживает разрывы связи, интерфейс знаком. SPA там — плохой инструмент |
| REST API + SignalR | Owner, Prorab, Accountant — напрямую (Postman/скрипты/внешний клиент), без встроенной веб-панели; и контракт для Telegram-бота | Веб-панель сознательно не строится в рамках этого проекта — решение принято явно, не по умолчанию. Один Application-слой, оба входа вызывают одни и те же handler'ы |

## 1. Три решения, принятых за тебя (ты просил — «думай и добавь»)

Каждое можно поменять — все три вынесены в конфиг/таблицу, а не зашиты в код.

### 1.1 Сдельщина делится вручную бригадиром

Наряд оплачивается на бригаду (`UnitPrice × Qty`), а зарплата — конкретному человеку. Три варианта дележа:

- *Поровну между отметившимися* — наказывает того, кто сделал больше.
- *Пропорционально часам* — это подмена смысла: сдельщина платит за **результат**, а не за присутствие. Иначе зачем вообще сдельщина, если считаем по часам.
- **Бригадир распределяет вручную при закрытии наряда** ← выбрано.

Почему: бригадир единственный, кто физически видел, кто сколько сделал. Защита от злоупотребления — не запрет, а прозрачность: доли видны прорабу, сумма долей обязана быть 100%, подтверждает прораб. Новая сущность — `WorkOrderPayoutShare` (§5).

Настраиваемо: `Company.PieceworkDistributionMode` — `Manual` (дефолт) / `EqualAmongContributors` / `ProportionalToHours`. Если через полгода бригадиры начнут злоупотреблять — переключается конфигом, код уже написан под все три.

### 1.2 Прорабов несколько — `ProrabObjectAssignment`

Сегодня прораб один и видит всё. Завтра их трое, и каждый видит чужие объекты — это уже утечка внутри компании. Разграничение задним числом на живых данных = миграция + переписывание каждого handler'а. Таблица сейчас — одна миграция и один `WHERE`.

Дефолт для одного прораба: если у Prorab **нет ни одной** записи в `ProrabObjectAssignment` — он видит все объекты компании (обратная совместимость, не ломает старт). Как только появилась хоть одна запись — работает строгий allow-list. Так один прораб работает без настройки, а несколько — сразу изолированы.

### 1.3 В MVP: аванс + больничный/отпуск. Переработка — вне MVP

- **Аванс** — в стройке норма. Без него бухгалтер ведёт тетрадь параллельно системе, и через месяц данные в системе неверны. `PayrollAdvance` (§5).
- **Больничный/отпуск** — без этого человек получает вычет за опоздание в день, когда лежал в больнице. `AbsenceRecord` (§5).
- **Переработка — сознательно вне MVP.** Не потому что не нужна, а потому что **нет данных**: есть `ShiftStartTime`, нет `ShiftEndTime` и нет нормы часов. Считать переработку не от чего. Сначала — `ShiftEndTime` + норма в Phase 3, формула — отдельным решением после. Зафиксировано в §15 как открытый вопрос (№6), не забыто.

---

## 2. Стек

| Слой | Технология |
|---|---|
| Backend | .NET 9 (LTS), C# 13 |
| Архитектура | Clean Architecture: `Domain → Application → Infrastructure → WebApi/TelegramBot` |
| CQRS | MediatR — каждая команда/запрос отдельным handler'ом |
| Ошибки | `Result<T>` для бизнес-ошибок, исключения — только непредвиденное |
| БД | PostgreSQL 16 + EF Core 9 (Npgsql) |
| Bot | Telegram.Bot, webhook |
| Auth | JWT (access 15 мин + refresh с ротацией), Argon2id |
| Real-time | SignalR, один хаб |
| Валидация | FluentValidation — на каждом request DTO с Phase 0 |
| Логи | Serilog — структурировано, без PII |
| Фон | Hangfire (или BackgroundService) — напоминания, черновики зарплаты, просрочка |
| Тесты | xUnit + FluentAssertions + Testcontainers |

---

## 3. C#/.NET — что реально используется и где

Не «мы знаем ООП», а конкретное место в этом проекте.

| Тема | Где | Зачем именно здесь |
|---|---|---|
| **Records** | Commands/Queries/DTO | команда не должна мутировать после создания |
| **Nullable reference types** | Везде (`<Nullable>enable</Nullable>`) | `Worker.UserId` nullable **специально** (только у бригадира) — компилятор отличает «нет значения» от «забыл проверить» |
| **Pattern matching / switch expressions** | State machines (`Status is not (Assigned or Accepted)`) | читается как бизнес-правило, не как лестница `if` |
| **DateOnly / TimeOnly** | `BirthDate`, `ShiftStartTime`, `Timesheet.Date` | дата без времени ≠ `DateTime` с обнулённым временем, которое легко сравнить неправильно |
| **Guid.CreateVersion7()** | `Id` каждой сущности | UUID, упорядоченный по времени → PK монотонны, индекс не фрагментируется как с `NewGuid()` |
| **async/await + CancellationToken** | Каждый публичный async-метод | отменяемость сквозь весь стек |
| **Generics** | `Result<T>`, `IRequestHandler<,>`, generic query filters | один код на 18 сущностей вместо 18 копий |
| **Reflection + MakeGenericMethod** | Global query filters в `OnModelCreating` | без этого — 18 руками написанных `HasQueryFilter`, и первая забытая = дыра в изоляции |
| **Expression trees** | LINQ-предикаты | C# → SQL `WHERE`, не наоборот |
| **Extension methods** | `UseXminAsConcurrencyToken()`, свои в Application | поведение без наследования |
| **DI / IoC** | Все интерфейсы Application | Application не видит EF Core → тесты без Postgres |
| **Private setters + фабричные методы** | Каждая сущность (`Worker.Create`, не `new Worker{}`) | инвариант 18+ невозможно обойти — нет публичного конструктора |
| **Криптография** | `Rfc2898DeriveBytes`/Argon2, `RandomNumberGenerator`, `CryptographicOperations.FixedTimeEquals` | не самописный хеш, не `==` на строках (тайминг-атака) |
| **Middleware pipeline** | `ExceptionHandlingMiddleware` | одна точка превращения ошибки в формат §8 |
| **Options pattern** | `IOptions<JwtOptions>`, `IOptions<CompanyOptions>` | конфиг типизирован, не `IConfiguration["..."]` россыпью |
| **MediatR pipeline behaviors** | `ValidationBehavior`, `LoggingBehavior`, `IdempotencyBehavior` | сквозные заботы одним слоем |
| **Interceptors (EF Core)** | `SaveChangesInterceptor` для audit-полей | `CreatedAt`/`ModifiedAt` не проставляются руками в каждом handler'е |
| **Value Objects** | `Money`, `Quantity` (опционально Phase 5+) | `decimal` без типа легко перепутать с процентом |

**Паттерны:** State (WorkOrder/IndividualTask), Strategy (расчёт оплаты Hourly/Piecework/дележ), Observer (SignalR), CQRS+Mediator, Repository+UoW (за `IApplicationDbContext`), Factory (статические `Create`), Specification (опционально — сложные фильтры дашборда).

---

## 4. Роли — кто что делает в системе

Не «список ролей», а кто чем занят в течение дня.

### Owner (владелец)
Входит раз в неделю. Видит сводку по всем объектам: бюджет vs факт, просрочки, задолженность по зарплате. Единственный, кто управляет пользователями и ролями. Утверждает зарплату наравне с бухгалтером. **Не** отмечает явку, **не** создаёт наряды — это операционка.

### Prorab (прораб)
Основной пользователь API, весь день. Утро — статус нарядов: что просрочено, что на проверке. День — приёмка нарядов, реакция на нехватку материала, согласование заявок. Вечер — приёмка табелей. Подтверждает премии и распределение сдельщины. **Не видит** ставки рабочих (`PayRate`) — приёмка идёт по объёму/часам, не по деньгам. **Не проводит** зарплату в `Paid`. Видит только назначенные ему объекты (§1.2).

### Brigadir (бригадир)
Работает **в Telegram, на объекте**. Одновременно `User` (логин) и `Worker` (числится в своей бригаде — `Worker.UserId`). Утро — отмечает приход бригады и себя. День — отметки выполнения по нарядам, личные задачи рабочим и себе, заявки на материал. Вечер — дневной отчёт по расходу, закрытие смены. При закрытии наряда — распределяет сдельщину между рабочими. **Не** принимает свои наряды, **не** подтверждает свои премии, **не** видит чужие бригады (404, не 403).

### Accountant (бухгалтер)
Работает через API, по расписанию (2 раза в месяц). Формирует черновики зарплаты, проверяет расшифровку (вычеты/премии/авансы), утверждает, проводит оплату. Выдаёт авансы. Единственный кроме Owner, кто видит `PayRate` всех рабочих. **Не** управляет производством, **не** подтверждает премии (это решение прораба по факту работы).

### Worker (рабочий) — не пользователь системы
Не логинится нигде. Существует как запись, за него отчитывается бригадир. Осознанное решение: у рабочих на объекте может не быть смартфона/Telegram, и заставлять их — блокер внедрения. `Worker.UserId` (nullable) — задел: если завтра нужно, чтобы рабочие сами отмечались, это добавление `TelegramLink` на обычного Worker, не переделка модели.

### Snabzhenets (снабженец) — вне MVP, место оставлено
Если объектов станет много и прораб не будет успевать вести ещё и закупки — забирает `MaterialRequest.approve`, `MaterialDelivery.CRU`. Технически: значение в enum + перенос прав. Схема данных не меняется.
---

# ЧАСТЬ II. ДОМЕННАЯ МОДЕЛЬ

## 5. Сущности — 26 (было 16, добавлено 10 при первом ревью + 1 позже, §5.27 — не сущность, процедура)

**Конвенции (обязательны везде):** `Id` — `uuid` через `Guid.CreateVersion7()`, `ValueGeneratedNever()`. Деньги — `decimal(18,2)`, явный `HasColumnType`. Количества — `decimal(18,3)`. Даты — `timestamptz`, чистые даты — `date`. Soft-delete (`IsDeleted`) везде кроме аудит-логов. `CompanyId uuid` на каждой сущности кроме `User`, `Company`, `TelegramUpdateLog`.

### 5.1 Company ← НОВАЯ (её не было нигде, хотя CompanyId был везде)

| Поле | Тип | Notes |
|---|---|---|
| Id | uuid | из конфигурации при разворачивании |
| Name | varchar(200) | |
| **PieceworkDistributionMode** | enum(Manual, EqualAmongContributors, ProportionalToHours) | §1.1, дефолт `Manual` |
| **LatenessGraceMinutes** | int | дефолт 0. Опоздание меньше этого не считается |
| **LatenessNotifyThresholdMinutes** | int | дефолт 15. Порог уведомления прорабу |
| **PayrollPeriodType** | enum(Monthly, SemiMonthly) | дефолт `Monthly` |
| **DefaultCurrency** | varchar(3) | `TJS` |
| CreatedAt | timestamptz | |

Почему таблица, а не константа: все пороги/режимы §1 живут здесь. Меняются без деплоя. И это то, что делает будущий multi-tenant миграцией данных, а не переписыванием.

### 5.2 User
FullName, Phone (unique, логин), PasswordHash, Role(Owner/Prorab/Brigadir/Accountant), IsActive, CreatedAt. Не `ICompanyOwned`.

### 5.3 RefreshToken ← НОВАЯ (§11.1)
UserId, TokenHash (**хеш, не сам токен**), ExpiresAt, CreatedAt, CreatedByIp, RevokedAt (nullable), ReplacedByTokenId (nullable). Индекс на TokenHash.

### 5.4 PasswordResetToken ← НОВАЯ (пробел №9)
UserId, TokenHash, ExpiresAt (**1 час**), UsedAt (nullable), CreatedAt.

### 5.5 Customer
CompanyId, Name, ContactPerson, ContactPhone.

### 5.6 Brigade
CompanyId, Name, BrigadirUserId (nullable до назначения), IsActive.

### 5.7 Worker
CompanyId, BrigadeId, UserId (nullable — только у бригадира), FullName, Phone, **BirthDate** (18+ на дату HireDate), Specialty, PayRateType(Hourly/Piecework), **PayRate**, ShiftStartTime, DocumentType/DocumentExpiryDate (**PII — §11.5**), HireDate, **TerminationDate** (nullable ← пробел №4), IsActive.

### 5.8 ProrabObjectAssignment ← НОВАЯ (§1.2, пробел №5)
CompanyId, ProrabUserId, ObjectId, AssignedAt, AssignedByUserId. Уникальность `(ProrabUserId, ObjectId)`.

### 5.9 ConstructionObject
CompanyId, Name, Address, CustomerId, Status(Planned/InProgress/Suspended/Completed/Closed), StartDate, PlannedEndDate, ActualEndDate, Budget.

### 5.10 EstimateItem
CompanyId, ObjectId, WorkType, Unit, PlannedQty, PlannedUnitPrice, Stage.

### 5.11 WorkOrder
CompanyId, **Code** (`BR-{N}`, unique per company), ObjectId, BrigadeId, EstimateItemId (nullable), Title, Unit, PlannedQty, UnitPrice, Status, AssignedDate, DueDate, CompletedDate, CreatedByUserId, `xmin`.

### 5.12 WorkOrderProgress
CompanyId, WorkOrderId, ReportedByUserId, ReportedQty (**инкремент, не итог**), PhotoUrls (jsonb), Comment, ReportedAt.

### 5.13 WorkOrderPayoutShare ← НОВАЯ (§1.1)
CompanyId, WorkOrderId, WorkerId, **SharePercent** `decimal(5,2)`, Amount `decimal(18,2)` (снимок на момент подтверждения), SetByUserId (бригадир), ApprovedByUserId (nullable, прораб), CreatedAt.

Инвариант: `Σ SharePercent` по одному `WorkOrderId` = **100.00** ровно. Проверяется в handler'е при сохранении всего набора разом — не построчно, иначе промежуточное состояние невалидно.

### 5.14 IndividualTask
CompanyId, **Code** (та же последовательность, что WorkOrder), WorkOrderId (nullable), BrigadeId, AssignedToWorkerId, Title, Description, DueAt, Status(Assigned/InProgress/Done), StartedAt, CompletedAt, **CompletedEarly**, BonusAmount (nullable), BonusApprovedByUserId (nullable), CreatedByUserId, `xmin`.

### 5.15 TaskLog
CompanyId, EntityType(WorkOrder/IndividualTask), EntityId, FromStatus, ToStatus, ChangedByUserId, ChangedAt, Comment. **Не soft-deletable.** Пишется в той же транзакции, что переход.

### 5.16 AdminAuditLog ← НОВАЯ (§11.7)
CompanyId, ActorUserId, Action (enum: UserCreated, RoleChanged, UserDeactivated, BrigadirAssigned, PayRateChanged, PayrollPaid, AdvanceIssued), TargetEntityType, TargetEntityId, OldValueJson, NewValueJson, At, Ip. Не soft-deletable.

`TaskLog` — про бизнес-переходы. Это — про административные действия. Разные вещи, разные таблицы.

### 5.17 MaterialRequest
CompanyId, ObjectId, BrigadeId, RequestedByUserId, MaterialName, Unit, Qty, **QtyDelivered** `decimal(18,3)` ← НОВОЕ (пробел №6), Status(Requested/Approved/Ordered/PartiallyDelivered/Delivered/Rejected) ← **добавлен `PartiallyDelivered`**, ApprovedByUserId, RequestedAt/ApprovedAt/DeliveredAt.

### 5.18 MaterialConsumptionReport
CompanyId, ObjectId, BrigadeId, ReportedByUserId, Date, MaterialName, Unit, QtyUsed, QtyShortage, Comment. Уникальность `(BrigadeId, ObjectId, MaterialName, Date)`.

### 5.19 MaterialDelivery
CompanyId, ObjectId, MaterialRequestId (nullable), MaterialName, Unit, Qty, UnitCost, SupplierName, DeliveredAt.

### 5.20 Timesheet
CompanyId, WorkerId, ObjectId, Date, PlannedStartTime (**снимок на день**), CheckInAt/CheckOutAt (nullable), **LateMinutes** (computed при check-in), HoursWorked, WorkOrderProgressId (nullable), EnteredManually (bool), ApprovedByUserId/ApprovedAt. Уникальность `(WorkerId, Date)`.

### 5.21 AbsenceRecord ← НОВАЯ (пробел №4)
CompanyId, WorkerId, DateFrom, DateTo, Type(SickLeave/Vacation/Unpaid/Other), Reason, **IsPaid** (bool), DocumentUrl (nullable — справка), ApprovedByUserId, CreatedAt.

Правило: день, покрытый `AbsenceRecord`, **не** даёт `LateMinutes` и **не** считается прогулом. `IsPaid=true` → день входит в `CalculatedAmount` по средней ставке (см. §6.0).

### 5.22 PayrollEntry
CompanyId, WorkerId, PeriodStart/PeriodEnd, **CalculatedAmount**, LatenessDeductionAmount, BonusAmount, **AdvanceDeductedAmount** ← НОВОЕ (пробел №3), AdjustmentAmount, AdjustmentReason, **FinalAmount** (computed при Approve), Status(Draft/Approved/Paid), PaidAt, `xmin`.

### 5.23 PayrollAdvance ← НОВАЯ (пробел №3)
CompanyId, WorkerId, Amount, IssuedAt, IssuedByUserId, Note, **SettledInPayrollEntryId** (nullable — в каком расчёте удержан).

### 5.24 TelegramLink
CompanyId, UserId, TelegramChatId, LinkedAt. Уникальность на обоих.

### 5.25 TelegramLinkCode ← НОВАЯ (§10.2)
CompanyId, UserId, **CodeHash** (не сам код), ExpiresAt (**15 минут**), UsedAt (nullable), CreatedByUserId.

### 5.26 TelegramUpdateLog ← НОВАЯ (пробел №2, идемпотентность)
**UpdateId** (bigint, unique) — id апдейта от Telegram, ProcessedAt. Не `ICompanyOwned` — это инфраструктура, не бизнес-данные.

### 5.27 SeedData ← НОВАЯ (пробел №12 — без этого систему не с чем открыть)

Не сущность — процедура, выполняется при **каждом** старте приложения, идемпотентно
(проверяет «уже есть?» перед созданием). Без неё после `dotnet ef database update` база
пуста: нет `Company`, нет ни одного `User` — войти в систему физически нечем.

```
При старте (после MigrateAsync, до Kestrel.Run):
    1. Company существует? → нет: создать из SeedOptions (Id, Name, дефолтные пороги §5.1)
    2. Owner-аккаунты существуют? → нет: создать N штук (см. ниже), каждому:
         - Phone из конфигурации (SeedOptions.Owners[i].Phone)
         - FullName из конфигурации
         - PasswordHash = Hash(переменная окружения SEED_OWNER_{i}_PASSWORD)
         - Role = Owner
         - ForcePasswordChange = true
    3. Уже есть? → выйти молча, ничего не трогать (идемпотентность)
```

**`User.ForcePasswordChange`** (bool, дефолт `false`) — новое поле. При `true` любой
запрос, кроме `PUT /auth/change-password`, возвращает `403 PASSWORD_CHANGE_REQUIRED`.
Снимается флаг только после первой успешной смены пароля.

**Конфигурация (пример на 3 владельцев):**
```json
"Seed": {
  "Company": { "Id": "...", "Name": "..." },
  "Owners": [
    { "Phone": "CHANGE_ME_1", "FullName": "CHANGE_ME_1" },
    { "Phone": "CHANGE_ME_2", "FullName": "CHANGE_ME_2" },
    { "Phone": "CHANGE_ME_3", "FullName": "CHANGE_ME_3" }
  ]
}
```
Пароли — **не в этом файле**: `SEED_OWNER_1_PASSWORD`, `SEED_OWNER_2_PASSWORD`,
`SEED_OWNER_3_PASSWORD` — переменные окружения на сервере, задаются один раз при
разворачивании, не коммитятся, не логируются.

**Почему не в коде, а через ENV + флаг смены:** пароль в `SeedData.cs` попадает в git
и живёт там годами даже после смены. Временный пароль + принудительная смена при первом
входе — так временное остаётся временным.

**Почему без email:** в схеме нет поля email ни у одной сущности — вход везде по
`Phone` (§5.2). Добавление email — отдельное архитектурное решение (OAuth/подтверждение
почты), не часть seed.

**Дальнейшие пользователи (Prorab, Brigadir, Accountant) — не через seed.** Любой из
трёх Owner заводит их через API (`POST /users`), с паролем-приглашением и тем же
`ForcePasswordChange = true`. Каждое создание пишется в `AdminAuditLog` (§5.16) — у
seed-Owner'ов такой записи нет (их некому создавать), это единственное осознанное
исключение из правила «все создания аудируются».

---

## 6. Индексы

```
Company(Id)
User(Phone) UNIQUE
RefreshToken(TokenHash) UNIQUE, RefreshToken(UserId, RevokedAt)
PasswordResetToken(TokenHash) UNIQUE
Worker(BrigadeId), Worker(CompanyId), Worker(DocumentExpiryDate) WHERE DocumentExpiryDate IS NOT NULL
ProrabObjectAssignment(ProrabUserId, ObjectId) UNIQUE
ConstructionObject(CompanyId, Status)
WorkOrder(CompanyId, Code) UNIQUE, WorkOrder(ObjectId, BrigadeId, Status), WorkOrder(DueDate) WHERE Status NOT IN (Accepted, Closed)
WorkOrderPayoutShare(WorkOrderId), WorkOrderPayoutShare(WorkerId)
IndividualTask(CompanyId, Code) UNIQUE, IndividualTask(AssignedToWorkerId, Status), IndividualTask(BrigadeId, Status)
TaskLog(EntityType, EntityId, ChangedAt)
AdminAuditLog(CompanyId, At), AdminAuditLog(ActorUserId, At)
MaterialRequest(ObjectId, BrigadeId, Status)
MaterialConsumptionReport(BrigadeId, ObjectId, MaterialName, Date) UNIQUE
MaterialDelivery(MaterialRequestId) WHERE MaterialRequestId IS NOT NULL
Timesheet(WorkerId, Date) UNIQUE, Timesheet(ObjectId, Date)
AbsenceRecord(WorkerId, DateFrom, DateTo)
PayrollEntry(WorkerId, PeriodStart, PeriodEnd) UNIQUE
PayrollAdvance(WorkerId, SettledInPayrollEntryId)
TelegramLink(TelegramChatId) UNIQUE, TelegramLink(UserId) UNIQUE
TelegramLinkCode(CodeHash) UNIQUE
TelegramUpdateLog(UpdateId) UNIQUE
```

---

## 7. State machines

### 7.1 WorkOrder.Status

```
New ──assign──▶ Assigned ──start──▶ InProgress ──submit──▶ OnReview
                                         ▲                    │
                                         │              ┌─────┴─────┐
                                         │           accept      reject
                                         │              │           │
                                         └──────────────┼───────────┘
                                                        ▼
                                                    Accepted ──close──▶ Closed
```

- `InProgress → OnReview` — только Brigadir своей бригады. **Требует:** ≥1 `WorkOrderProgress` **и** заполненный `WorkOrderPayoutShare` с суммой 100% (если `PayRateType=Piecework` у бригады).
- `OnReview → Accepted/Rejected` — только Prorab, назначенный на этот объект (§1.2), или Owner. **Reject требует причину** → `TaskLog.Comment`.
- `Rejected → InProgress` — доработка.
- `Accepted → Closed` — авто после `PayrollEntry.Paid` за период, либо вручную Prorab.
- Недопустимый переход → `Result.Failure` (`WORK_ORDER_INVALID_TRANSITION`), не исключение, не тихий no-op.
- `ReportedQty` принимается только при `InProgress`.

### 7.2 IndividualTask.Status

`Assigned → InProgress → Done`. Без возврата — не сделано как надо, бригадир заводит новую задачу. `CompletedEarly` вычисляется **на закрытии**, не пересчитывается позже (иначе правка `DueAt` задним числом перепишет историю). `Done` не редактируется, кроме `BonusAmount`/`BonusApprovedByUserId` до подтверждения.

### 7.3 MaterialRequest.Status ← дополнено (пробел №6)

```
Requested → Approved → Ordered → PartiallyDelivered ⇄ Delivered
     └──────────────────────────────────────────────▶ Rejected
```

- `Approved/Ordered → PartiallyDelivered` — авто при `0 < Σ Delivery.Qty < Request.Qty`.
- `→ Delivered` — авто при `Σ Delivery.Qty >= Request.Qty`.
- Прораб может вручную закрыть в `Delivered` при недопоставке (договорились на меньшее) — с обязательным комментарием.

### 7.4 PayrollEntry.Status

`Draft → Approved → Paid`. `FinalAmount` вычисляется **при Approve**, дальше неизменен. `Paid` необратим.
---

# ЧАСТЬ III. БИЗНЕС-ЛОГИКА

Единственный источник правды по формулам. Ни одна из них не дублируется в Telegram-хендлере или у любого клиента API — бот и любой вызывающий показывают готовый результат от backend, не считают сами.

## 8.0 CalculatedAmount — базовая сумма зарплаты ← ПРОБЕЛ №1, КРИТИЧНЫЙ

Раньше расписаны были только вычет (§8.1) и премия (§8.7) — то есть **поправки к сумме, которой не существовало**. Это дыра в самом центре: система считала штрафы к неопределённому числу.

### Hourly (почасовая)

```
CalculatedAmount = Σ(Timesheet.HoursWorked × Worker.PayRate)
                   за все дни периода, где Timesheet.ApprovedAt IS NOT NULL
                 + Σ(оплачиваемые дни отсутствия × средняя дневная ставка)
```

- Считаются **только принятые прорабом** табели (`ApprovedAt IS NOT NULL`). Неприняты — не в расчёте, висят как «требует приёмки» у прораба. Иначе бригадир один правит и себе, и другим сумму без контроля.
- Оплачиваемое отсутствие (`AbsenceRecord.IsPaid = true`): средняя дневная ставка = `Σ HoursWorked за последние 3 месяца / количество отработанных дней × PayRate`. Если истории <10 дней — `8ч × PayRate` (стандартная смена).

**Пример.** Ставка 40 сомони/час. За период: 20 дней × 8ч = 160ч отработано + 2 дня оплачиваемого больничного. Средняя дневная = 8ч. Итого: `160 × 40 + 2 × 8 × 40 = 6400 + 640 = 7040 сомони`.

### Piecework (сдельная)

```
Для каждого WorkOrder со Status ∈ {Accepted, Closed}, где CompletedDate ∈ период:
    OrderTotal = Σ(WorkOrderProgress.ReportedQty) × WorkOrder.UnitPrice
    WorkerAmount = OrderTotal × (WorkOrderPayoutShare.SharePercent / 100)

CalculatedAmount = Σ WorkerAmount по всем нарядам периода
                 + Σ(оплачиваемые дни отсутствия × средняя дневная ставка)
```

Важно: `Σ ReportedQty` (**факт**), не `PlannedQty` (план). Сделали 45 м² из 50 запланированных — платим за 45.

**Пример.** Наряд: штукатурка, `UnitPrice` = 120 сомони/м², фактически отчитались за 45 м² → `OrderTotal = 5400`. Бригадир распределил: Каримов 50%, Рахимов 30%, сам бригадир 20%. Каримов получает `5400 × 0.5 = 2700`, Рахимов `1620`, бригадир `1080`. Сумма долей = 100% — иначе наряд нельзя отправить на проверку.

### Смешанный случай

Один `Worker` — один `PayRateType`. Если бригада делает и почасовые, и сдельные работы — это разные `Worker`-записи или смена `PayRateType` (что меняет расчёт **с даты изменения**, не задним числом). Историю ставок в MVP не храним — открытый вопрос §15 №7 (нужна ли `WorkerPayRateHistory`).

### Граничные случаи

- **Рабочий уволился в середине наряда** (`TerminationDate` внутри периода выполнения). Его доля в `WorkOrderPayoutShare` **остаётся** — работу он сделал. `PayrollEntry` формируется за фактический период до `TerminationDate`. Если наряд ещё не `Accepted` на момент увольнения — доля всё равно зафиксирована, выплата уходит в расчёт периода, когда наряд приняли. Бригадир не может обнулить долю уволившегося задним числом — только прораб, с комментарием, через `AdjustmentAmount`.
- **Наряд принят в следующем периоде.** Сумма попадает в период по `CompletedDate` (дата `Accept`), не по дате отметок. Отчитались 30-го, приняли 2-го → в следующий период. Иначе бухгалтер не может закрыть месяц, пока прораб не примет всё.
- **Наряд отклонён после отметок** — доли не аннулируются, наряд возвращается в `InProgress`, при повторной сдаче доли можно переписать (пока не `Accepted`).
- **Нет ни одного принятого табеля / ни одного наряда** → `CalculatedAmount = 0`, `PayrollEntry` **всё равно создаётся** в `Draft` — бухгалтер видит нулевую строку и разбирается, а не гадает, почему человека нет в ведомости.

---

## 8.1 Опоздания и автоматический вычет

```
LateMinutes = max(0, CheckInAt − (Date + PlannedStartTime)) − Company.LatenessGraceMinutes
              (если результат < 0 → 0)

LatenessDeductionAmount = Σ LateMinutes за период × (PayRate / 60)
```

- Считается **один раз** при check-in, дальше не редактируется никем. Правка — только через `AdjustmentAmount` с обязательной причиной.
- `PlannedStartTime` — **снимок** `Worker.ShiftStartTime` на день. Смена ставки/времени завтра не переписывает вчерашние опоздания.
- `CheckInAt = null` и **нет** `AbsenceRecord` → прогул, не опоздание, в формулу не входит.
- `CheckInAt = null` и **есть** `AbsenceRecord` → уважительное отсутствие, ни вычета, ни прогула.
- `ShiftStartTime` не задан → `LateMinutes = null` (не 0!), прорабу — явное предупреждение «не настроено время смены у X». Молчаливый ноль = скрытая ошибка.

**Пример.** `PayRate` = 40/час, `LatenessGraceMinutes` = 0. Опоздания за месяц: 15, 0, 40, 10, 0 → Σ = 65 мин. Вычет = `65 × (40/60) = 43.33` сомони.

**Пример с grace = 5.** Те же опоздания: 15→10, 0→0, 40→35, 10→5, 0→0 → Σ = 50 мин → вычет `33.33`.

---

## 8.2 Материалы: дневной отчёт vs заявка ← дополнено (пробел №6)

Две разные вещи, которые легко спутать в одну:

- **`MaterialConsumptionReport`** — ежедневная рутина: сколько потрачено, сколько не хватает. Источник данных.
- **`MaterialRequest`** — разовый процесс с решением человека: нужно закупить, дайте добро.

**Поток:** бригадир вечером заполняет отчёт (материал → `QtyUsed` → `QtyShortage`, дефолт 0). Если `QtyShortage > 0` → **одним действием** предлагается заявка с уже подставленными полями. Одновременно — событие `MaterialShortageReported` прорабу сразу, не дожидаясь оформления заявки.

**Прораб видит не только заявку, но и историю отчётов** по этому материалу на объекте — понимает, разовая нехватка или системная. Материал с `QtyShortage > 0` дважды за 7 дней → бейдж «повторяется».

### Частичные поставки ← ПРОБЕЛ №6

```
При создании MaterialDelivery с MaterialRequestId != null:
    request.QtyDelivered += delivery.Qty

    если QtyDelivered >= request.Qty  → Status = Delivered, DeliveredAt = now
    иначе если QtyDelivered > 0       → Status = PartiallyDelivered
```

- Переход **автоматический**, не ручной — иначе прораб забудет, и заявка вечно висит в `Ordered`.
- Прораб может **вручную** закрыть `PartiallyDelivered → Delivered` при договорённости о недопоставке — с обязательным комментарием (пишется в `AdminAuditLog`).
- Перепоставка (`QtyDelivered > Qty`) — разрешена, не ошибка (привезли с запасом), но подсвечивается в UI.
- Поставка **без** `MaterialRequestId` — валидна (внеплановая закупка), ни на какую заявку не влияет.

**Граничный случай:** повторный отчёт за тот же материал/день — **обновление** существующей записи, не дубль (уникальность `BrigadeId+ObjectId+MaterialName+Date`).

**Отчёт не сдан за день** — видно прорабу как пропуск, не как «нехватки не было».

---

## 8.3 Возраст 18+

Проверка на дату `HireDate`, **не** на сегодня — оформление задним числом не должно проходить только потому, что человек уже вырос.

Hard `400 WORKER_UNDERAGE`, не warning, не «сохранить всё равно». На бэкенде — граница безопасности, единственная точка проверки.

**Граничный случай:** дата рождения неизвестна точно — система **не** разрешает пропустить поле. Смягчение (приблизительная дата с пометкой) — бизнес-решение, §15 №13.

---

## 8.4 Явка — приход/уход

- Только бригадир отмечает — за всю бригаду и за себя (`Worker.UserId`).
- `CheckInAt`/`CheckOutAt` — timestamp момента нажатия. Отметка задним числом разрешена, но `EnteredManually = true` — прораб при приёмке видит, где время реальное, где восстановленное.
- `HoursWorked = CheckOutAt − CheckInAt` для `Hourly`. Для `Piecework` часы фиксируются тоже (учёт присутствия), но в оплату не идут.
- **Забыли check-out** → бот сам вечером (по `Company`-настройке времени, дефолт 20:00): «Не закрыта смена: Каримов. [Закрыть сейчас] [Его не было]».
- **Смена через полночь** — `Date` табеля по дате **начала** смены, не разбивается на два дня.

---

## 8.5 Личные задачи

Бригадир создаёт и себе, и любому рабочему **своей** бригады (`AssignedToWorkerId.BrigadeId == creator.BrigadeId`, иначе `INDIVIDUAL_TASK_WRONG_BRIGADE`).

Проще наряда — без приёмки прорабом на каждую: бригадир сам ставит и закрывает, прораб видит поток (read), не утверждает. Просроченная задача не блокируется, но подсвечивается и попадает в комбинированный статус.

При закрытии → сравнение `CompletedAt` с `DueAt` → §8.7.

---

## 8.6 Комбинированный статус

`GET /dashboard/work-status` — один handler, агрегирующий `WorkOrder.Status` **и** `IndividualTask.Status` вместе, фильтр по объекту/бригаде. Счётчики по статусам + просроченные (`DueDate`/`DueAt` в прошлом, статус не финальный).

**Пример ответа.** Объект №3: «В работе — 4 наряда, 7 задач · На проверке — 2 наряда · Просрочено — 1 наряд, 3 задачи».

Read-only. Действия — в карточке конкретной сущности, чтобы не терять контекст, кому и почему.

---

## 8.7 Премия за досрочное завершение

1. `CompletedAt < DueAt` при закрытии `IndividualTask` → `CompletedEarly = true`.
2. Бригадиру **сразу** предлагается поле «Премия» — необязательное.
3. Сумма — **черновик** (`BonusAmount` есть, `BonusApprovedByUserId` пуст). В зарплату не попадает.
4. Прораб видит очередь неподтверждённых премий, подтверждает или меняет сумму.
5. Подтверждённая → `PayrollEntry.BonusAmount` периода по `CompletedAt`.
6. Одинаково для рабочего и для бригадира — премия за **свою** задачу бригадир себе не подтверждает, только прораб.

**Формула «сколько за какую досрочность» сознательно не автоматизирована** — сложность задачи и «насколько раньше» не связаны линейно. Появится позже поверх этой же схемы, если накопится статистика. Не выдумывать.

**Граничный случай:** задача переоткрыта после `Done` — уже подтверждённая и выплаченная (`Paid`) премия не отзывается автоматически. Ручная правка через `AdjustmentAmount` с причиной.

---

## 8.8 Аванс ← ПРОБЕЛ №3

Отдельная сущность `PayrollAdvance`, не поле в `PayrollEntry`. Почему: авансов за период может быть **несколько**, у каждого своя дата и свой выдавший — в одно поле это не ложится.

```
При формировании PayrollEntry за период:
    AdvanceDeductedAmount = Σ PayrollAdvance.Amount
                            где WorkerId = worker
                              и SettledInPayrollEntryId IS NULL
                              и IssuedAt <= PeriodEnd

    При Approve: каждому учтённому авансу проставляется SettledInPayrollEntryId
```

**Итоговая формула:**
```
FinalAmount = CalculatedAmount
            − LatenessDeductionAmount
            + BonusAmount
            − AdvanceDeductedAmount
            ± AdjustmentAmount
```

- Аванс выдаёт `Accountant`/`Owner`, пишется в `AdminAuditLog`.
- **`FinalAmount` может быть отрицательным** — если аванс превысил заработок (болел полмесяца после аванса). Это **не** ошибка расчёта: система показывает долг, не обнуляет молча. Бухгалтер решает — перенести на следующий период (`AdjustmentAmount`) или удержать. Нельзя молча занулить — человек должен видеть свой реальный баланс.
- Аванс, выданный **после** `PeriodEnd`, — в следующий период, не в текущий.

**Пример.** `CalculatedAmount` = 7040, опоздания −43.33, премия +200, аванс 3000 → `FinalAmount = 7040 − 43.33 + 200 − 3000 = 4196.67`.

---

## 8.9 Больничный / отпуск / увольнение ← ПРОБЕЛ №4

### Отсутствие (`AbsenceRecord`)

- Создаёт прораб или бухгалтер (не бригадир — нужен документ/решение).
- День, покрытый `AbsenceRecord`, **не** даёт `LateMinutes` и **не** считается прогулом.
- `IsPaid = true` → день входит в `CalculatedAmount` по средней ставке (§8.0). `IsPaid = false` (отпуск за свой счёт) → не входит никуда.
- Пересечение с `Timesheet` (человек отмечен И в отпуске) — конфликт, `400`: либо отметка ошибочна, либо отсутствие. Не угадывать.
- Справка (`DocumentUrl`) — опционально, тот же механизм подписанных URL, что фото нарядов.

### Увольнение (`Worker.TerminationDate`)

При проставлении `TerminationDate`:
1. **Открытые `IndividualTask`** (`Status != Done`) — блокируется, пока бригадир не закроет или не переназначит. Не удалять молча — там может быть незакрытая работа.
2. **Доли в `WorkOrderPayoutShare`** — остаются (§8.0).
3. **Текущий `PayrollEntry`** — формируется за фактический период до `TerminationDate` включительно, досрочно, не дожидаясь конца месяца.
4. **Непогашенные авансы** — попадают в этот финальный расчёт. Если `FinalAmount < 0` — долг, помечается явно, не обнуляется.
5. `IsActive = false`, из активных списков исчезает, из истории — **нет**.

---

## 8.10 Факт затрат по объекту ← ПРОБЕЛ №10

Раньше «факт» считался как материалы + суммы нарядов, **без зарплаты** — то есть был занижен на весь фонд оплаты труда. Директор смотрел на цифру, которая врёт.

```
ObjectActualCost =
      Σ MaterialDelivery(UnitCost × Qty) по объекту
    + Σ PayrollAllocation по объекту (см. ниже)
```

**Как зарплата раскладывается по объектам** (`PayrollEntry` привязан к `Worker`, не к объекту):

- **Piecework** — прямо: `WorkOrderPayoutShare.Amount` → `WorkOrder.ObjectId`. Точно, без допущений.
- **Hourly** — пропорционально часам: `Timesheet.ObjectId` + `HoursWorked` за период → доля рабочего на каждый объект.
- **Оплачиваемое отсутствие** — раскладывается пропорционально часам этого рабочего за период. Болел — но зарплата всё равно чья-то статья расходов.

Считается **отдельным read-модельным запросом** (`GET /objects/{id}/cost-breakdown`), не хранится в `ConstructionObject` — иначе денормализация, которая разъедется при любой правке задним числом.

**Показывается с явной пометкой:** «Зарплата учтена только за закрытые периоды (`PayrollEntry.Status = Paid`)». Незакрытый месяц — не в факте, иначе цифра прыгает каждый день. Это честнее, чем показывать «примерно».
---

# ЧАСТЬ IV. API И БЕЗОПАСНОСТЬ

## 9. API

`/api/v1`, REST, JSON. **Closed model: 404, не 403** на чужую сущность — не подтверждаем даже факт существования.

### 9.1 Формат ошибки

```json
{ "error": { "code": "WORK_ORDER_INVALID_TRANSITION", "message": "...", "traceId": "..." } }
```

### 9.2 Каталог кодов

| Код | HTTP | Когда |
|---|---|---|
| `AUTH_INVALID_CREDENTIALS` | 400 | неверный телефон **или** пароль — намеренно один код на оба |
| `AUTH_ACCOUNT_DEACTIVATED` | 400 | пользователь деактивирован |
| `AUTH_TOKEN_EXPIRED` | 401 | access истёк → идти в `/auth/refresh` |
| `AUTH_REFRESH_TOKEN_INVALID` | 401 | refresh не найден/отозван/истёк → на логин |
| `AUTH_REFRESH_TOKEN_REUSED` | 401 | повторное использование → **вся цепочка отозвана** (§11.1) |
| `AUTH_RESET_TOKEN_INVALID` | 400 | токен сброса пароля невалиден/использован/истёк |
| `VALIDATION_FAILED` | 400 | FluentValidation |
| `WORKER_UNDERAGE` | 400 | 18+ не пройдено на `HireDate` |
| `WORK_ORDER_INVALID_TRANSITION` | 400 | переход не по state machine |
| `WORK_ORDER_NOT_FOUND` | 404 | нет ИЛИ чужая компания/бригада/объект |
| `WORK_ORDER_SHARES_INVALID` | 400 | `Σ SharePercent ≠ 100` |
| `WORK_ORDER_NO_PROGRESS` | 400 | попытка submit без единой отметки |
| `INDIVIDUAL_TASK_WRONG_BRIGADE` | 400 | назначение рабочему чужой бригады |
| `TIMESHEET_ALREADY_CHECKED_IN` | 400 | повторный check-in в тот же день |
| `TIMESHEET_ABSENCE_CONFLICT` | 400 | отметка в день, покрытый `AbsenceRecord` |
| `MATERIAL_REQUEST_OVERDELIVERY` | 200 | не ошибка — предупреждение в UI |
| `PAYROLL_ADJUSTMENT_REASON_REQUIRED` | 400 | `AdjustmentAmount ≠ 0` без причины |
| `PAYROLL_ALREADY_PAID` | 400 | правка после `Paid` |
| `BONUS_NOT_ELIGIBLE` | 400 | подтверждение премии на задаче без `CompletedEarly` |
| `PRORAB_NOT_ASSIGNED_TO_OBJECT` | 404 | прораб не назначен на объект (§1.2) |
| `CONCURRENCY_CONFLICT` | 409 | `xmin` разошёлся |
| `TELEGRAM_LINK_CODE_EXPIRED` | 400 | код старше 15 мин |
| `TELEGRAM_LINK_CODE_INVALID` | 400 | не найден или использован |
| `RATE_LIMITED` | 429 | превышен лимит |
| `INTERNAL_ERROR` | 500 | непредвиденное — логируется полностью, клиенту без деталей |

### 9.3 Пагинация

`?page=1&pageSize=20` (max 100) → `{ items, page, pageSize, totalCount }`. Sort/filter — **allow-list**, не сырые строки от клиента.

### 9.4 Эндпоинты

```
POST   /auth/login                            —
POST   /auth/refresh                          —
POST   /auth/logout                           auth
POST   /auth/forgot-password                  —          ← пробел №9
POST   /auth/reset-password                   —          ← пробел №9
GET    /health                                —          ← пробел №11
GET    /health/ready                          —

GET    /companies/current                     auth       настройки §5.1
PUT    /companies/current                     Owner      пороги, режим дележа

GET,POST /customers                           Prorab+
GET,POST /objects                             Prorab+    (фильтр по ProrabObjectAssignment)
GET,PUT  /objects/{id}                        Prorab+
GET      /objects/{id}/cost-breakdown         Prorab+    ← пробел №10
GET,POST /objects/{id}/estimate-items         Prorab+
GET,POST /objects/{id}/prorabs                Owner      ← §1.2 назначение прорабов

GET,POST /brigades                            Prorab+
PUT      /brigades/{id}/brigadir              Owner
GET,POST /brigades/{id}/workers               Prorab+
PUT      /workers/{id}/terminate              Prorab+    ← пробел №4

GET,POST /work-orders                         Prorab+ / Brigadir(own, read)
GET      /work-orders/mine                    Brigadir
POST     /work-orders/{id}/progress           Brigadir
PUT      /work-orders/{id}/payout-shares      Brigadir   ← §1.1
POST     /work-orders/{id}/submit             Brigadir
POST     /work-orders/{id}/accept | /reject   Prorab+    (reject: причина обязательна)
GET      /work-orders/{id}/log                Prorab+, Brigadir(own)

GET,POST /individual-tasks                    Brigadir
POST     /individual-tasks/{id}/start         Brigadir
POST     /individual-tasks/{id}/complete      Brigadir   → возвращает completedEarly
POST     /individual-tasks/{id}/bonus/approve Prorab+

GET,POST /material-requests                   Brigadir(C) / Prorab+(R)
POST     /material-requests/{id}/approve|reject Prorab+
POST     /material-requests/{id}/force-close  Prorab+    ← недопоставка, комментарий обязателен
GET,POST /material-consumption-reports        Brigadir(C) / Prorab+(R)
GET,POST /material-deliveries                 Prorab+

GET,POST /timesheets                          Prorab+ / Brigadir(own)
POST     /timesheets/check-in                 Brigadir
POST     /timesheets/{id}/check-out           Brigadir
POST     /timesheets/{id}/approve             Prorab+
GET,POST /absences                            Prorab+, Accountant  ← пробел №4

GET,POST /payroll                             Accountant, Owner
POST     /payroll/{id}/approve | /pay         Accountant, Owner
GET,POST /payroll-advances                    Accountant, Owner    ← пробел №3

GET      /dashboard/work-status               Prorab+
POST     /telegram/link/generate              Prorab+ (для Brigadir), self
POST     /telegram/webhook                    — (secret_token, §10.3)
```

**SignalR** `/hubs/work-orders`: `WorkOrderStatusChanged`, `AttendanceMarked`, `MaterialShortageReported`, `BonusPendingApproval`, `PayrollDraftReady`. Группы из claims, **никогда** из клиентского ввода. События — **после** `SaveChanges`, не до.

---

## 10. Telegram-бот

### 10.0 Регистрация бота — разовый шаг вне кода

Бот пишется в C# (`Telegram.Bot`, часть решения — §2), но чтобы он вообще существовал
как бот в Telegram, нужен токен. Получается не скачиванием, а разговором с `@BotFather`
**внутри Telegram**: `/newbot` → имя → username → в ответ токен вида
`123456:ABC-DEF...`. Токен — в конфигурацию (`TelegramBotOptions:Token`, из ENV, не в
файл), не в код. Один раз на весь проект, обычно делает Owner до начала Phase 2.

Дальше: `setWebhook(url, secret_token)` — тоже разовая настройка при первом деплое, не
часть повседневной разработки. `secret_token` — из §10.3, тот же принцип, что пароли:
ENV, не код.

### 10.1 Почему бот, а не второе веб-приложение

Объект: перчатки, солнце, нестабильный интернет. Telegram уже установлен, переживает разрывы, интерфейс знаком. Это архитектурное решение, не экономия. Бот — **единственный интерфейс бригадира** (у остальных ролей — прямой доступ к API, без встроенного UI).

Вызывает **те же MediatR handler'ы** напрямую (не HTTP-клиент к своему же API) — второй вход в тот же Application-слой, ноль дублирования правил.

### 10.2 Привязка аккаунта

Prorab/Owner генерирует код → бригадир `/start CODE` → `TelegramLink`.

- **TTL 15 минут** (`TelegramLinkCode.ExpiresAt`).
- **Одноразовый** — использован → `UsedAt`, повторный ввод → `TELEGRAM_LINK_CODE_INVALID` даже в пределах TTL.
- **≥8 символов, криптослучайный** (`RandomNumberGenerator`) — не 4 цифры, которые подбираются перебором.
- **Хранится хешем**, сверяется хешем — не строковым равенством.
- Без привязки бот не отвечает ни на что, кроме объяснения, что нужен код.

### 10.3 Идемпотентность и безопасность webhook ← ПРОБЕЛ №2, КРИТИЧНЫЙ

**Secret token.** `setWebhook(secret_token: ...)` → Telegram шлёт его в заголовке `X-Telegram-Bot-Api-Secret-Token` на каждом апдейте. Проверять **на каждом** запросе, отклонять `401` без него или при несовпадении (сравнение — `FixedTimeEquals`, не `==`). Без этого любой, кто узнал URL, шлёт поддельные апдейты **от лица бригадира**: фальшивый check-in, фальшивая заявка.

**Идемпотентность.** Telegram **гарантированно** доставляет апдейт повторно, если не получил `200` вовремя. Без защиты это: задвоенный check-in, дублирующаяся задача, две заявки на материал.

```
При входящем апдейте:
    1. INSERT INTO TelegramUpdateLog(UpdateId) — уникальный индекс
    2. Нарушение уникальности → апдейт уже обработан → вернуть 200, ничего не делать
    3. Иначе → обработать, вернуть 200
```

Именно `INSERT` с уникальным индексом, **не** `SELECT ... IF NOT EXISTS THEN INSERT` — второе даёт гонку при параллельной доставке. База — единственный арбитр.

Дополнительно:
- IP-фильтрация по диапазонам Telegram — **дополнительный** слой, не единственный (диапазоны меняются).
- Rate limiting на вебхук отдельно от API.
- Чистка `TelegramUpdateLog` старше 7 дней — фоновая задача. Telegram не переотправляет старше суток.
- **Всегда `200`**, даже при внутренней ошибке (ошибку залогировать, пользователю — сообщение). `500` → Telegram будет ретраить бесконечно.

### 10.4 Функциональность бригадира

**«Моя бригада»** — список рабочих, у каждого кнопка «⚪ Пришёл» → «🟢 Пришёл в 8:25 · Ушёл». Опоздание бот **не считает** — только показывает время, формула на backend. Себя отмечает там же. Вечером — авто-напоминание о незакрытых сменах.

**«Мои наряды»** — `Code`, заголовок, план/факт. «Отметить выполнение» → число (валидация: не больше остатка) → фото/пропустить. «Отправить на проверку» — доступно после ≥1 отметки; для сдельной бригады сначала требует распределить доли: бот по очереди спрашивает процент на каждого рабочего, показывает остаток («осталось распределить 30%»), не даёт отправить при сумме ≠ 100%.

**«Личные задачи»** — список по исполнителям, «Новая»: кому (кнопки — рабочие бригады + «Себе») → что → срок. Закрытие раньше срока → «Раньше срока! Премия? [Да] [Нет]» + явное «Не начислится, пока не подтвердит прораб».

**«Материалы»** — «Дневной отчёт» (материал → потрачено → не хватает; если >0 → «Оформить заявку? [Да] [Нет]») и «Заявка» отдельно.

**«Мой табель»** — свои дни, опоздания, ожидаемый вычет (посчитанный backend'ом), премии, авансы. Чужие ставки — никогда.

### 10.5 Что бот не делает

Не подтверждает премии, не принимает/отклоняет наряды, не выдаёт авансы, не создаёт `AbsenceRecord` — всё это требует другой роли, вызывающей API напрямую.

### 10.6 Язык ← пробел №11

Бот — **ru + tg** (таджикский), переключение `/language`, хранится в `TelegramLink.PreferredLanguage`. Компания в Таджикистане, бригадир — не обязательно свободно читает по-русски, а бот это его единственный интерфейс. Owner/Prorab/Accountant (офисные роли, прямой доступ к API) — ru-RU в ответах, этого достаточно для MVP. Ресурсы — `.resx`, не строки в коде.

---

## 11. Безопасность — полностью

### 11.1 Токены

- **Access JWT**, TTL **15 минут**, HMAC-SHA256, секрет ≥32 байт **из переменных окружения**, никогда не в закоммиченном `appsettings.json`.
- **Refresh** — отдельная таблица, **не** JWT. Хранится **хешем**. Поля: `ExpiresAt` (30 дней), `RevokedAt`, `ReplacedByTokenId`, `CreatedByIp`.
- **Ротация:** каждый `/refresh` выдаёт новый и отзывает старый.
- **Обнаружение кражи:** предъявлен уже использованный refresh → `AUTH_REFRESH_TOKEN_REUSED` + **отзыв всей цепочки** этого пользователя. Единственный надёжный признак кражи токена — использование дважды.
- `POST /auth/logout` — явный отзыв.
- **Деактивация:** `User.IsActive = false` проверяется middleware на каждом запросе по `UserId` из токена. Иначе уволенный работает ещё 15 минут.

### 11.2 Восстановление пароля ← ПРОБЕЛ №9

Для Owner/Prorab/Accountant API — **единственный** вход. Забыл пароль = потерял доступ к системе, где считается зарплата.

```
POST /auth/forgot-password { phone }
    → всегда 200, независимо от существования телефона (не раскрывать, кто есть в системе)
    → если есть: PasswordResetToken (crypto-random, хеш в базу, TTL 1 час, одноразовый)
    → доставка (в порядке приоритета):
        1. Telegram, если есть TelegramLink — бесплатно, без внешнего провайдера
        2. Нет TelegramLink → ручной сброс через Owner по API (тем же вызовом, что
           создаёт пользователей) — тоже бесплатно, но требует, чтобы кто-то с
           доступом Owner был на связи

POST /auth/reset-password { token, newPassword }
    → сверка хешем, проверка TTL/UsedAt
    → смена пароля + отзыв ВСЕХ refresh-токенов пользователя (пароль сменили — старые сессии умирают)
    → UsedAt = now
```

Rate limit: 3 запроса/час на телефон.

**SMS сознательно не используется как канал доставки** — платный внешний провайдер
ради функции, которая работает бесплатно через уже существующий Telegram-бот. Owner
и Accountant при первом входе (seed, §5.27) уже получают предложение привязать
Telegram — после этого сброс пароля для них тоже через бота, не только для Brigadir.
Если Telegram принципиально не привязан ни у кого — вариант 2 (ручной сброс) остаётся
рабочим без каких-либо затрат, просто медленнее.

### 11.3 Транспорт и заголовки

HTTPS обязателен, HTTP → редирект, HSTS. `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`.

**CORS** — нет встроенной веб-панели, поэтому браузерный клиент не является основным сценарием, но allow-list всё равно явный (пустой по умолчанию, конкретные origin через конфиг), а не `AllowAnyOrigin`. **Никогда** `AllowAnyOrigin` вместе с credentials, если браузерный клиент когда-нибудь понадобится.

### 11.4 Rate limiting

- `/auth/login` — **5 попыток / 15 минут** на IP+телефон → `429`. Без этого пароль подбирается перебором.
- `/auth/forgot-password` — 3/час на телефон.
- `/telegram/webhook` — свой лимит.
- Остальное — общий лимит на пользователя/IP.

Встроенный `Microsoft.AspNetCore.RateLimiting`, внешний сервис для MVP не нужен.

### 11.5 Авторизация — IDOR закрыт явно

**Три уровня, не один:**
1. `CompanyId` — global query filter в `OnModelCreating`, автоматика EF Core.
2. `BrigadeId` для Brigadir — **ручная** проверка в каждом handler'е. EF Core этого не сделает. `/review` обязан ловить пропуск как 🔴.
3. `ProrabObjectAssignment` для Prorab — **ручная** проверка (§1.2), с дефолтом «нет назначений = все объекты».

Ни один DTO не биндится на доменную сущность — только явные Request/Response-модели (защита от mass assignment).

### 11.6 PII и персональные данные ← пробел №11

`Worker.BirthDate`, `DocumentType`, `DocumentExpiryDate`, `Phone` — персональные данные. Раньше лежали открыто, без единого слова о защите.

- **Доступ:** `DocumentType` и `DocumentExpiryDate` видны Owner, Prorab и Accountant (§12). Номера документа в схеме `Worker` нет и не будет — маскировать (`****4567`) нечего, поэтому частичное сокрытие не реализуется. Brigadir этих полей не видит (`null` в Response DTO — нет доступа к эндпоинту работников). Разграничение — на уровне **Response DTO** (разные DTO под разные роли), не на стороне клиента. Решено с Ahmad, issue #25.
- **Логи:** явный `Serilog.Destructure.ByTransforming<WorkerDto>` — исключает PII-поля. Не «постараемся не логировать», а технический запрет.
- **Шифрование на уровне колонки** (`DocumentType`/`DocumentExpiryDate`) — **вне MVP**, зафиксировано осознанно: при одной компании и одной БД шифрование колонки защищает только от того, у кого уже есть доступ к базе, то есть почти ни от чего, а ключи усложняют бэкапы. Пересмотреть при появлении внешнего хостинга БД. §15 №10.
- **Экспорт/удаление данных рабочего** по требованию — вне MVP, но `Worker` уже soft-delete, физическое удаление возможно точечно.

### 11.7 Аудит

- **Неудачные логины** — отдельная категория Serilog для алертинга.
- **`AdminAuditLog`** (§5.16) — смена роли, деактивация, назначение бригадира, изменение `PayRate`, выдача аванса, проведение зарплаты. `TaskLog` — про бизнес-переходы, это — про власть. Разные таблицы.
- **Изменение `PayRate`** пишется всегда — это прямое влияние на деньги.

### 11.8 Инфраструктура ← пробел №11

- **Health-check:** `/health` (жив) + `/health/ready` (БД доступна). Без этого оркестратор не знает, когда рестартить.
- **Бэкапы:** `pg_dump` ежедневно + WAL-архивирование, retention 30 дней, **хранение вне того же сервера**. Восстановление **проверяется** раз в квартал — непроверенный бэкап не бэкап. Явно: это зарплатные данные, потеря = невозможность доказать, кто сколько заработал.
- **CI/CD:** build → test → `dotnet list package --vulnerable` → миграции ревьюятся человеком → деплой. Zero-warnings policy. Секреты — из секрет-хранилища, не из репозитория.
- **Мониторинг:** алерт на 5xx, на неудачные логины пачкой, на упавшую фоновую задачу (черновик зарплаты не сформировался = бухгалтер не заметит до конца месяца).

### 11.9 Хранение

- Пароли — **Argon2id** (`Konscious.Security.Cryptography`) или PBKDF2 ≥210k итераций SHA-256.
- Postgres — `SSL Mode=Require` вне локалки, отдельный пользователь БД с правами только на свою схему, **не** суперпользователь.
- Фото — подписанный URL с истечением, лимит размера, **allow-list** MIME (не blacklist), хранение вне веб-корня.

### 11.10 Вне MVP (осознанно)

Row-Level Security в Postgres поверх EF-фильтров (при одной компании — избыточно), WAF, пентест (**перед** первым реальным запуском на деньгах — обязателен, стоит в Phase 6), 2FA для Owner (стоит обсудить, если компания вырастет).

---

## 12. Матрица ролей

| Сущность | Owner | Prorab | Brigadir | Accountant |
|---|:---:|:---:|:---:|:---:|
| Company (настройки) | CRU | R | — | R |
| User | CRU | — | — | — |
| Customer | CRU | CRU | — | R |
| ConstructionObject | CRU | CRU (**назначенные**) | R (где своя бригада) | R |
| ProrabObjectAssignment | CRU | R | — | — |
| EstimateItem | CRU | CRU | R (own object) | R |
| Brigade | CRU | CRU | R (own) | R |
| Worker | CRU | CRU (**без PayRate**) | R (own brigade) | R (**с PayRate**) |
| Worker.Document* | R (полный) | — (скрыто) | — | R (полный) |
| WorkOrder | CRUA | CRUA | R(own) + submit | R |
| WorkOrderProgress | R | R | C (own) | — |
| WorkOrderPayoutShare | R | RA (**подтверждает**) | CU (own, при закрытии) | R |
| IndividualTask | R | R + bonus approve | CRUA (own brigade) | — |
| MaterialRequest | RA | RA | C (own) | R |
| MaterialConsumptionReport | R | R | C (own) | — |
| MaterialDelivery | CRU | CRU | — | R |
| Timesheet | R | RA | CU (own brigade) | R |
| AbsenceRecord | CRUA | CRUA | R (own brigade) | CRUA |
| PayrollEntry | RA | — | R (**своя строка**) | CRUA |
| PayrollAdvance | CRUA | — | R (свои) | CRUA |
| TaskLog / AdminAuditLog | R | R (TaskLog own objects) | R (TaskLog own) | R |

**C**reate · **R**ead · **U**pdate · **A**pprove. `own` = своя бригада/назначенный объект.
---

# ЧАСТЬ V. ПЛАН

## 13. Фазы

Порядок не произвольный: каждая следующая невозможна без предыдущей.

**Phase 0 — Foundation.** Solution (4 слоя), MediatR + FluentValidation + `Result<T>`, `Company` (первая сущность — от неё зависят все `CompanyId`), `User`, JWT + refresh **с ротацией**, Argon2id, rate limiting на логин **сразу** (не «потом»), `/health`, авто-миграция при старте, CI (build + test + vulnerable-scan, zero warnings).
*DoD:* логин работает (через API), роль в токене, `/health` отвечает, CI зелёный.

**Phase 1 — Объекты и бригады.** `Customer`, `ConstructionObject`, `EstimateItem`, `Brigade`, `Worker` (18+, `ShiftStartTime`, `UserId`), `ProrabObjectAssignment`, `AdminAuditLog`.
*DoD:* прораб создаёт объект, бригаду, назначает бригадира, добавляет рабочих через API; 18+ блокирует.

**Phase 2 — Наряды и задачи (ядро).** `WorkOrder`, `IndividualTask`, `TaskLog`, `Code`, state machines, `WorkOrderProgress`, upload фото, SignalR. **Telegram-бот v1**: привязка (TTL+хеш), secret_token, идемпотентность, «Моя бригада», «Мои наряды».
*DoD:* прораб создал наряд через API → бригадир в боте отметил и отправил → прораб принял через API → статус обновился у обоих в реальном времени (SignalR).

**Phase 3 — Явка, задачи, отсутствия.** `Timesheet` + `LateMinutes`, `AbsenceRecord`, `IndividualTask` полностью в боте, `CompletedEarly` + черновик премии, вечернее напоминание.
*DoD:* явка бригады через бот, опоздания считаются, больничный не даёт вычета.

**Phase 4 — Материалы.** `MaterialRequest` (+`QtyDelivered`, `PartiallyDelivered`), `MaterialConsumptionReport`, `MaterialDelivery`, авто-переход по частичным поставкам, `MaterialShortageReported`. Бот: «Материалы».
*DoD:* отчёт → заявка одним действием → прораб согласовал через API → частичная поставка отражена.

**Phase 5 — Зарплата.** `WorkOrderPayoutShare` (+ бот-флоу распределения), `PayrollEntry` со **всеми** слагаемыми (§8.0, 8.1, 8.7, 8.8), `PayrollAdvance`, фоновая задача черновиков, подтверждение премий, `/objects/{id}/cost-breakdown` (§8.10).
*DoD:* бухгалтер видит черновик с полной расшифровкой через API, аванс удержан, факт по объекту включает ФОТ.

**Phase 6 — Полировка и запуск.** `GET /dashboard/work-status`, фоновая просрочка, уведомления в Telegram всем ролям, `tg` в боте, бэкапы + **проверка восстановления**, мониторинг/алерты, **полный security-review (§11) и пентест — до первого реального использования на деньгах**.
*DoD:* система работает на реальном объекте, бэкап восстанавливается, алерты приходят.

## 14. Риски

- **Явка вручную бригадиром** — приписки без геолокации. Осознанно вне MVP; если станет проблемой — расширение готовой схемы (`Latitude`/`Longitude` в `Timesheet`), не переделка.
- **Бот — единственный канал бригадира.** Нет Telegram = блокер для бригады. Fallback: прораб может отметить явку/выполнение за бригадира через API, с `EnteredManually = true`. Это не костыль — это ровно то, что происходило до системы (прораб записывал в тетрадь), только теперь с аудитом. §15 №9 — решить, достаточно ли.
- **Сдельщина делится вручную** — риск злоупотребления бригадиром. Смягчение: доли видны прорабу, подтверждаются им, `Company.PieceworkDistributionMode` позволяет переключиться на автоматику без переписывания кода.
- **Отрицательный `FinalAmount`** при большом авансе — не баг. Требует решения бухгалтера, не автоматики.

## 15. Открытые вопросы — решать заказчику, не выдумывать

| # | Вопрос | Дефолт до решения |
|---|---|---|
| 1 | Ставка вычета за опоздание | пропорционально часовой (`PayRate/60`), настраивается |
| 2 | Формула премии за досрочность | вручную, не автоформула |
| 3 | `LatenessGraceMinutes` | 0 (любое опоздание считается) |
| 4 | Геолокация при явке | вне MVP |
| 5 | Роль Snabzhenets | вне MVP, место оставлено |
| 6 | **Переработка/сверхурочные** | **вне MVP — нет `ShiftEndTime` и нормы часов. Сначала данные (Phase 3+), потом формула** |
| 7 | История ставок (`WorkerPayRateHistory`) | не храним; смена `PayRate` действует с даты изменения |
| 8 | ~~SMS-провайдер для сброса пароля~~ | **Решено:** SMS не используется вообще (платно). Только Telegram + ручной сброс через Owner (оба бесплатны) |
| 9 | Fallback без Telegram у бригадира | прораб отмечает через API с `EnteredManually` |
| 10 | Шифрование PII на уровне колонки | вне MVP, пересмотреть при внешнем хостинге БД |
| 11 | Язык ответов API | ru-RU (бот — ru+tg) |
| 12 | 2FA для Owner | вне MVP |
| 13 | Неточная дата рождения рабочего (см. §8.3) | не разрешено — поле обязательно и точно, смягчение не в MVP |

---

## 16. Что закрыто этим документом

**Из ревью (11 пунктов):** ①CalculatedAmount §8.0 · ②webhook secret+идемпотентность §10.3 · ③аванс §8.8 · ④больничный/увольнение §8.9 · ⑤прорабы по объектам §1.2 · ⑥частичные поставки §8.2 · ⑦переработка — обоснованно вне MVP §15.6 · ⑧fallback без Telegram §16 · ⑨сброс пароля §11.2 · ⑩факт по объекту §8.10 · ⑪health/бэкапы/CI/язык/PII §11.6, §11.8, §10.6.

**Найдено дополнительно:** отсутствовала сущность `Company` при том, что `CompanyId` требовался везде · дележ сдельщины между рабочими не был описан вообще (наряд на бригаду, зарплата человеку — разрыв в центре расчёта) · `AdminAuditLog` отсутствовал (`TaskLog` покрывает только бизнес-переходы, не смену ролей/ставок) · `RefreshToken`/`PasswordResetToken` как сущностей не было · маскирование документов по ролям · табличные цифры для денежных колонок · цвет отсутствия отдельно от опоздания и прогула.

**Свёрнуто из:** `Brigadir1.zip` (PROMPT_Backend/Telegram), `Brigadir2.zip` (12 docs), ревью пробелов, все решения из истории обсуждения.
