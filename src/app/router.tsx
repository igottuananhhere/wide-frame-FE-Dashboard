import { createBrowserRouter, Navigate } from "react-router-dom";
import { DEMO_ROLE_BYPASS_ENABLED } from "../features/auth/demoRoleMode";
import PermissionGuard from "../features/auth/PermissionGuard";
import ProtectedRoute from "../features/auth/ProtectedRoute";
import LoginPage from "../pages/auth/LoginPage";
import DashboardPage from "../pages/dashboard/DashboardPage";
import EnergyPage from "../pages/dashboard/EnergyPage";
import EnvironmentPage from "../pages/dashboard/EnvironmentPage";
import DevicesPage from "../pages/dashboard/DevicesPage";
import IncidentsPage from "../pages/dashboard/IncidentsPage";
import AssetsPage from "../pages/dashboard/AssetsPage";
import AnalyticsPage from "../pages/dashboard/AnalyticsPage";
import SettingsPage from "../pages/dashboard/SettingsPage";
import DashboardLayout from "../components/layout/DashboardLayout";
import DashboardScopeBoundary from "../components/layout/DashboardScopeBoundary";
import ModulePlaceholderPage from "../pages/dashboard/ModulePlaceholderPage";
import NotFoundPage from "../pages/NotFoundPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/dashboard/overview" replace />,
  },
  {
    path: "/login",
    element: DEMO_ROLE_BYPASS_ENABLED ? <Navigate to="/dashboard/overview" replace /> : <LoginPage />,
  },
  {
    path: "/dashboard",
    element: <ProtectedRoute />,
    children: [
      {
        element: (
          <PermissionGuard permission="canViewDashboard">
            <DashboardLayout />
          </PermissionGuard>
        ),
        children: [
          {
            index: true,
            element: <Navigate to="overview" replace />,
          },
          { path: "overview", element: <DashboardPage /> },
          {
            element: <DashboardScopeBoundary />,
            children: [
              { path: "energy", element: <EnergyPage /> },
              { path: "environment", element: <EnvironmentPage /> },
              { path: "analytics", element: <AnalyticsPage /> },
              { path: "devices", element: <DevicesPage /> },
              { path: "incidents", element: <IncidentsPage /> },
              {
                path: "assets",
                element: (
                  <PermissionGuard permission="canViewAssets">
                    <AssetsPage />
                  </PermissionGuard>
                ),
              },
            ],
          },
          {
            path: "settings",
            element: (
              <PermissionGuard permission="canManageSettings">
                <SettingsPage />
              </PermissionGuard>
            ),
          },
          { path: "digital-twin", element: <ModulePlaceholderPage title="Mô hình 3D" section="DIGITAL TWIN" /> },
          { path: "*", element: <NotFoundPage /> },
        ],
      },
    ],
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
]);
