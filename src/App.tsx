import { Navigate, Route, Routes } from "react-router-dom";
import { ToastProvider } from "./hooks/useToast";
import DashboardPage from "./pages/DashboardPage";
import ObjectsPage from "./pages/ObjectsPage";
import EstimatesPage from "./pages/EstimatesPage";
import BudgetsPage from "./pages/BudgetsPage";
import WorksPage from "./pages/WorksPage";
import BrigadesPage from "./pages/BrigadesPage";
import EmployeesPage from "./pages/EmployeesPage";
import AttendancePage from "./pages/AttendancePage";
import WarehousePage from "./pages/WarehousePage";
import PayrollPage from "./pages/PayrollPage";
import ReportsPage from "./pages/ReportsPage";
import UsersPage from "./pages/UsersPage";
import SettingsPage from "./pages/SettingsPage";

function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/objects" element={<ObjectsPage />} />
        <Route path="/estimates" element={<EstimatesPage />} />
        <Route path="/budgets" element={<BudgetsPage />} />
        <Route path="/works" element={<WorksPage />} />
        <Route path="/brigades" element={<BrigadesPage />} />
        <Route path="/employees" element={<EmployeesPage />} />
        <Route path="/attendance" element={<AttendancePage />} />
        <Route path="/warehouse" element={<WarehousePage />} />
        <Route path="/payroll" element={<PayrollPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </ToastProvider>
  );
}

export default App;
