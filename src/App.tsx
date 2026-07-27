import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ToastProvider } from "./hooks/useToast";
import { AuthProvider } from "./context/AuthContext";
import { LanguageProvider } from "./context/LanguageContext";
import { applyAppearanceSettings } from "./lib/applyAppearanceSettings";
import { ProtectedRoute, PublicOnlyRoute } from "./components/auth/RouteGuards";
import { useAuth } from "./context/AuthContext";
import { ROLE_HOME } from "./lib/auth/roleAccess";
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
import BrigadirProfilePage from "./pages/BrigadirProfilePage";

/**
 * "/profile" is currently only a real page for the Brigadir role (see BrigadirProfilePage).
 * Owner/administrator have blanket FULL_ACCESS in roleAccess.ts, which bypasses the normal
 * per-route whitelist that keeps every other role off this page — without this extra check
 * they'd land on the brigadir's personal profile instead of being sent home.
 */
function ProfileRoute() {
  const { user } = useAuth();
  if (user?.role === "brigadir") return <BrigadirProfilePage />;
  return <Navigate to={ROLE_HOME[user!.role]} replace />;
}

function App() {
  // Applies the persisted theme/density/sidebar/accent/animations once at real app startup, on
  // whatever route the user lands on — not just while the Settings page happens to be mounted.
  useEffect(() => {
    applyAppearanceSettings();
  }, []);

  return (
    <LanguageProvider>
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
              <Route path="/profile" element={<ProfileRoute />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
