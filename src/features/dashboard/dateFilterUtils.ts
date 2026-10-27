import {
  ACTIVE_FLOOR_ID,
  ALL_BUILDING_SCOPE_ID,
} from "../../data/mock/buildingLocations";

export const STATIC_SAMPLE_DATE_ISO = "2026-10-08";
export const STATIC_SAMPLE_PREV_DATE_ISO = "2026-10-07";

export interface DateFilterRange {
  startDate: string;
  endDate: string;
}

export interface DateFilterMetricsOptions {
  scopeFloorId?: string;
}

export interface DateFilterMetrics {
  isToday: boolean;
  isYesterday: boolean;
  dayCount: number;
  energyScale: number;
  hourlyScale: number;
  tempOffset: number;
  humidityOffset: number;
  hasHistoricalData: boolean;
  hasHourlySeries: boolean;
  hasPreviousPeriodComparison: boolean;
  validFloorIds: readonly string[];
  periodLabelVi: string;
  isStaticSampleDate: boolean;
  effectiveSampleDate?: string;
}

export function getLocalTodayIso(referenceMs?: number): string {
  const dt = referenceMs && referenceMs > 0 ? new Date(referenceMs) : new Date();
  const year = dt.getFullYear();
  const month = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDaysIso(baseIso: string, deltaDays: number): string {
  const [y, m, d] = baseIso.split("-").map(Number);
  const dt = new Date(y ?? 2026, (m ?? 1) - 1, d ?? 1);
  dt.setDate(dt.getDate() + deltaDays);
  const year = dt.getFullYear();
  const month = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatIsoDateVi(dateIso: string): string {
  const [year, month, day] = dateIso.split("-");
  if (!year || !month || !day) return dateIso;
  return `${day}/${month}/${year}`;
}

export function normalizeDateRange(range: DateFilterRange): DateFilterRange {
  return range.startDate <= range.endDate
    ? range
    : { startDate: range.endDate, endDate: range.startDate };
}

export function enumerateDateRange(range: DateFilterRange): string[] {
  const { startDate, endDate } = normalizeDateRange(range);
  const [sy, sm, sd] = startDate.split("-").map(Number);
  const [ey, em, ed] = endDate.split("-").map(Number);
  const startObj = new Date(sy ?? 2026, (sm ?? 1) - 1, sd ?? 1);
  const endObj = new Date(ey ?? 2026, (em ?? 1) - 1, ed ?? 1);

  const result: string[] = [];
  const cursor = new Date(startObj);
  let safety = 0;
  while (cursor <= endObj && safety < 366) {
    const year = cursor.getFullYear();
    const month = String(cursor.getMonth() + 1).padStart(2, "0");
    const day = String(cursor.getDate()).padStart(2, "0");
    result.push(`${year}-${month}-${day}`);
    cursor.setDate(cursor.getDate() + 1);
    safety += 1;
  }
  return result.length > 0 ? result : [startDate];
}

export function formatDateRangeLabel(range: DateFilterRange, todayIso: string): string {
  const { startDate, endDate } = normalizeDateRange(range);
  if (startDate === endDate) {
    if (startDate === todayIso) return "Hôm nay";
    return formatIsoDateVi(startDate);
  }
  const days = enumerateDateRange({ startDate, endDate }).length;
  const startVi = formatIsoDateVi(startDate);
  const endVi = formatIsoDateVi(endDate);
  const sameYear = startDate.slice(0, 4) === endDate.slice(0, 4);
  const compactStart = sameYear ? startVi.slice(0, 5) : startVi;
  return `${compactStart} – ${endVi} (${days} ngày)`;
}

function getValidFloorsForSingleDate(dateIso: string, todayIso: string, yesterdayIso: string): string[] {
  const valid: string[] = [];
  if (
    dateIso === todayIso ||
    dateIso === yesterdayIso ||
    dateIso === STATIC_SAMPLE_DATE_ISO ||
    dateIso === STATIC_SAMPLE_PREV_DATE_ISO
  ) {
    valid.push(ACTIVE_FLOOR_ID);
  }
  return valid;
}

function computeHonestSingleDayScale(
  dateIso: string,
  todayIso: string,
  yesterdayIso: string,
  baseTotalKwh: number,
  yesterdayTargetKwh: number,
): number | null {
  if (dateIso === todayIso || dateIso === STATIC_SAMPLE_DATE_ISO) {
    return 1;
  }
  if (dateIso === yesterdayIso || dateIso === STATIC_SAMPLE_PREV_DATE_ISO) {
    return baseTotalKwh > 0 ? yesterdayTargetKwh / baseTotalKwh : 0;
  }
  return null;
}

export function computeDateFilterMetrics(
  selectedRange: DateFilterRange,
  todayIso: string,
  baseTotalKwh: number,
  yesterdayTargetKwh: number,
  options?: DateFilterMetricsOptions,
): DateFilterMetrics {
  const normalized = normalizeDateRange(selectedRange);
  const dates = enumerateDateRange(normalized);
  const dayCount = dates.length;
  const yesterdayIso = addDaysIso(todayIso, -1);
  const isToday = dayCount === 1 && normalized.startDate === todayIso;
  const isYesterday = dayCount === 1 && normalized.startDate === yesterdayIso;
  const isStaticSampleDate = dayCount === 1 && normalized.startDate === STATIC_SAMPLE_DATE_ISO;

  const periodLabelVi = isToday
    ? "hôm nay"
    : isYesterday
      ? `hôm qua (${formatIsoDateVi(yesterdayIso)})`
      : dayCount === 1
        ? `ngày ${formatIsoDateVi(normalized.startDate)}`
        : `${formatIsoDateVi(normalized.startDate)} – ${formatIsoDateVi(normalized.endDate)} (${dayCount} ngày)`;

  const candidateFloors = [ACTIVE_FLOOR_ID];
  let validFloorIds = candidateFloors.filter((floorId) =>
    dates.every((d) => getValidFloorsForSingleDate(d, todayIso, yesterdayIso).includes(floorId)),
  );

  if (options?.scopeFloorId && options.scopeFloorId !== ALL_BUILDING_SCOPE_ID) {
    validFloorIds = validFloorIds.filter((id) => id === options.scopeFloorId);
  }

  const hasHistoricalData = validFloorIds.length > 0;
  const hasHourlySeries =
    hasHistoricalData &&
    dayCount === 1 &&
    (normalized.startDate === todayIso || normalized.startDate === STATIC_SAMPLE_DATE_ISO);
  const hasPreviousPeriodComparison =
    hasHistoricalData &&
    dayCount === 1 &&
    (normalized.startDate === todayIso || normalized.startDate === STATIC_SAMPLE_DATE_ISO);

  if (!hasHistoricalData) {
    return {
      isToday,
      isYesterday,
      dayCount,
      energyScale: 0,
      hourlyScale: 0,
      tempOffset: 0,
      humidityOffset: 0,
      hasHistoricalData: false,
      hasHourlySeries: false,
      hasPreviousPeriodComparison: false,
      validFloorIds: [],
      periodLabelVi,
      isStaticSampleDate,
      effectiveSampleDate: dayCount === 1 ? normalized.startDate : undefined,
    };
  }

  let totalScale = 0;
  for (const d of dates) {
    const dayScale = computeHonestSingleDayScale(d, todayIso, yesterdayIso, baseTotalKwh, yesterdayTargetKwh);
    if (dayScale === null) {
      return {
        isToday,
        isYesterday,
        dayCount,
        energyScale: 0,
        hourlyScale: 0,
        tempOffset: 0,
        humidityOffset: 0,
        hasHistoricalData: false,
        hasHourlySeries: false,
        hasPreviousPeriodComparison: false,
        validFloorIds: [],
        periodLabelVi,
        isStaticSampleDate,
        effectiveSampleDate: dayCount === 1 ? normalized.startDate : undefined,
      };
    }
    totalScale += dayScale;
  }

  return {
    isToday,
    isYesterday,
    dayCount,
    energyScale: totalScale,
    hourlyScale: hasHourlySeries ? totalScale / dayCount : 0,
    tempOffset: 0,
    humidityOffset: 0,
    hasHistoricalData: true,
    hasHourlySeries,
    hasPreviousPeriodComparison,
    validFloorIds,
    periodLabelVi,
    isStaticSampleDate,
    effectiveSampleDate: dayCount === 1 ? normalized.startDate : undefined,
  };
}

