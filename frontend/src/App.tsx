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
import ChangePasswordRequiredPage from "./pages/ChangePasswordRequiredPage";
import DashboardPage from "./pages/DashboardPage";
import ObjectsPage from "./pages/ObjectsPage";
import EstimatesPage from "./pages/EstimatesPage";
import BudgetsPage from "./pages/BudgetsPage";
import WorksPage from "./pages/WorksPage";
import IndividualTasksPage from "./pages/IndividualTasksPage";
import TimesheetsPage from "./pages/TimesheetsPage";
import MaterialRequestsPage from "./pages/MaterialRequestsPage";
import MaterialConsumptionReportsPage from "./pages/MaterialConsumptionReportsPage";
import MaterialDeliveriesPage from "./pages/MaterialDeliveriesPage";
import AbsencesPage from "./pages/AbsencesPage";
import PayrollEntriesPage from "./pages/PayrollEntriesPage";
import PayrollAdvancesPage from "./pages/PayrollAdvancesPage";
import WorkOrdersPage from "./pages/WorkOrdersPage";
import BrigadesPage from "./pages/BrigadesPage";
import BrigadeCompositionPage from "./pages/BrigadeCompositionPage";
import AssignmentsPage from "./pages/AssignmentsPage";
import EmployeesPage from "./pages/EmployeesPage";
import AttendancePage from "./pages/AttendancePage";
import ReportsPage from "./pages/ReportsPage";
import UsersPage from "./pages/UsersPage";
import SettingsPage from "./pages/SettingsPage";
import BrigadirProfilePage from "./pages/BrigadirProfilePage";
import ProfilePage from "./pages/ProfilePage";

/** Brigadir gets the richer profile (also resolves their own Worker record); every other role
 * gets the generic GET /users/me view. */
function ProfileRoute() {
  const { user } = useAuth();
  return user?.role === "brigadir" ? <BrigadirProfilePage /> : <ProfilePage />;
}

function HomeRedirect() {
  const { user } = useAuth();
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
              <Route path="/change-password-required" element={<ChangePasswordRequiredPage />} />
              <Route path="/" element={<HomeRedirect />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/objects" element={<ObjectsPage />} />
              <Route path="/estimates" element={<EstimatesPage />} />
              <Route path="/budgets" element={<BudgetsPage />} />
              <Route path="/works" element={<WorksPage />} />
              <Route path="/individual-tasks" element={<IndividualTasksPage />} />
              <Route path="/timesheets" element={<TimesheetsPage />} />
              <Route path="/material-requests" element={<MaterialRequestsPage />} />
              <Route path="/material-consumption-reports" element={<MaterialConsumptionReportsPage />} />
              <Route path="/material-deliveries" element={<MaterialDeliveriesPage />} />
              <Route path="/absences" element={<AbsencesPage />} />
              <Route path="/payroll-entries" element={<PayrollEntriesPage />} />
              <Route path="/payroll-advances" element={<PayrollAdvancesPage />} />
              <Route path="/work-orders" element={<WorkOrdersPage />} />
              <Route path="/brigades" element={<BrigadesPage />} />
              <Route path="/brigades/composition" element={<BrigadeCompositionPage />} />
              <Route path="/brigades/assignments" element={<AssignmentsPage />} />
              <Route path="/employees" element={<EmployeesPage />} />
              <Route path="/attendance" element={<AttendancePage />} />
              <Route path="/payroll" element={<PayrollEntriesPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/profile" element={<ProfileRoute />} />
              <Route path="*" element={<HomeRedirect />} />
            </Route>
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
