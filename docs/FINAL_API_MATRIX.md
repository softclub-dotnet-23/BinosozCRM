# Final API matrix

All errors use `{ error: { code, message, traceId } }`. Every list below returns `PagedResult<T>` (`items`, `page`, `pageSize`, `totalCount`) unless noted.

| Method / route | Request → response | Pagination | Roles | Web caller | Status / coverage |
|---|---|---|---|---|---|
| POST `/auth/login` | `LoginRequest` → `AuthTokens` | no | public | `authApi.login` | 200,400,401,429; auth HTTP tests |
| POST `/auth/refresh` | refresh token → `AuthTokens` | no | public | `authApi.refreshSession` | 200,401; refresh tests |
| POST `/auth/logout` | refresh token → empty | no | authenticated | `authApi.logout` | 204,401 |
| GET `/auth/me` | — → `CurrentUser` | no | all | `authApi.getCurrentUser` | 200,401 |
| GET/POST `/customers` | —/create → `Customer` | yes/ no | O,P; A R | `customersApi` | 200,201,400,401,403; objects/customers tests |
| GET/POST `/objects` | —/create → `ConstructionObject` | yes/no | O,P; A R | `objectsApi` | 200,201,404 |
| GET/PUT `/objects/{id}` | —/update → `ConstructionObject` | no | O,P; A R | `objectsApi` | 200,400,403,404 |
| GET `/objects/{id}/cost-breakdown` | — → `ObjectCostBreakdown` | no | O,P,A | `objectsApi` | 200,404; actual-cost tests |
| GET/POST `/brigades` | —/create → `Brigade` | yes/no | O,P; A R | `brigadesApi` | 200,201,403; role tests |
| GET/POST `/brigades/{id}/workers` | —/worker create → `Worker` | yes/no | O,P | `workersApi` | 200,201,404 |
| GET/POST `/work-orders` | —/create → `WorkOrder` | yes/no | O,P; A R | `workOrdersApi` | 200,201,403,404 |
| GET `/work-orders/mine` | — → `WorkOrder` | yes | Brigadir | `workOrdersApi` | 200,404; isolation tests |
| POST work-order lifecycle/progress | command/form → `WorkOrder`/`Progress` | no | role-specific | `workOrdersApi` | 200,400,403,404; state tests |
| GET/POST `/timesheets` | —/manual create → `Timesheet` | yes/no | O,P; B check-in; A R | `timesheetsApi` | 200,201,403,404 |
| POST timesheet check-in/out/approve | command → `Timesheet` | no | B/B/P | `timesheetsApi` | 200,400,403,404 |
| GET/POST `/material-requests` | —/create → `MaterialRequest` | yes/no | O,P,A R; B C | `materialRequestsApi` | 200,201,403,404 |
| request workflow endpoints | command → `MaterialRequest` | no | O,P | `materialRequestsApi` | 200,400,403,404 |
| GET/POST `/material-deliveries` and `/document` | request → delivery/document | yes/no | O,P; A R | `materialDeliveriesApi` | 200,201,400,403,404 |
| GET/POST `/material-consumption-reports` | —/report → report | yes/no | O,P,A R; B C | `materialConsumptionApi` | 200,201,403,404 |
| GET/POST `/payroll`, advances and workflow | command → payroll DTO | yes/no | O,A | `payrollApi` | 200,201,400,403,404; payroll tests |
| GET `/dashboard/work-status` | query → `DashboardWorkStatus` | no | O,P,B,A | `dashboardApi` | 200,403,404; dashboard scope tests |
| GET `/reports/actual-cost` | period → `ActualCostReport` | no | O,P,A | `reportsApi` | 200,400,403; report tests |
| GET/POST/PUT `/users` | command → user DTO | yes/no | Owner | `usersApi` | 200,201,400,403; users tests |
| GET/PUT `/companies/current` | update → company DTO | no | Owner | company client pending | 200,400,403; settings tests |