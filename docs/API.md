# API — БригадаCRM

`/api/v1`, REST, JSON. Закрытая модель безопасности — **404, не 403** на чужую сущность. `Brigadir` изолирован по `BrigadeId` на уровне Application-handler'а.

## Конвенции

### Формат ошибки
```json
{
  "error": {
    "code": "WORK_ORDER_INVALID_TRANSITION",
    "message": "Cannot move from Assigned to Accepted directly.",
    "traceId": "..."
  }
}
```

### Пагинация
`?page=1&pageSize=20` (max 100):
```json
{ "items": [...], "page": 1, "pageSize": 20, "totalCount": 137 }
```

### Коды состояния
200/201 — успех · 400 — валидация (18+, недопустимый переход) · 401 — не аутентифицирован · 404 — не найдено или нет доступа · 409 — конфликт (`xmin`).

## Эндпоинты

| Метод | Путь | Роль | Назначение |
|---|---|---|---|
| POST | `/auth/login` | — | Телефон + пароль → JWT |
| POST | `/auth/refresh` | auth | Обновление токена |
| GET/POST | `/objects` | Prorab+ | Объекты |
| GET/PUT | `/objects/{id}` | Prorab+ | Карточка объекта |
| GET/POST | `/objects/{id}/estimate-items` | Prorab+ | Смета |
| GET/POST | `/brigades` | Prorab+ | Бригады |
| PUT | `/brigades/{id}/brigadir` | Prorab+ | Назначить бригадира |
| GET/POST | `/brigades/{id}/workers` | Prorab+ | Состав бригады |
| GET/POST | `/work-orders` | Prorab+ (создание), Brigadir (свои) | Наряды |
| GET | `/work-orders/mine` | Brigadir | Наряды своей бригады |
| POST | `/work-orders/{id}/progress` | Brigadir | Отметка выполнения |
| POST | `/work-orders/{id}/submit` | Brigadir | → OnReview |
| POST | `/work-orders/{id}/accept` \| `/reject` | Prorab+ | Приёмка (Reject требует причину → `TaskLog.Comment`) |
| GET | `/work-orders/{id}/log` | Prorab+, Brigadir(own) | История переходов (`TaskLog`) |
| GET/POST | `/individual-tasks` | Brigadir | Личные задачи |
| POST | `/individual-tasks/{id}/start` \| `/complete` | Brigadir | `complete` возвращает `completedEarly` |
| POST | `/individual-tasks/{id}/bonus/approve` | Prorab+ | Подтверждение премии |
| GET/POST | `/material-requests` | Brigadir (создание), Prorab+ | Заявки |
| POST | `/material-requests/{id}/approve` \| `/reject` | Prorab+ | |
| POST | `/material-deliveries` | Prorab+ | Поставка |
| GET/POST | `/material-consumption-reports` | Brigadir (создание), Prorab+ | Дневной отчёт |
| GET/POST | `/timesheets` | Prorab+ (приёмка), Brigadir (свои) | Табель |
| POST | `/timesheets/{id}/check-in` \| `/check-out` | Brigadir | Явка своей бригады и себя |
| POST | `/timesheets/{id}/approve` | Prorab+ | |
| GET | `/dashboard/work-status` | Prorab+ | Комбинированный статус |
| GET/POST | `/payroll` | Accountant, Owner | Расчёт за период |
| POST | `/payroll/{id}/approve` \| `/pay` | Accountant, Owner | |
| POST | `/telegram/link/generate` | Prorab+ (для Brigadir), сам User (для себя) | Одноразовый код для `/start CODE` в боте |

SignalR-хаб `/hubs/work-orders`: `WorkOrderStatusChanged`, `AttendanceMarked` (LateMinutes > порога), `MaterialShortageReported`. Слушатели — REST/SignalR-клиенты и Telegram-шлюз (`docs/TelegramBot.md`), один источник события.
