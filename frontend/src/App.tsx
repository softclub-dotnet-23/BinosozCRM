import { Navigate, Route, Routes } from "react-router-dom";
import { ToastProvider } from "./hooks/useToast";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute, PublicOnlyRoute } from "./components/auth/RouteGuards";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ObjectsPage from "./pages/ObjectsPage";
import EstimatesPage from "./pages/EstimatesPage";
import BudgetsPage from "./pages/BudgetsPage";
import WorksPage from "./pages/WorksPage";
import BrigadesPage from "./pages/BrigadesPage";
import BrigadeCompositionPage from "./pages/BrigadeCompositionPage";
import AssignmentsPage from "./pages/AssignmentsPage";
import EmployeesPage from "./pages/EmployeesPage";
import AttendancePage from "./pages/AttendancePage";
import MaterialsPage from "./pages/MaterialsPage";
import ReceiptsPage from "./pages/ReceiptsPage";
import WriteOffsPage from "./pages/WriteOffsPage";
import TransfersPage from "./pages/TransfersPage";
import StockPage from "./pages/StockPage";
import PayrollPage from "./pages/PayrollPage";
import ReportsPage from "./pages/ReportsPage";
import UsersPage from "./pages/UsersPage";
import SettingsPage from "./pages/SettingsPage";

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <LoginPage />
              </PublicOnlyRoute>
            }
          />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/objects" element={<ObjectsPage />} />
            <Route path="/estimates" element={<EstimatesPage />} />
            <Route path="/budgets" element={<BudgetsPage />} />
            <Route path="/works" element={<WorksPage />} />
            <Route path="/brigades" element={<BrigadesPage />} />
            <Route path="/brigades/composition" element={<BrigadeCompositionPage />} />
            <Route path="/brigades/assignments" element={<AssignmentsPage />} />
            <Route path="/employees" element={<EmployeesPage />} />
            <Route path="/attendance" element={<AttendancePage />} />
            <Route path="/warehouse" element={<Navigate to="/inventory/materials" replace />} />
            <Route path="/inventory/materials" element={<MaterialsPage />} />
            <Route path="/inventory/receipts" element={<ReceiptsPage />} />
            <Route path="/inventory/write-offs" element={<WriteOffsPage />} />
            <Route path="/inventory/transfers" element={<TransfersPage />} />
            <Route path="/inventory/stock" element={<StockPage />} />
            <Route path="/payroll" element={<PayrollPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
