import type { ReactNode } from "react";
import { useAuthStore } from "./authStore";
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
  const role = useAuthStore((state) => state.role);

  if (!hasPermission(role, permission)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6 text-text-primary">
        <section className="max-w-lg rounded-2xl border border-border bg-surface p-8">
          <h1 className="text-xl font-semibold">Access restricted</h1>
          <p className="mt-3 text-text-secondary">
            This account does not have permission to view this area.
          </p>
        </section>
      </main>
    );
  }

  return children;
}
