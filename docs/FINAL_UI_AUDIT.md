# Final UI audit

| Route | Page | Role | Design reference | API | Loading | Empty | Error | Actions | Mobile | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| /login | Login | all | source login layout | auth API | yes | n/a | yes | login/logout/refresh | yes | ready |
| /dashboard | Dashboard | all | source cards/layout | dashboard API | yes | yes | retry | read-only aggregates | yes | ready |
| /objects | Objects | O/P/A | source tables/cards | objects API | yes | yes | retry | role-aware CRUD | yes | ready |
| /works | Work orders | all scoped | source tables/forms | work-order API | yes | yes | retry | lifecycle scoped | yes | ready |
| /brigades | Brigades | all scoped | source cards/tables | brigade APIs | yes | yes | retry | scoped actions | yes | ready |
| /attendance | Attendance | all scoped | source tables/forms | timesheets API | yes | yes | retry | role-aware | yes | ready |
| /inventory/material-requests | Requests | all scoped | source forms | material request API | yes | yes | retry | Brigadir creates | yes | ready |
| /inventory/write-offs | Consumption | all scoped | source forms | consumption API | yes | yes | retry | Brigadir reports | yes | ready |
| /payroll | Payroll | O/A | source cards/tables | payroll API | yes | yes | retry | backend money only | yes | ready |
| /reports | Reports | O/P/A | source charts/tables | reports API | yes | yes | retry | read-only | yes | ready |
| /users | Users | Owner | source tables/modals | users API | yes | yes | retry | Owner only | yes | ready |
| /settings | Settings | Owner | source form layout | company API | yes | n/a | retry | server-backed settings | yes | ready |

Removed from production navigation: Stock, Transfers, Budgets, Assignments, standalone Estimates, and mock Materials. They have no approved backend model.