import { useState } from "react";
import { Check, Lock, RefreshCw, Settings, ShieldCheck } from "lucide-react";
import ModulePageHeader from "../../components/common/ModulePageHeader";
import { useAuthStore } from "../../features/auth/authStore";
import { authorizeAction, getRolePermissions } from "../../features/auth/permissions";
import { useTwinStore } from "../../features/twin/twinStore";

export default function SettingsPage() {
  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.role);
  const automaticTelemetryRunning = useTwinStore((state) => state.automaticTelemetryRunning);
  const setAutomaticTelemetryRunning = useTwinStore((state) => state.setAutomaticTelemetryRunning);
  const resetSimulation = useTwinStore((state) => state.resetSimulation);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const adminPerms = getRolePermissions("Admin");
  const viewerPerms = getRolePermissions("Viewer");

  const handleToggleTelemetry = () => {
    const authResult = authorizeAction(role, "canManageSettings");
    if (!authResult.allowed) {
      setStatusMessage(authResult.reason);
      return;
    }
    setAutomaticTelemetryRunning(!automaticTelemetryRunning);
    setStatusMessage(
      !automaticTelemetryRunning
        ? "Đã bật mô phỏng telemetry tự động (Floor 1)."
        : "Đã tạm dừng mô phỏng telemetry tự động.",
    );
  };

  const handleResetSimulation = () => {
    const authResult = authorizeAction(role, "canManageSettings");
    if (!authResult.allowed) {
      setStatusMessage(authResult.reason);
      return;
    }
    resetSimulation();
    setStatusMessage("Đã khôi phục dữ liệu mô phỏng Digital Twin về trạng thái gốc.");
  };

  return (
    <section className="dashboard-page detail-module-page" aria-labelledby="module-page-title">
      <ModulePageHeader
        section="ADMINISTRATION / SETTINGS"
        title="Cài đặt hệ thống · ICS Digital Twin"
        description="Quản lý cấu hình mô phỏng telemetry, nguồn dữ liệu và ma trận phân quyền RBAC (Chỉ dành cho Admin)."
        scopeLabel="Toàn hệ thống"
      />

      {statusMessage && (
        <div className="settings-feedback-banner" role="status">
          <Check size={16} aria-hidden="true" />
          <span>{statusMessage}</span>
        </div>
      )}

      <div className="settings-grid">
        <section className="detail-panel" aria-labelledby="settings-telemetry-title">
          <header className="detail-panel-header">
            <div>
              <p className="section-eyebrow">SIMULATION ENGINE · MOCK DATA</p>
              <h2 id="settings-telemetry-title">Điều khiển luồng dữ liệu mô phỏng</h2>
            </div>
            <Settings size={18} aria-hidden="true" />
          </header>

          <div className="settings-control-list">
            <div className="settings-control-item">
              <div>
                <strong>Mô phỏng Telemetry tự động (Floor 1)</strong>
                <p>Tự động cập nhật chỉ số nhiệt độ, độ ẩm và điện năng mỗi 3 giây trên môi trường POC.</p>
              </div>
              <button
                type="button"
                className="incident-acknowledge-button"
                onClick={handleToggleTelemetry}
                aria-pressed={automaticTelemetryRunning}
              >
                {automaticTelemetryRunning ? "Tạm dừng Telemetry" : "Kích hoạt Telemetry"}
              </button>
            </div>

            <div className="settings-control-item">
              <div>
                <strong>Khôi phục trạng thái mô phỏng mặc định</strong>
                <p>Đặt lại toàn bộ cảnh báo, thiết bị offline và chỉ số môi trường về trạng thái chuẩn ban đầu.</p>
              </div>
              <button
                type="button"
                className="incident-acknowledge-button"
                onClick={handleResetSimulation}
              >
                <RefreshCw size={14} aria-hidden="true" /> Khôi phục mặc định
              </button>
            </div>
          </div>
        </section>

        <section className="detail-panel" aria-labelledby="settings-rbac-title">
          <header className="detail-panel-header">
            <div>
              <p className="section-eyebrow">SECURITY · ROUTE & API PERMISSIONS</p>
              <h2 id="settings-rbac-title">Ma trận phân quyền Admin & Viewer</h2>
            </div>
            <ShieldCheck size={18} aria-hidden="true" />
          </header>

          <p className="building-data-note">
            Tài khoản hiện tại: <strong>{user?.displayName ?? "Admin"}</strong> ({role}). Quyền hạn được kiểm soát ở cả Route Guard và Store/Action API.
          </p>

          <div className="detail-table-wrap">
            <table className="detail-table" aria-label="Role permission matrix">
              <thead>
                <tr>
                  <th scope="col">Quyền nghiệp vụ (Permission)</th>
                  <th scope="col">Admin</th>
                  <th scope="col">Viewer</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong>canViewDashboard</strong>
                    <span>Xem tổng quan, năng lượng, môi trường, thiết bị, sự cố</span>
                  </td>
                  <td>{adminPerms.canViewDashboard ? "Được phép" : "Bị chặn"}</td>
                  <td>{viewerPerms.canViewDashboard ? "Được phép" : "Bị chặn"}</td>
                </tr>
                <tr>
                  <td>
                    <strong>canViewAssets</strong>
                    <span>Truy cập danh mục tài sản, kế hoạch & lịch sử bảo trì</span>
                  </td>
                  <td>{adminPerms.canViewAssets ? "Được phép" : "Bị chặn"}</td>
                  <td>{viewerPerms.canViewAssets ? "Được phép (Chỉ đọc)" : "Bị chặn"}</td>
                </tr>
                <tr>
                  <td>
                    <strong>canControlDevice</strong>
                    <span>Tiếp nhận sự cố, ghi nhận bảo trì, kích hoạt kịch bản</span>
                  </td>
                  <td>{adminPerms.canControlDevice ? "Được phép" : "Bị chặn"}</td>
                  <td>
                    <span className="permission-blocked-pill">
                      <Lock size={12} aria-hidden="true" /> Bị chặn (Read-only)
                    </span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>canManageSettings</strong>
                    <span>Truy cập trang Cài đặt hệ thống & cấu hình mô phỏng</span>
                  </td>
                  <td>{adminPerms.canManageSettings ? "Được phép" : "Bị chặn"}</td>
                  <td>
                    <span className="permission-blocked-pill">
                      <Lock size={12} aria-hidden="true" /> Bị chặn (Route + Action)
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </section>
  );
}

