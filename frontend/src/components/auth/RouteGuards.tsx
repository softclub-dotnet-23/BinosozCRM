import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ROLE_HOME, isRouteAllowed } from "../../lib/auth/roleAccess";

/** Wraps every app route: bounces unauthenticated visitors to /login, and a role trying to open a page outside its access matrix back to its own home route. */
export function ProtectedRoute() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (!isRouteAllowed(user.role, location.pathname)) {
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
