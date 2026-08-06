# BACKEND INTEGRATION MATRIX — BINOSOZ (БригадаCRM)

Статус: **100% done**. Все рабочие маршруты подключены к реальному backend, ноль mock-данных.

Backend: ASP.NET Core (.NET 9), Clean Architecture, CQRS/MediatR, PostgreSQL, `/api/v1`.
Роли backend (единственные, которые выдаёт JWT): **Owner, Prorab, Brigadir, Accountant**.

## Ключевые решения (зафиксированные допущения)

1. **Роли frontend сокращены до 4 backend-ролей.** Роли `administrator`, `worker`,
   `storekeeper` существовали только в mock-модели. По MASTER.md §4: Worker — «не
   пользователь системы» (осознанное решение), Snabzhenets — вне MVP. `administrator`
   дублировал Owner. Все три удалены из `UserRole`.
2. **Модуль `/worker/*` (9 страниц) удалён из роутинга** — ни один реальный JWT не может
   иметь роль `worker`, страницы недостижимы. Код страниц удалён вместе с mock-данными.
3. **Модуль `/inventory/*` (склад: materials, receipts, write-offs, transfers, stock)
   удалён** — в backend-домене нет складского учёта; поток материалов =
   request → delivery → consumption, покрыт страницами /material-requests,
   /material-deliveries, /material-consumption-reports.
4. **8 orphan-страниц удалены** (не были в роутинге): BrigadirAssignments/Dashboard(старая
   fake-версия)/Materials/Salary, PayrollPage. `BrigadirAttendancePage` удалена отдельно —
   100% фиктивные данные, `/attendance` теперь одна страница на все роли (backend сам
   скоупит выдачу по роли в `ListTimesheetsQuery`).
5. **Новый backend (Этап 5):**
   - `UsersController`: `GET /users/me` (все роли), `GET/POST /users`,
     `PUT /users/{id}/block|unblock` (Owner, `AdminAuditLog` пишется автоматически через
     `AdminAuditSaveChangesInterceptor` + вручную для `UserCreated`).
   - `WorkersController`: `GET /workers` (по компании, Owner/Prorab/Accountant, для
     /employees), `GET /brigades/mine/workers` (Brigadir, своя бригада — единственный
     Brigadir-доступный ростер, раньше такого пути не было вообще).
   - `BrigadesController`: `PUT /brigades/{id}/active` — тонкий слой над уже
     существовавшими `Brigade.Activate()/Deactivate()`, которые не были никуда подключены.
6. **Wire-формат enum'ов** — числовой (нет JsonStringEnumConverter), исключения:
   `AuthTokensDto.Role`, `StatusCountDto.Status`, `TaskLogDto.FromStatus/ToStatus` (строки).
   См. `frontend/src/services/types.ts`.
7. **Ошибки** — envelope `{ error: { code, message, traceId } }`; 404 вместо 403 на чужую
   сущность (закрытая модель).
8. **Найден и исправлен реальный auth-баг** (обнаружен live E2E-прогоном, не статическим
   ревью): `ForcePasswordChangeMiddleware` не пропускал `POST /auth/refresh`. Frontend
   (`authService.changePassword`) всегда делает `PUT /auth/change-password` →
   `POST /auth/refresh` (получить токен без устаревшего `force_password_change` claim).
   Смена пароля физически проходила (200), но follow-up refresh 403'ился — пользователь
   технически сменил пароль, но UI показывал ошибку и не пускал дальше экрана смены пароля.
   Исправлено добавлением `/api/v1/auth/refresh` в allowlist + тестовый кейс в
   `ForcePasswordChangeMiddlewareTests`.
9. **Некоторые страницы существенно упрощены относительно mock-версии** (rule: адаптировать
   UI к реальной domain-модели, не наоборот) — см. столбец «Frontend-изменения» для деталей:
   Objects/Brigades/Employees потеряли decorative-only mock-поля (progress%, foreman,
   city, shift, memberRole и т.п.), которых нет в backend DTO.

## Матрица

| Route / Page | Данные | Backend endpoint(s) | Роли | Статус |
|---|---|---|---|---|
| /login | auth | POST /auth/login | все | done |
| /change-password-required | смена пароля | PUT /auth/change-password + POST /auth/refresh | все | done (баг исправлен, см. п.8) |
| /profile | текущий пользователь | GET /users/me (+ GET /brigades/mine/workers для Brigadir) | все | done |
| /dashboard | KPI, объекты, статусы работ, зарплата | GET /objects, GET /dashboard/work-status, GET /payroll | Owner,Prorab (Brigadir → отдельная реальная версия) | done |
| /objects | объекты | GET/POST /objects, GET/PUT /objects/{id}, GET /objects/{id}/cost-breakdown | Owner,Prorab | done |
| /estimates | сметы | GET/POST /objects/{id}/estimate-items | Owner,Prorab | done |
| /budgets | бюджет vs факт | GET /objects/{id}/cost-breakdown (агрегация по всем объектам) | Owner,Prorab | done |
| /works | наряды (управление) | GET/POST /work-orders + assign/accept/reject/close | Owner,Prorab | done |
| /work-orders | наряды (исполнение) | GET /work-orders/mine + start/submit/rework/progress | Brigadir | wired (уже было) |
| /individual-tasks | личные задачи | /individual-tasks + start/complete/bonus/approve | Brigadir; bonus: Owner,Prorab | wired (уже было) |
| /timesheets | табели | /timesheets + check-in/out/approve | O,P,B; approve: Prorab | wired (уже было) |
| /attendance | явка (все роли, единая страница) | GET /timesheets (backend скоупит по роли) + approve | Owner,Prorab,Brigadir | done |
| /material-requests | заявки | /material-requests + approve/reject/mark-ordered/force-close | B(create), O,P | wired (уже было) |
| /material-deliveries | поставки | /material-deliveries | Owner,Prorab | wired (уже было) |
| /material-consumption-reports | расход | /material-consumption-reports | B(create), O,P | wired (уже было) |
| /absences | отсутствия | /absences | Owner,Prorab,Accountant | wired (уже было) |
| /payroll-entries (+ /payroll) | зарплата | /payroll + approve/pay/adjust | O,Acc,B(свои) | wired (уже было) |
| /payroll-advances | авансы | /payroll-advances | Owner,Accountant | wired (уже было) |
| /brigades | бригады | GET/POST /brigades, PUT .../brigadir, PUT .../active (новый) | O,P; brigadir/active: Owner | done |
| /brigades/composition | состав одной бригады | GET/POST /brigades/{id}/workers, PUT /workers/{id}/terminate | Owner,Prorab | done |
| /brigades/assignments | прораб↔объект | GET/POST /objects/{id}/prorabs | Owner | done |
| /employees | сотрудники (по компании) | GET /workers (новый) | Owner,Prorab,Accountant | done |
| /users | учётные записи | GET/POST /users, PUT .../block|unblock (все новые) | Owner | done |
| /settings | настройки компании (вкладка «Компания») | GET/PUT /companies/current | все(R), Owner(W) | done |
| /reports | сводные отчёты (объекты/наряды/зарплата/бригады) | композиция dashboard/work-status, cost-breakdown, /payroll, /brigades, /workers | Owner,Prorab,Accountant (Brigadir → своя реальная версия) | done |
| /worker/* (9 страниц) | — | — | роль не существует в backend | removed |
| /inventory/* (5 страниц) | — | — | нет домена склада в backend | removed |
| orphan-страницы (8 файлов, включая BrigadirAttendancePage) | — | — | недостижимы или 100% fake-данные | removed |

## SignalR — done

Hub `/hubs/work-orders` реализован в backend (Api/Hubs/WorkOrdersHub.cs). Реально
реализованные события (Api/Realtime/*.cs): `WorkOrderStatusChanged`, `WorkOrderOverdue`,
`IndividualTaskOverdue`, `MaterialShortageReported`. `AttendanceMarked` из старых заметок
(AGENTS.md, frontend/Api.md) не реализован — `frontend/Api.md` исправлен, `AGENTS.md`
(backend charter) не трогали, зафиксировано здесь как известное расхождение документации.

Frontend: `@microsoft/signalr` установлен; `frontend/src/hooks/useWorkOrdersHub.ts` — одно
общее соединение на весь защищённый роут (смонтировано в `ProtectedRoute`), JWT через
`accessTokenFactory` (query-string, как требует backend), `withAutomaticReconnect()`,
корректный `stop()` при размонтировании/логауте, обработчики инвалидируют те же React Query
ключи, что использует соответствующая страница.

## Auth — done, verified live

login → JWT (15 мин) + refresh rotation (одноразовый, reuse detection) → logout (revoke),
change-password + принудительный refresh (см. баг п.8 выше, исправлен), block/unblock.
Проверено live (backend `dotnet run` + Postgres + `curl`, frontend `vite dev` + Playwright):
верный/неверный пароль, refresh rotation, reuse detection на старом токене, invalid token,
logout, unauthenticated 401, role-gated 403 (Prorab → /users), block → login отклонён,
unblock → login снова работает, force-password-change полный цикл для Owner и Brigadir,
CORS preflight с фронтенд-origin, SignalR negotiate с JWT в query-string.
