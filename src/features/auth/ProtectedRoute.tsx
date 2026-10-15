import { useLayoutEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "./authStore";
import { DEFAULT_DEMO_ROLE, DEMO_ROLE_BYPASS_ENABLED } from "./demoRoleMode";

export default function ProtectedRoute() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const role = useAuthStore((state) => state.role);
  const selectDemoRole = useAuthStore((state) => state.selectDemoRole);
  const location = useLocation();

  useLayoutEffect(() => {
    if (DEMO_ROLE_BYPASS_ENABLED && (!isAuthenticated || !role)) {
      selectDemoRole(DEFAULT_DEMO_ROLE);
    }
  }, [isAuthenticated, role, selectDemoRole]);

  if (!isAuthenticated && !DEMO_ROLE_BYPASS_ENABLED) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

