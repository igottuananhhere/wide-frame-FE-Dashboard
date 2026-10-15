import { ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "./authStore";
import { DEFAULT_DEMO_ROLE, DEMO_ROLE_BYPASS_ENABLED } from "./demoRoleMode";
import { hasPermission } from "./permissions";
import type { AuthPermission } from "./types";

type PermissionGuardProps = {
  permission: AuthPermission;
  children: ReactNode;
};

export default function PermissionGuard({
  permission,
  children,
}: PermissionGuardProps) {
  const storeRole = useAuthStore((state) => state.role);
  const role = storeRole ?? (DEMO_ROLE_BYPASS_ENABLED ? DEFAULT_DEMO_ROLE : null);

  if (!hasPermission(role, permission)) {
    return (
      <section className="permission-denied-panel detail-panel" role="alert" aria-labelledby="permission-denied-title">
        <div className="permission-denied-icon" aria-hidden="true">
          <ShieldAlert size={28} />
        </div>
        <p className="section-eyebrow">SECURITY · ROLE-BASED ACCESS CONTROL</p>
        <h1 id="permission-denied-title" className="text-xl font-semibold">Access restricted</h1>
        <p className="mt-3 text-text-secondary">
          This account does not have permission to view this area.
        </p>
        <p className="permission-denied-meta">
          Vai trò hiện tại: <strong>{role ?? "Chưa xác thực"}</strong> · Quyền yêu cầu: <code>{permission}</code> (Chỉ dành cho Admin).
        </p>
        <div className="permission-denied-actions">
          <Link className="permission-denied-return-link" to="/dashboard/overview">
            Quay về Tổng quan (Overview)
          </Link>
        </div>
      </section>
    );
  }

  return children;
}
