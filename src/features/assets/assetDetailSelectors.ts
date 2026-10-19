import { floor1AssetIdentities } from "../../data/mock/floor1AssetIdentities.mock";
import { floor2AssetIdentities } from "../../data/mock/floor2AssetIdentities.mock";
import { formatIsoDateVi, getLocalTodayIso } from "../dashboard/dateFilterUtils";
import type { AssetException } from "../dashboard/types";
import type { TwinAlert, TwinDevice, TwinSensor, TwinSimulationEvent } from "../twin/types";
import type { FloorRoomSnapshot } from "../floor/types";
import type { Floor } from "../../types/models";
import type { DeviceEnergyReading } from "../energy/types";
import {
  type AssetPriority,
  resolveAssetPriority,
} from "./priorityRules";
import { formatLastSeen } from "../devices/deviceSelectors";
import { initialMaintenancePlans, resolveMaintenancePlans } from "./maintenanceData";
import type { AssetDigitalIdentity, MaintenancePlanItem } from "./types";

export type DeviceCategory = "air-conditioner" | "sensor" | "controller" | "lighting" | "generic";

export interface MetricDetail {
  id: string;
  label: string;
  value: string;
  unit?: string;
  source: string;
  updateTime: string;
  isConfirmed: boolean;
  confirmationNote?: string;
}

export interface RelatedEntityLink {
  id: string;
  name: string;
  role: string;
  type: string;
  status?: string;
  targetUrl?: string;
}

export interface MaintenanceRecordItem {
  id: string;
  completedAt: string;
  itemTitle: string;
  performer: string;
  result: "passed" | "needs-followup";
  resultLabel: string;
  notes: string;
}

export interface TimelineLogEntry {
  id: string;
  timestamp: number;
  timeFormatted: string;
  actor: string;
  action: string;
  details: string;
  type: "connection" | "command" | "maintenance" | "alert";
  confirmationStatus: "confirmed" | "estimated" | "pending";
}

export interface AssetOperationalContext {
  item: AssetException;
  device?: TwinDevice;
  assetIdentity?: AssetDigitalIdentity;
  room?: FloorRoomSnapshot;
  floor?: Floor;
  buildingName: string;
  category: DeviceCategory;
  categoryLabel: string;

  // Status dimensions
  operationalStatus: "running" | "off" | "error" | "unverified";
  operationalStatusLabel: string;
  connectionStatus: "online" | "offline" | "unknown";
  connectionStatusLabel: string;
  connectionTargetLabel: string;
  lastSeenFormatted: string;
  maintenanceStatus: "normal" | "due-soon" | "due" | "unconfigured";
  maintenanceStatusLabel: string;
  priority: AssetPriority;
  priorityLabel: string;
  priorityReason: string;

  // Attention banner
  attentionHeadline: string;
  attentionDescription: string;
  attentionBasis: string;
  attentionRecommendedAction: string;
  attentionActionTab: "overview" | "operations" | "maintenance" | "incidents" | "profile";
  hasAttention: boolean;

  // Overview metrics
  metrics: MetricDetail[];

  // Incidents
  relatedAlerts: TwinAlert[];

  // Maintenance info
  maintenanceCycleInfo?: {
    itemTitle: string;
    basisLabel: string;
    intervalHours: number;
    accumulatedHours: number;
    remainingHours: number;
    percentComplete: number;
    explanation: string;
  };
  maintenancePlans: MaintenancePlanItem[];
  referenceDateLabel: string;
  maintenanceHistory: MaintenanceRecordItem[];

  // Timeline / Logs
  timelineLogs: TimelineLogEntry[];

  // Relationships
  relationships: RelatedEntityLink[];

  // Full profile route
  fullProfileUrl?: string;
}

export function detectDeviceCategory(type: string, name: string): DeviceCategory {
  const lower = `${type} ${name}`.toLowerCase();
  if (lower.includes("điều hòa") || lower.includes("ac-") || lower.includes("hvac") || lower.includes("air")) {
    return "air-conditioner";
  }
  if (lower.includes("controller") || lower.includes("điều khiển") || lower.includes("ut-")) {
    return "controller";
  }
  if (lower.includes("sensor") || lower.includes("cảm biến") || lower.includes("co2") || lower.includes("temp") || lower.includes("ws-")) {
    return "sensor";
  }
  if (lower.includes("chiếu sáng") || lower.includes("đèn") || lower.includes("light")) {
    return "lighting";
  }
  return "generic";
}

export function findAssetDigitalIdentity(
  assetId?: string,
  deviceId?: string,
): AssetDigitalIdentity | undefined {
  const all = [...floor1AssetIdentities, ...floor2AssetIdentities];
  if (assetId) {
    const found = all.find((item) => item.id === assetId);
    if (found) return found;
  }
  if (deviceId) {
    const found = all.find((item) => item.deviceId === deviceId);
    if (found) return found;
  }
  return undefined;
}

export interface ResolveAssetContextOptions {
  devices: readonly TwinDevice[];
  sensors?: readonly TwinSensor[];
  rooms: readonly FloorRoomSnapshot[];
  floors?: readonly Floor[];
  alerts?: readonly TwinAlert[];
  energyReadings?: readonly DeviceEnergyReading[];
  events?: readonly TwinSimulationEvent[];
  buildingName?: string;
  referenceDateIso?: string;
}

export function resolveAssetOperationalContext(
  item: AssetException,
  options: ResolveAssetContextOptions,
): AssetOperationalContext {
  const {
    devices,
    sensors = [],
    rooms,
    floors = [],
    alerts = [],
    energyReadings = [],
    events = [],
    buildingName = "ICS Headquarters",
    referenceDateIso,
  } = options;
  const effectiveRefDateIso = referenceDateIso ?? getLocalTodayIso();
  const referenceDateLabel = formatIsoDateVi(effectiveRefDateIso);

  const device = devices.find((d) => d.id === item.deviceId || d.name === item.id);
  const assetIdentity = findAssetDigitalIdentity(item.assetId ?? device?.assetId, item.deviceId);
  const room = rooms.find((r) => r.id === (device?.roomId));
  const floor = floors.find((f) => f.id === room?.floorId);

  const category = detectDeviceCategory(item.type, item.id);
  const categoryLabels: Record<DeviceCategory, string> = {
    "air-conditioner": "Điều hòa trung tâm (HVAC)",
    controller: "Bộ điều khiển kỹ thuật (BMS Controller)",
    sensor: "Cảm biến môi trường IoT",
    lighting: "Hệ thống chiếu sáng",
    generic: "Thiết bị vận hành",
  };

  // 1. Connection status
  const isDeviceOffline = device ? device.status === "offline" : item.status === "offline";
  const connectionStatus = isDeviceOffline ? "offline" : "online";
  const connectionTargetLabel = category === "controller"
    ? "Kết nối bộ điều khiển"
    : category === "sensor"
      ? "Kết nối cảm biến"
      : "Kết nối thiết bị";
  const connectionStatusLabel = isDeviceOffline ? "Mất kết nối (Offline)" : "Đang kết nối (Online)";
  const lastSeenFormatted = device?.lastSeenAt ? formatLastSeen(device.lastSeenAt) : "Chưa có dữ liệu";

  // 2. Operational status
  let operationalStatus: "running" | "off" | "error" | "unverified" = "running";
  let operationalStatusLabel = "Đang chạy";

  if (category === "controller") {
    if (isDeviceOffline) {
      operationalStatus = "error";
      operationalStatusLabel = "Gián đoạn dịch vụ";
    } else {
      operationalStatus = "running";
      operationalStatusLabel = "Hoạt động bình thường";
    }
  } else if (category === "sensor") {
    if (isDeviceOffline) {
      operationalStatus = "error";
      operationalStatusLabel = "Mất tín hiệu telemetry";
    } else {
      operationalStatus = "running";
      operationalStatusLabel = "Đang truyền dữ liệu";
    }
  } else if (category === "air-conditioner") {
    if (item.status === "critical") {
      operationalStatus = "error";
      operationalStatusLabel = "Cảnh báo lỗi kỹ thuật";
    } else {
      // For AC controlled via IR / BMS without return load sensor:
      operationalStatus = "unverified";
      operationalStatusLabel = "Đang chạy (theo lệnh BMS · chưa xác nhận dòng tải)";
    }
  } else if (item.status === "critical") {
    operationalStatus = "error";
    operationalStatusLabel = "Sự cố nghiêm trọng";
  }

  // 3. Maintenance status
  const remainingHours = device?.maintenanceHoursRemaining ?? item.maintenanceHoursRemaining;
  let maintenanceStatus: "normal" | "due-soon" | "due" | "unconfigured" = "unconfigured";
  let maintenanceStatusLabel = "Chưa cấu hình chu kỳ";

  if (remainingHours !== undefined) {
    if (remainingHours <= 0) {
      maintenanceStatus = "due";
      maintenanceStatusLabel = "Đến hạn bảo trì (0h)";
    } else if (remainingHours <= 12) {
      maintenanceStatus = "due-soon";
      maintenanceStatusLabel = `Sắp đến hạn (còn ${remainingHours}h vận hành)`;
    } else {
      maintenanceStatus = "normal";
      maintenanceStatusLabel = `Bình thường (còn ${remainingHours}h vận hành)`;
    }
  }

  // 4. Priority status
  const priority = resolveAssetPriority(item, { alerts, devices });
  const priorityLabels: Record<AssetPriority, string> = {
    high: "Ưu tiên cao",
    medium: "Ưu tiên trung bình",
    low: "Ưu tiên thấp",
    unclassified: "Chưa phân loại",
  };

  let priorityReason = "Xác định theo quy tắc nghiệp vụ.";
  if (priority === "high") {
    if (category === "controller" && isDeviceOffline) {
      priorityReason = "Bộ điều khiển khu kỹ thuật mất kết nối, ảnh hưởng giám sát toàn bộ thiết bị trong khu vực.";
    } else if (item.status === "critical" || item.issue === "Vượt ngưỡng vận hành") {
      priorityReason = "Chỉ số vượt ngưỡng an toàn vận hành, nguy cơ gián đoạn tiện ích.";
    } else if (remainingHours === 0) {
      priorityReason = "Đã chạm ngưỡng giờ bảo trì bắt buộc theo khuyến nghị của nhà sản xuất.";
    } else {
      priorityReason = "Sự cố kỹ thuật mức độ nghiêm trọng cần xử lý trong ca trực.";
    }
  } else if (priority === "medium") {
    if (remainingHours !== undefined && remainingHours <= 12) {
      priorityReason = `Còn ${remainingHours} giờ vận hành trước khi hết chu kỳ bảo trì hiện tại.`;
    } else if (item.issue === "Cần kiểm tra") {
      priorityReason = "Chỉ số cảm biến môi trường có dấu hiệu bất thường cần kỹ thuật viên kiểm tra.";
    } else if (isDeviceOffline && category === "sensor") {
      priorityReason = "Cảm biến văn phòng mất tín hiệu tạm thời, không gây gián đoạn thiết bị động lực.";
    } else {
      priorityReason = "Thiết bị cảnh báo cần kiểm tra định kỳ.";
    }
  } else if (priority === "low") {
    priorityReason = "Công việc kiểm tra định kỳ, không ảnh hưởng vận hành tức thời.";
  }

  // 5. Attention Banner
  let attentionHeadline: string;
  let attentionDescription: string;
  let attentionBasis: string;
  let attentionRecommendedAction: string;
  let attentionActionTab: "overview" | "operations" | "maintenance" | "incidents" | "profile";
  let hasAttention = true;

  if (remainingHours !== undefined && remainingHours <= 12) {
    attentionHeadline = remainingHours === 0 ? "Thiết bị đã đến hạn bảo trì" : "Thiết bị sắp đến hạn bảo trì định kỳ";
    attentionDescription = `Hệ thống ghi nhận máy nén ${item.id} chỉ còn ${remainingHours} giờ vận hành trước khi hết chu kỳ quy định.`;
    attentionBasis = assetIdentity
      ? `Căn cứ theo chu kỳ ${assetIdentity.maintenanceIntervalHours.toLocaleString("en-US")}h của nhà sản xuất ${assetIdentity.manufacturer}.`
      : `Căn cứ theo chu kỳ vận hành BMS cấu hình.`;
    attentionRecommendedAction = "Xem kế hoạch bảo trì";
    attentionActionTab = "maintenance";
  } else if (isDeviceOffline) {
    attentionHeadline = `${connectionTargetLabel}: Mất kết nối`;
    attentionDescription = `Thiết bị không gửi tín hiệu telemetry về hệ thống từ ${lastSeenFormatted}.`;
    attentionBasis = "Không suy đoán trạng thái vật lý khi thiết bị truyền thông đang offline.";
    attentionRecommendedAction = "Xem sự cố & hướng dẫn kiểm tra";
    attentionActionTab = "incidents";
  } else if (item.issue === "Cần kiểm tra" || item.status === "warning") {
    attentionHeadline = "Chỉ số cảm biến cần kiểm tra";
    attentionDescription = `Chỉ số đo đạc tại ${item.area} đang ở mức cần chú ý (${item.issue}).`;
    attentionBasis = "Phát hiện qua ngưỡng so sánh telemetry môi trường.";
    attentionRecommendedAction = "Xem dữ liệu & vận hành";
    attentionActionTab = "operations";
  } else {
    hasAttention = false;
    attentionHeadline = "Trạng thái vận hành ổn định";
    attentionDescription = "Chưa phát hiện sự cố bất thường hay lịch bảo trì khẩn cấp.";
    attentionBasis = "Dữ liệu vận hành trong ngưỡng cho phép.";
    attentionRecommendedAction = "Xem hồ sơ thiết bị";
    attentionActionTab = "profile";
  }

  // 6. Metrics Construction (strictly truthful)
  const metrics: MetricDetail[] = [];

  if (category === "air-conditioner") {
    if (room) {
      metrics.push({
        id: "room-temp",
        label: "Nhiệt độ phòng (Khu vực)",
        value: typeof room.temperature === "number" ? `${room.temperature.toFixed(1)}°C` : "—",
        source: `Cảm biến môi trường ${room.name}`,
        updateTime: "Thời gian thực (Mô phỏng)",
        isConfirmed: true,
        confirmationNote: "Đo từ cảm biến phòng, không phải cảm biến tích hợp trong dàn lạnh.",
      });
      metrics.push({
        id: "room-humidity",
        label: "Độ ẩm phòng (Khu vực)",
        value: typeof room.humidity === "number" ? `${room.humidity}%` : "—",
        source: `Cảm biến môi trường ${room.name}`,
        updateTime: "Thời gian thực (Mô phỏng)",
        isConfirmed: true,
        confirmationNote: "Đo từ cảm biến môi trường khu vực.",
      });
    }

    const energy = energyReadings.find((r) => r.deviceId === item.deviceId);
    if (energy && typeof energy.energyKwh === "number") {
      metrics.push({
        id: "device-energy",
        label: "Điện năng tiêu thụ hôm nay",
        value: `${energy.energyKwh.toFixed(1)} kWh`,
        source: `Đồng hồ phụ nhánh ${item.id}`,
        updateTime: "Hôm nay (Tích lũy)",
        isConfirmed: true,
        confirmationNote: `Ngưỡng bất thường: ${energy.abnormalThresholdKwh ?? 30} kWh. Đo đạc theo nhánh thiết bị riêng.`,
      });
    }

    if (assetIdentity) {
      metrics.push({
        id: "runtime-total",
        label: "Tổng giờ vận hành tích lũy",
        value: `${assetIdentity.runtimeHours.toLocaleString("en-US")} giờ`,
        source: "Đồng hồ giờ chạy máy nén (Digital Identity)",
        updateTime: "Đồng bộ gần nhất",
        isConfirmed: true,
        confirmationNote: "Dữ liệu xác nhận từ lịch sử máy nén.",
      });
    }
  } else if (category === "sensor") {
    const matchingSensors = sensors.filter((s) => s.deviceId === item.deviceId);
    if (matchingSensors.length > 0) {
      for (const s of matchingSensors) {
        metrics.push({
          id: s.id,
          label: s.name,
          value: isDeviceOffline ? `${s.value} ${s.unit} (Dữ liệu cũ)` : `${s.value} ${s.unit}`,
          source: `Sensor ${s.name}`,
          updateTime: lastSeenFormatted,
          isConfirmed: !isDeviceOffline,
          confirmationNote: isDeviceOffline ? "Dữ liệu ghi nhận trước thời điểm mất kết nối." : "Dữ liệu đo đạc trực tiếp.",
        });
      }
    } else if (room) {
      metrics.push({
        id: "room-metric",
        label: "Nhiệt độ tham chiếu khu vực",
        value: `${room.temperature.toFixed(1)}°C`,
        source: room.name,
        updateTime: "Mô phỏng",
        isConfirmed: true,
      });
    }
  } else if (category === "controller") {
    const linkedDevices = devices.filter((d) => d.roomId === device?.roomId && d.id !== device?.id);
    metrics.push({
      id: "controller-devices-count",
      label: "Thiết bị quản lý trong khu vực",
      value: `${linkedDevices.length} thiết bị`,
      source: "Cấu hình topo BMS",
      updateTime: "Cấu hình tĩnh",
      isConfirmed: true,
      confirmationNote: "Bao gồm các cảm biến và thiết bị phụ thuộc đường truyền.",
    });
    metrics.push({
      id: "network-protocol",
      label: "Giao thức truyền thông",
      value: "BACnet/IP & Modbus RTU",
      source: "Cấu hình phần cứng",
      updateTime: "Cấu hình tĩnh",
      isConfirmed: true,
    });
  }

  // 7. Related Alerts
  const relatedAlerts = alerts.filter(
    (a) => a.deviceId === item.deviceId || (item.assetId && a.assetId === item.assetId),
  );

  // 8. Maintenance Cycle Info
  let maintenanceCycleInfo: AssetOperationalContext["maintenanceCycleInfo"];
  if (remainingHours !== undefined && assetIdentity) {
    const interval = assetIdentity.maintenanceIntervalHours;
    const accumulated = Math.max(0, interval - remainingHours);
    const percent = Math.min(100, Math.round((accumulated / interval) * 100));
    maintenanceCycleInfo = {
      itemTitle: "Bảo dưỡng định kỳ hệ thống máy nén & vệ sinh dàn ngưng",
      basisLabel: `Theo giờ vận hành máy nén (${interval.toLocaleString("en-US")} giờ/chu kỳ)`,
      intervalHours: interval,
      accumulatedHours: accumulated,
      remainingHours,
      percentComplete: percent,
      explanation: `Chỉ số "Còn ${remainingHours}h vận hành" được xác định từ hiệu số giữa ngưỡng chu kỳ (${interval}h) và tổng giờ máy nén đã chạy trong chu kỳ hiện tại (${accumulated}h). Đây là thời gian chạy thực tế của máy móc, không tương đương với số giờ đồng hồ thời gian thực.`,
    };
  } else if (remainingHours !== undefined) {
    const interval = 500;
    const accumulated = Math.max(0, interval - remainingHours);
    const percent = Math.min(100, Math.round((accumulated / interval) * 100));
    maintenanceCycleInfo = {
      itemTitle: "Kiểm tra bảo dưỡng định kỳ",
      basisLabel: "Theo giờ vận hành thiết bị",
      intervalHours: interval,
      accumulatedHours: accumulated,
      remainingHours,
      percentComplete: percent,
      explanation: `Chỉ số "Còn ${remainingHours}h vận hành" là số giờ hoạt động ước tính còn lại trong chu kỳ bảo trì.`,
    };
  }

  // 8b. Scheduled Maintenance Plans (runtime + calendar)
  const maintenancePlans = resolveMaintenancePlans(
    initialMaintenancePlans.filter(
      (p) => (assetIdentity && p.assetId === assetIdentity.id) || (item.deviceId && p.deviceId === item.deviceId),
    ),
    devices,
    effectiveRefDateIso,
  );

  // 9. Maintenance History (realistic historical records)
  const maintenanceHistory: MaintenanceRecordItem[] = [];
  if (assetIdentity) {
    maintenanceHistory.push({
      id: "maint-hist-01",
      completedAt: "18/04/2026 (6 tháng trước)",
      itemTitle: "Bảo dưỡng định kỳ cấp 1: Vệ sinh lọc bụi & kiểm tra áp suất gas",
      performer: "KTV. Nguyễn Văn Hùng · Đội Cơ điện MEP",
      result: "passed",
      resultLabel: "Đạt tiêu chuẩn vận hành",
      notes: "Áp suất gas 1.25 MPa đạt chuẩn; dòng tải máy nén 8.2A ổn định; đã thay 02 màng lọc thô.",
    });
    maintenanceHistory.push({
      id: "maint-hist-02",
      completedAt: "15/10/2025 (12 tháng trước)",
      itemTitle: "Kiểm tra bảo dưỡng định kỳ ban đầu",
      performer: "Dịch vụ ủy quyền Daikin",
      result: "passed",
      resultLabel: "Đạt nghiệm thu",
      notes: "Vận hành thử nghiệm sau lắp đặt; kiểm tra cách điện cuộn dây motor quạt.",
    });
  }

  // 10. Timeline Logs
  const timelineLogs: TimelineLogEntry[] = [];
  if (isDeviceOffline) {
    timelineLogs.push({
      id: "log-offline-01",
      timestamp: Date.now() - 5 * 60_000,
      timeFormatted: lastSeenFormatted,
      actor: "Hệ thống giám sát ICS",
      action: "Phát hiện mất kết nối telemetry",
      details: `Không nhận được gói tin heartbeat từ ${item.id}. Chuyển trạng thái sang Offline.`,
      type: "connection",
      confirmationStatus: "confirmed",
    });
  }

  if (category === "air-conditioner") {
    timelineLogs.push({
      id: "log-ir-command-01",
      timestamp: Date.now() - 45 * 60_000,
      timeFormatted: "45 phút trước",
      actor: "Lịch trình BMS tự động",
      action: "Gửi lệnh cài đặt 24°C / Quạt Auto",
      details: "Lệnh đã gửi thành công tới bộ điều khiển hồng ngoại IR. Trạng thái thực tế: Chưa có dữ liệu cảm biến phản hồi hai chiều.",
      type: "command",
      confirmationStatus: "estimated",
    });
  }

  for (const event of events) {
    if ("deviceId" in event && event.deviceId === item.deviceId) {
      timelineLogs.push({
        id: `event-${event.occurredAt}-${event.type}`,
        timestamp: event.occurredAt,
        timeFormatted: formatLastSeen(new Date(event.occurredAt).toISOString()),
        actor: "Hệ thống mô phỏng Digital Twin",
        action: event.type === "MaintenanceDue" ? "Kích hoạt cảnh báo bảo trì" : event.type,
        details: `Sự kiện mô phỏng phát sinh trên thiết bị ${item.id}`,
        type: event.type === "MaintenanceDue" ? "maintenance" : "alert",
        confirmationStatus: "confirmed",
      });
    }
  }

  // 11. Relationships
  const relationships: RelatedEntityLink[] = [];
  if (category === "air-conditioner") {
    relationships.push({
      id: "rel-controller",
      name: "Bộ phát lệnh IR & Gateway BMS",
      role: "Điều khiển và truyền lệnh vận hành",
      type: "Controller",
      status: "online",
      targetUrl: `/dashboard/devices?roomId=${encodeURIComponent(device?.roomId ?? "")}`,
    });
    if (room) {
      relationships.push({
        id: "rel-room-sensor",
        name: `Cảm biến môi trường ${room.name}`,
        role: "Đo nhiệt độ & độ ẩm phòng tham chiếu",
        type: "Sensor",
        status: room.status,
        targetUrl: `/dashboard/environment?roomId=${encodeURIComponent(room.id)}`,
      });
      relationships.push({
        id: "rel-energy-meter",
        name: `Đồng hồ phụ đo điện ${room.name}`,
        role: "Đo điện năng nhánh máy lạnh",
        type: "Power Meter",
        status: "online",
        targetUrl: `/dashboard/energy`,
      });
    }
  } else if (category === "controller") {
    const roomDevices = devices.filter((d) => d.roomId === device?.roomId && d.id !== device?.id);
    for (const d of roomDevices) {
      relationships.push({
        id: `rel-${d.id}`,
        name: d.name,
        role: "Thiết bị kết nối qua bus truyền thông",
        type: d.type,
        status: d.status,
        targetUrl: `/dashboard/devices?deviceId=${encodeURIComponent(d.id)}`,
      });
    }
  }

  if (room) {
    relationships.push({
      id: `rel-room-${room.id}`,
      name: `Khu vực: ${room.name}`,
      role: "Vị trí lắp đặt vật lý",
      type: "Room",
      targetUrl: `/dashboard/overview`,
    });
  }

  // Full profile URL
  const fullProfileUrl = assetIdentity
    ? `/dashboard/assets?assetId=${encodeURIComponent(assetIdentity.id)}`
    : `/dashboard/devices?deviceId=${encodeURIComponent(item.deviceId)}`;

  return {
    item,
    device,
    assetIdentity,
    room,
    floor,
    buildingName,
    category,
    categoryLabel: categoryLabels[category],

    operationalStatus,
    operationalStatusLabel,
    connectionStatus,
    connectionStatusLabel,
    connectionTargetLabel,
    lastSeenFormatted,
    maintenanceStatus,
    maintenanceStatusLabel,
    priority,
    priorityLabel: priorityLabels[priority],
    priorityReason,

    attentionHeadline,
    attentionDescription,
    attentionBasis,
    attentionRecommendedAction,
    attentionActionTab,
    hasAttention,

    metrics,
    relatedAlerts,
    maintenanceCycleInfo,
    maintenancePlans,
    referenceDateLabel,
    maintenanceHistory,
    timelineLogs,
    relationships,
    fullProfileUrl,
  };
}

