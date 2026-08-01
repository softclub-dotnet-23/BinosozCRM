# Demo accounts

Development seed is enabled only by `appsettings.Development.json` and only when `ASPNETCORE_ENVIRONMENT=Development`. It never runs in Production. The demonstration password is `Demo12345!`; it is a deliberately non-production credential and is not present in production configuration.

| Role | Phone | Password |
|---|---|---|
| Owner | +992900000001 | Demo12345! |
| Prorab | +992900000002 | Demo12345! |
| Brigadir | +992900000003 | Demo12345! |
| Accountant | +992900000004 | Demo12345! |

The seed is idempotent. It creates one configured company and a complete presentation dataset with work orders, attendance, materials, payroll, dashboard and report records.