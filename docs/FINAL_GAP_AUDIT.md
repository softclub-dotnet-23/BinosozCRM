# Final gap audit — web-first integration

Audit date: 2026-08-02. Status reflects the `feature/shahrom-rich-ui-integration` branch after commit `104c5b6`.

| Section | Frontend route/page | Frontend API client | Backend endpoint | Roles | Status | Gap | Resolution |
|---|---|---|---|---|---|---|---|
| Auth | `/login` | `authApi` | `/auth/login`, refresh, logout, me, password flows | all | connected | demo credentials not documented | seed/docs block |
| Dashboard | `/dashboard` | `dashboardApi` | `GET /dashboard/work-status` | all | partial | page-level aggregates still limited to statuses | use server result; document scope |
| Customers | no dedicated route | `customersApi` | `GET,POST /customers` | Owner/Prorab; Accountant R | backend unused | no visible production page, no update/delete domain API | hide from navigation until product scope adds it |
| Objects | `/objects` | `objectsApi` | objects, estimates, cost breakdown | Owner/Prorab; Accountant R | partial | raw customer ids need lookup/name projection | documented contract gap |
| WorkOrders | `/works` | `workOrdersApi` | list/mine/lifecycle/progress/log | all scoped | connected | no display-name projection for object/brigade | lookups batch resolves ids |
| Brigades | `/brigades` | `brigadesApi` | `GET,POST`, assignment, activation | Owner/Prorab; Accountant R; Brigadir own view via worker scope | partial | Brigadir page must avoid company list | dedicated Brigadir team uses scoped workers |
| Workers | `/employees` | `workersApi` | brigade worker CRUD/lifecycle | Owner/Prorab | partial | Accountant has no worker roster by design | payroll DTO includes worker name |
| Attendance | `/attendance` | `timesheetsApi` | list, manual, check-in/out, approve | Owner/Prorab/Brigadir; Accountant R | connected | role dependent lookup calls can yield 403 | Brigadir page uses scoped lookups |
| Material requests | `/inventory/material-requests` | `materialRequestsApi` | create/list/workflow | Brigadir C; Owner/Prorab workflow; Accountant R | partial | frontend lacked Brigadir create client | add contract/client |
| Deliveries | `/inventory/receipts` | `materialDeliveriesApi` | list/create/document | Owner/Prorab C; Accountant R | connected | no Brigadir access required | none |
| Consumption/write-offs | `/inventory/write-offs` | `materialConsumptionApi` | report/list | Brigadir C; Owner/Prorab/Accountant R | partial | client was read-only and page stated Telegram-only | add report client and remove Telegram claim |
| Payroll | `/payroll` | `payrollApi` | entries/advances/workflow | Owner/Accountant | connected | no Brigadir access (intentional) | enforced policy |
| Reports | `/reports` | `reportsApi` | `GET /reports/actual-cost` | Owner/Prorab/Accountant | connected | no Stock/Transfer domain aggregate | excluded from production scope |
| Users | `/users` | `usersApi` | users lifecycle | Owner | connected | none | tested |
| Company settings | `/settings` | none for company settings | `GET,PUT /companies/current` | Owner | mock/localStorage | page contains visual-only preferences/integrations | expose only real company settings; hide unsupported controls |
| Assignments | `/brigades/assignments` | mock repository | object-prorab endpoints exist | Owner | mock | frontend not wired | remove from production navigation pending integration |
| Estimates | `/estimates` | mock data | object estimate endpoints | Owner/Prorab; Accountant R | mock | page not wired to object-scoped API | remove from production navigation pending integration |
| Budgets | `/budgets` | mock data | object cost breakdown | Owner/Prorab/Accountant R | partial | no company-wide budget aggregate | remove from production navigation pending aggregate decision |
| Stock | `/inventory/stock` | mock data | none | — | out of scope | no Stock entity | remove from production navigation |
| Transfers | `/inventory/transfers` | mock data | none | — | out of scope | no Transfer entity | remove from production navigation |

All API entities are company-filtered by the EF `CompanyId` filter. Prorab object and Brigadir brigade scopes are handler-level checks; foreign resources use a not-found business result rather than exposing their existence.