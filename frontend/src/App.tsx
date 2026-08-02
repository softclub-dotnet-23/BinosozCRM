import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ToastProvider } from "./hooks/useToast";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute, PublicOnlyRoute } from "./components/auth/RouteGuards";
import { ForcePasswordChangeModal } from "./components/auth/ForcePasswordChangeModal";
import { RouteErrorBoundary } from "./components/routing/RouteErrorBoundary";
import { RouteLoadingFallback } from "./components/routing/RouteLoadingFallback";

const LoginPage = lazy(() => import("./pages/LoginPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const ObjectsPage = lazy(() => import("./pages/ObjectsPage"));
const EstimatesPage = lazy(() => import("./pages/EstimatesPage"));
const BudgetsPage = lazy(() => import("./pages/BudgetsPage"));
const WorksPage = lazy(() => import("./pages/WorksPage"));
const BrigadesPage = lazy(() => import("./pages/BrigadesPage"));
const BrigadeCompositionPage = lazy(() => import("./pages/BrigadeCompositionPage"));
const AssignmentsPage = lazy(() => import("./pages/AssignmentsPage"));
const EmployeesPage = lazy(() => import("./pages/EmployeesPage"));
const AttendancePage = lazy(() => import("./pages/AttendancePage"));
const MaterialsPage = lazy(() => import("./pages/MaterialsPage"));
const MaterialRequestsPage = lazy(() => import("./pages/MaterialRequestsPage"));
const ReceiptsPage = lazy(() => import("./pages/ReceiptsPage"));
const WriteOffsPage = lazy(() => import("./pages/WriteOffsPage"));
const TransfersPage = lazy(() => import("./pages/TransfersPage"));
const StockPage = lazy(() => import("./pages/StockPage"));
const PayrollPage = lazy(() => import("./pages/PayrollPage"));
const ReportsPage = lazy(() => import("./pages/ReportsPage"));
const UsersPage = lazy(() => import("./pages/UsersPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const WorkerTasksPage = lazy(() => import("./pages/WorkerTasksPage"));
const WorkerPhotoReportsPage = lazy(() => import("./pages/WorkerPhotoReportsPage"));
const WorkerProfilePage = lazy(() => import("./pages/WorkerProfilePage"));

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <ForcePasswordChangeModal />
        <RouteErrorBoundary>
          <Suspense fallback={<RouteLoadingFallback />}>
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
                <Route path="/inventory/material-requests" element={<MaterialRequestsPage />} />
                <Route path="/inventory/receipts" element={<ReceiptsPage />} />
                <Route path="/inventory/write-offs" element={<WriteOffsPage />} />
                <Route path="/inventory/transfers" element={<TransfersPage />} />
                <Route path="/inventory/stock" element={<StockPage />} />
                <Route path="/payroll" element={<PayrollPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/tasks" element={<WorkerTasksPage />} />
                <Route path="/photo-reports" element={<WorkerPhotoReportsPage />} />
                <Route path="/profile" element={<WorkerProfilePage />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Route>
            </Routes>
          </Suspense>
        </RouteErrorBoundary>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
