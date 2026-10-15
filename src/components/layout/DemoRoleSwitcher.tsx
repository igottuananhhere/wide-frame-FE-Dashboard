import { Eye, ShieldCheck } from "lucide-react";
import { useAuthStore } from "../../features/auth/authStore";
import { DEFAULT_DEMO_ROLE, DEMO_ROLE_BYPASS_ENABLED } from "../../features/auth/demoRoleMode";
import type { AppRole } from "../../features/auth/types";

/**
 * TEMPORARY HEADER ROLE SWITCHER (UI/UX REVIEW MODE)
 * -----------------------------------------------------------------------------
 * Allows instant switching between Admin and Viewer directly from the
 * Dashboard Header without logging out or entering credentials.
 */
export default function DemoRoleSwitcher() {
  const storeRole = useAuthStore((state) => state.role);
  const selectDemoRole = useAuthStore((state) => state.selectDemoRole);
  const role = storeRole ?? DEFAULT_DEMO_ROLE;

  if (!DEMO_ROLE_BYPASS_ENABLED) return null;

  const handleSwitch = (nextRole: AppRole) => {
    if (role === nextRole) return;
    selectDemoRole(nextRole);
  };

  return (
    <div
      className="demo-role-switcher"
      role="group"
      aria-label="Chuyển đổi nhanh vai trò Admin và Viewer"
    >
      <button
        type="button"
        className={`demo-role-switch-btn ${role === "Admin" ? "is-active" : ""}`}
        aria-pressed={role === "Admin"}
        onClick={() => handleSwitch("Admin")}
        title="Chuyển sang giao diện Admin"
      >
        <ShieldCheck aria-hidden="true" size={13} />
        <span>Admin</span>
      </button>
      <button
        type="button"
        className={`demo-role-switch-btn ${role === "Viewer" ? "is-active" : ""}`}
        aria-pressed={role === "Viewer"}
        onClick={() => handleSwitch("Viewer")}
        title="Chuyển sang giao diện Viewer"
      >
        <Eye aria-hidden="true" size={13} />
        <span>Viewer</span>
      </button>
    </div>
  );
}

