import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ROLE_HOME, isRouteAllowed } from "../../lib/auth/roleAccess";
import { useWorkOrdersHub } from "../../hooks/useWorkOrdersHub";

/** Wraps every app route: bounces unauthenticated visitors to /login, a real-backend session
 * with a pending forced password change to /change-password-required (mirrors the backend's own
 * ForcePasswordChangeMiddleware, which 403s everything else until that happens), and a role
 * trying to open a page outside its access matrix back to its own home route. Also owns the one
 * shared SignalR connection (useWorkOrdersHub) for every protected page underneath it. */
export function ProtectedRoute() {
  const { user, forcePasswordChange } = useAuth();
  const location = useLocation();
  useWorkOrdersHub();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (forcePasswordChange && location.pathname !== "/change-password-required") {
    return <Navigate to="/change-password-required" replace />;
  }
  if (!forcePasswordChange && location.pathname === "/change-password-required") {
    return <Navigate to={ROLE_HOME[user.role]} replace />;
  }
  if (!forcePasswordChange && !isRouteAllowed(user.role, location.pathname)) {
    return <Navigate to={ROLE_HOME[user.role]} replace />;
  }
  return <Outlet />;
}

/** Wraps /login: an already-authenticated visitor is sent straight to their workspace instead of seeing the form again. */
export function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (user) {
    return <Navigate to={ROLE_HOME[user.role]} replace />;
  }
  return children;
}
