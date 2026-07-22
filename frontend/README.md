# BINOSOZ — Construction Management CRM

A premium, production-quality frontend for a construction management CRM, built to match a
provided desktop design reference. Fully typed, componentized React app with no backend —
all data is local, typed mock data.

## Tech stack

- React 19 + Vite
- TypeScript (strict mode)
- React Router DOM
- Tailwind CSS v4
- Recharts (charts)
- Lucide React (icons)
- date-fns (dates)

## Getting started

```bash
npm install
npm run dev
```

The app runs at `http://localhost:5173` (or the next available port).

Other scripts:

```bash
npm run build    # type-check + production build
npm run preview  # preview the production build
npm run lint     # oxlint
```

## Routes

| Route | Status |
|---|---|
| `/dashboard` | Fully implemented — Обзор компании |
| `/objects` | Fully implemented — Объекты |
| `/budgets`, `/works`, `/brigades`, `/employees`, `/attendance`, `/warehouse`, `/payroll`, `/reports`, `/users`, `/settings` | Polished placeholder screens using the shared design system |

## Project structure

```
src/
  components/
    layout/     AppLayout, Sidebar, Header
    ui/         Button, Card, Modal, Drawer, Toast, StatusBadge, ProgressBar, MetricCard, ...
    charts/     BudgetChart, ProgressChart, ObjectBudgetChart, ChartTooltip
    tables/     DataTable, ObjectStateTable, AttentionList
    dashboard/  PayrollCard, BudgetSummaryBlocks
    objects/    ObjectSummary, TaskList, FilterDrawer, AddObjectModal
  pages/        One page component per route
  data/         Typed mock data (objects, tasks, dashboard KPIs)
  hooks/        useToast, useMediaQuery, useOnClickOutside
  types/        Shared TypeScript types
  utils/        Formatting, date, className helpers
```

## Notable interactions

- Sidebar navigation with active-route highlighting, tablet icon-collapse, mobile off-canvas menu.
- Objects page: search, status tabs, filter drawer, sortable/paginated table, row selection with a
  live-updating summary panel, add-object modal with inline validation, row actions (view/edit/delete).
- Dashboard: period-filtered budget chart, attention list, payroll approval flow (approve with
  confirmation, return with a comment) with toast notifications.
