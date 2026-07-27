# БригадаCRM (BinosozCRM)

Backend и Telegram-бот для строительной компании: учёт нарядов, бригад,
рабочих, посещаемости, материалов и зарплаты. Веб-панели нет по осознанному
решению — Owner/Prorab/Accountant работают напрямую через REST API, Brigadir —
исключительно через Telegram-бота (подробности: `docs/MASTER.md` §0).

## Стек

- **.NET 10**, C# 13, Clean Architecture: `Domain → Application → Infrastructure → Api/TelegramBot`
- **CQRS** через MediatR — каждая команда/запрос своим handler'ом, `Result<T>` для ожидаемых бизнес-ошибок
- **PostgreSQL 16** + **EF Core 10** (Npgsql) — автомиграция при старте (`Database.MigrateAsync()`)
- **SignalR** (`/hubs/work-orders`) — уведомления в реальном времени о смене статусов
- **Auth:** JWT (access 15 мин) + refresh-токен с ротацией, Argon2id
- **Валидация:** FluentValidation на каждом request DTO
- **Логирование:** Serilog, структурированное, без PII
- **Тесты:** xUnit + FluentAssertions + Testcontainers (реальный Postgres в Docker, без InMemory-провайдера)

## Структура проекта

```
backend/
├── Domain/            доменные сущности, инварианты, без зависимостей от инфраструктуры
├── Application/        MediatR-команды/запросы, бизнес-логика, CQRS
├── Infrastructure/      EF Core, миграции, внешние сервисы (файлы, realtime, авторассылки)
├── Api/                REST API, контроллеры, SignalR-хаб, аутентификация
├── TelegramBot/         точка входа Telegram-бота (интерфейс бригадира)
└── Tests/
    └── Api.IntegrationTests/   интеграционные тесты против реального Postgres
```

## Запуск локально

Требуется .NET 10 SDK и Docker (для Postgres и для интеграционных тестов).

```bash
# 1. Восстановить зависимости
dotnet restore backend/backend.slnx

# 2. Поднять Postgres (или использовать свой инстанс) и задать строку подключения
#    в backend/Api/appsettings.Development.json → ConnectionStrings:Default

# 3. Применить миграции (опционально — Api и так мигрирует автоматически при старте)
dotnet ef database update --project backend/Infrastructure --startup-project backend/Api

# 4. Запустить API
dotnet run --project backend/Api
```

## Тесты

```bash
dotnet build backend/backend.slnx
dotnet test backend/backend.slnx --no-build
```

Интеграционные тесты (`Tests/Api.IntegrationTests`) поднимают настоящий
PostgreSQL через Testcontainers — для их прогона нужен работающий Docker.

## Документация

Полная спецификация проекта — `docs/MASTER.md` (сущности, бизнес-правила,
формулы расчёта, API, роли, безопасность). Текущий статус разработки —
`docs/PROGRESS.md`.
