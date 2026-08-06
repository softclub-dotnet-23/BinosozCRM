# INTEGRATION PROGRESS — BINOSOZ frontend ↔ backend

Статус: **завершено**. При новой сессии/context compaction — прочитать этот файл и
`docs/BACKEND_INTEGRATION_MATRIX.md`.

## Контекст сессии 2026-08-06

- Рабочая директория `/Users/burble/Downloads/frontend` реструктурирована в монорепо:
  `frontend/` (бывший корень, ветка Hadyatullo — самый продвинутый фронт), `backend/` +
  `docs/` + `.github/` + `AGENTS.md` извлечены из origin/master (2806fc8) через
  `git archive`. Ветка Hadyatullo — orphan, общего предка с master нет.
  Бэкап до реструктуризации: `~/Downloads/BinosozCRM-frontend-backup-20260806-151426.tar.gz`.
- Коммиты НЕ делались (запрет пользователя). Push/pull/merge — запрещены и AGENTS.md.

## Известная преимствующая (pre-existing) проблема backend-тестов — не наша

16 из 134 backend-тестов падают на `Npgsql.PostgresException 23503` (FK violation) в файлах,
которые эта сессия не создавала и не трогала: `WorkOrderIsolationTests`,
`WorkerTerminationLifecycleTests`, `SeedDataServiceTests`, `ProrabObjectAssignmentIsolationTests`,
`IndividualTaskIsolationTests`. Тестовый хелпер `FixedCurrentUserService(companyId,
Guid.NewGuid(), role)` использует случайный `UserId`, не подкреплённый реальной строкой в
`Users`, а несколько command-хендлеров пишут FK на `Users` (`AssignedByUserId`,
`ActorUserId`). Воспроизведено изолированным прогоном — не флейк. Все 9 новых тестов этой
сессии проходят зелёными.

## Чеклист — всё выполнено

- [x] Монорепо-структура
- [x] Аудит backend/frontend, `docs/BACKEND_INTEGRATION_MATRIX.md`
- [x] CLAUDE.md заменён (AMBRE → BINOSOZ), `/Users/burble/Downloads/CLAUDE.md` указывает сюда
- [x] Этап 2: demoCredentials.ts, BackendSessionRequired, isBackendSession, роли
      administrator/worker/storekeeper, страницы worker/*(9) + inventory/*(5) + 8
      orphan-страниц, `data/mock*.ts`(24 файла), `data/repositories.ts`,
      `createCollectionRepository.ts`, `useRepositoryState.ts` — все удалены. Плюс ещё ~100
      orphan-компонентов/utils, найденных transitive-reachability скриптом от pages/ — удалены.
      Итого 126+ файлов.
- [x] Этап 3: единый API-слой — objectsApi/customersApi/brigadesApi/workersApi/usersApi/
      companyApi/workOrdersApi(расширен) + соответствующие hooks/api/*
- [x] Этап 4: ВСЕ 24 маршрута подключены к реальному backend (см. матрицу) —
      Dashboard, Objects, Estimates, Budgets, Works, WorkOrders, IndividualTasks, Timesheets,
      Attendance, MaterialRequests/Deliveries/ConsumptionReports, Absences, PayrollEntries/
      Advances, Brigades/Composition/Assignments, Employees, Users, Settings, Reports,
      Profile — включая Brigadir-варианты (BrigadirDashboard/Team/Profile/Reports).
- [x] Этап 5: новые backend endpoints —
      GET /users/me, GET/POST /users, PUT /users/{id}/block|unblock,
      GET /workers (company-wide), GET /brigades/mine/workers (Brigadir),
      PUT /brigades/{id}/active — все с тестами.
- [x] Этап 6: Dashboard на реальных агрегатах (объекты, бюджет, зарплата, dashboard/work-status)
- [x] Этап 7: auth end-to-end проверен live (curl + Playwright) — см. отчёт ниже. Найден и
      исправлен реальный баг: `ForcePasswordChangeMiddleware` не пропускал `/auth/refresh`,
      из-за чего смена пароля технически проходила, но UI застревал на экране смены пароля
      с ложной ошибкой. Исправлено + добавлен тестовый кейс.
- [x] Этап 8: SignalR подключен — `@microsoft/signalr`, `hooks/useWorkOrdersHub.ts`,
      смонтирован в `ProtectedRoute`. `Api.md` исправлен (убран несуществующий
      `AttendanceMarked`, добавлены реальные `WorkOrderOverdue`/`IndividualTaskOverdue`).
- [x] Этап 9: 0 TypeScript ошибок, 0 lint errors (28 pre-existing-паттерн warnings), 0 `any`,
      0 TODO/FIXME, backend 0 warnings/errors.
- [x] Этап 10: live e2e прогон backend (dotnet run + Postgres) + frontend (vite dev) +
      Playwright — логины Owner/Prorab/Brigadir, RBAC, CRUD, refresh rotation + reuse
      detection, block/unblock, force-password-change, CORS, SignalR negotiate.

Финальный отчёт — сообщение ассистента в конце сессии (не отдельный файл, по инструкции
пользователя "не создавай документы, если явно не попросили").
