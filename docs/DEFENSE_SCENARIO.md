# Defense scenario (7–10 minutes)

1. Log in as **Администратор** and show the dashboard.
2. Open Objects and Work orders; show real server data and lifecycle controls.
3. Show Brigades, employees, attendance, requests, receipts and write-offs.
4. Open Payroll and Reports: all amounts come from the API.
5. Log out; log in as Brigadir. Show the scoped dashboard, **Моя бригада**, own work orders, attendance, a material request and a consumption report.
6. Log in as Accountant. Show Dashboard, read-only operational data, Payroll and Reports; point out absent mutation controls.
7. Log in as Prorab. Show operational work-order flow and absence of Owner-only Users/Settings.
8. Run `npm run lint`, `npm run build`, and `dotnet test backend/backend.slnx -c Release --no-build`.

Legacy inventory/budget modules are intentionally absent from the navigation because no server model exists; the UI does not simulate them.