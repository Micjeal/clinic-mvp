import {
  facilityLocalDateAndTimeToInstant,
  instantInTimeZone,
} from "../../lib/facility-time";

export const SCHEDULING_GRID_MINUTES = 15;
export const RESERVING_STATUSES = ["requested", "scheduled", "confirmed", "checked_in", "in_progress"] as const;

export type AvailabilityInterval = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
};
export type AvailabilityException = { startsAt: string; endsAt: string; type: "unavailable" | "available_override" };
export type BusyInterval = { startsAt: string; endsAt: string };
export type Slot = { startsAt: string; endsAt: string };
/**
 * `departments.opening_hours` is a JSON object keyed by short weekday
 * (`mon`..`sun`), each value a `HH:MM-HH:MM` string. Unconfigured hours mean
 * "no restriction"; a configured object with no entry for the day means closed.
 */
export type OpeningHours = Record<string, string | string[] | null | undefined> | null | undefined;
export type ClinicianEligibility = {
  active: boolean;
  roleKey: string;
  organizationId: string;
  facilityId: string;
  departmentIds: string[];
  serviceIds: string[];
  isPublic: boolean;
  acceptingAppointments: boolean;
};

/**
 * Weekly rules store JavaScript/Postgres calendar weekdays: Sunday = 0 through
 * Saturday = 6. Parse the requested calendar date in UTC so the result does
 * not depend on the server's own timezone.
 */
export function dayOfWeekForDate(date: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;
  const value = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return Number.isNaN(value.valueOf()) ? null : value.getUTCDay();
}

function addCalendarDay(date: string) {
  const day = dayOfWeekForDate(date);
  if (day === null) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + 1)).toISOString().slice(0, 10);
}

function minutes(value: string) {
  const match = /^(\d{2}):(\d{2})/.exec(value);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour >= 0 && hour < 24 && minute >= 0 && minute < 60 ? hour * 60 + minute : null;
}

/** A rule only applies on dates inside its optional effective window (inclusive). */
export function isAvailabilityRuleEffective(
  date: string,
  rule: { effectiveFrom?: string | null; effectiveTo?: string | null },
) {
  return (!rule.effectiveFrom || rule.effectiveFrom <= date)
    && (!rule.effectiveTo || rule.effectiveTo >= date);
}

const openingDayKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
const openingDayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

function parseOpeningWindows(value: string | string[] | null | undefined) {
  const text = Array.isArray(value) ? value.join(",") : typeof value === "string" ? value : "";
  return text.split(",").flatMap((part) => {
    const [start, end] = part.split("-").map((item) => item.trim());
    if (!start || !end || minutes(start) === null || minutes(end) === null) return [];
    return [{ startTime: start, endTime: end }];
  });
}

/**
 * Resolve the opening windows that apply to a date. `configured` is false when
 * the department has no opening-hours data at all, in which case callers must
 * not restrict slots.
 */
export function openingWindowsForDate(date: string, openingHours: OpeningHours) {
  if (!openingHours) return { configured: false, windows: [] as Array<{ startTime: string; endTime: string }> };
  const entries = Object.entries(openingHours).filter(([, value]) => (
    typeof value === "string" ? value.trim().length > 0 : Array.isArray(value) && value.length > 0
  ));
  if (!entries.length) return { configured: false, windows: [] as Array<{ startTime: string; endTime: string }> };
  const day = dayOfWeekForDate(date);
  if (day === null) return { configured: true, windows: [] as Array<{ startTime: string; endTime: string }> };
  const key = openingDayKeys[day];
  const name = openingDayNames[day];
  const match = entries.find(([entryKey]) => {
    const normalized = entryKey.trim().toLowerCase();
    return normalized === key || normalized === name || normalized === String(day);
  });
  return { configured: true, windows: match ? parseOpeningWindows(match[1]) : [] };
}

function dateRangesOverlap(
  left: { effectiveFrom?: string | null; effectiveTo?: string | null },
  right: { effectiveFrom?: string | null; effectiveTo?: string | null },
) {
  const leftStart = left.effectiveFrom || "0000-01-01";
  const leftEnd = left.effectiveTo || "9999-12-31";
  const rightStart = right.effectiveFrom || "0000-01-01";
  const rightEnd = right.effectiveTo || "9999-12-31";
  return leftStart <= rightEnd && rightStart <= leftEnd;
}

export function validateAvailabilityIntervals(intervals: AvailabilityInterval[]) {
  const sorted = [...intervals].sort((a, b) => (a.dayOfWeek - b.dayOfWeek) || ((minutes(a.startTime) ?? 0) - (minutes(b.startTime) ?? 0)));
  for (const interval of sorted) {
    const start = minutes(interval.startTime);
    const end = minutes(interval.endTime);
    if (interval.dayOfWeek < 0 || interval.dayOfWeek > 6 || start === null || end === null || end <= start) return false;
    if (interval.effectiveFrom && interval.effectiveTo && interval.effectiveTo < interval.effectiveFrom) return false;
  }
  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1];
    const current = sorted[index];
    if (previous.dayOfWeek === current.dayOfWeek
      && (minutes(previous.endTime) ?? 0) > (minutes(current.startTime) ?? 0)
      && dateRangesOverlap(previous, current)) return false;
  }
  return true;
}

function overlaps(start: Date, end: Date, interval: BusyInterval) {
  const otherStart = new Date(interval.startsAt).getTime();
  const otherEnd = new Date(interval.endsAt).getTime();
  return start.getTime() < otherEnd && end.getTime() > otherStart;
}

export function localDateBounds(date: string, timeZone: string) {
  const nextDate = addCalendarDay(date);
  if (!nextDate) return null;
  const start = facilityLocalDateAndTimeToInstant(date, "00:00", timeZone);
  const end = facilityLocalDateAndTimeToInstant(nextDate, "00:00", timeZone);
  return start && end ? { start, end } : null;
}

export function generateSlots(input: { date: string; timeZone?: string; durationMinutes: number; intervals: AvailabilityInterval[]; exceptions?: AvailabilityException[]; busy?: BusyInterval[]; now?: Date; openingHours?: OpeningHours }) {
  if (!Number.isInteger(input.durationMinutes) || input.durationMinutes <= 0 || !validateAvailabilityIntervals(input.intervals)) return [];
  const day = dayOfWeekForDate(input.date);
  if (day === null) return [];
  const opening = openingWindowsForDate(input.date, input.openingHours);
  const openingMinutes = opening.windows
    .map((window) => ({ start: minutes(window.startTime), end: minutes(window.endTime) }))
    .filter((window): window is { start: number; end: number } => (
      window.start !== null && window.end !== null && window.end > window.start
    ));
  const base = new Date(`${input.date}T00:00:00`);
  const applicable = input.intervals
    .filter((item) => item.dayOfWeek === day && isAvailabilityRuleEffective(input.date, item))
    .map((item) => ({ ...item }));
  for (const exception of input.exceptions ?? []) {
    if (exception.type !== "available_override") continue;
    const start = instantInTimeZone(exception.startsAt, input.timeZone ?? "UTC");
    const end = instantInTimeZone(exception.endsAt, input.timeZone ?? "UTC");
    if (!start || !end || start.date !== input.date || end.date !== input.date) continue;
    applicable.push({ dayOfWeek: day, startTime: start.time, endTime: end.time });
  }
  const slots: Slot[] = [];
  for (const interval of applicable) {
    const startMinutes = minutes(interval.startTime);
    const endMinutes = minutes(interval.endTime);
    if (startMinutes === null || endMinutes === null) continue;
    for (let cursor = startMinutes; cursor + input.durationMinutes <= endMinutes; cursor += SCHEDULING_GRID_MINUTES) {
      if (opening.configured && !openingMinutes.some((window) => cursor >= window.start && cursor + input.durationMinutes <= window.end)) continue;
      const localHour = String(Math.floor(cursor / 60)).padStart(2, "0");
      const localMinute = String(cursor % 60).padStart(2, "0");
      const start = input.timeZone ? facilityLocalDateAndTimeToInstant(input.date, `${localHour}:${localMinute}`, input.timeZone) : new Date(base);
      if (!start) continue;
      if (!input.timeZone) start.setMinutes(cursor);
      const end = new Date(start.getTime() + input.durationMinutes * 60_000);
      if (input.now && start <= input.now) continue;
      const blocked = (input.busy ?? []).some((item) => overlaps(start, end, item));
      const unavailable = (input.exceptions ?? []).some((item) => item.type === "unavailable" && overlaps(start, end, item));
      if (!blocked && !unavailable) slots.push({ startsAt: start.toISOString(), endsAt: end.toISOString() });
    }
  }
  return [...new Map(slots.map((slot) => [slot.startsAt, slot])).values()];
}

export function isEligibleClinician(input: ClinicianEligibility, requested: { organizationId: string; facilityId: string; departmentId: string; serviceId?: string | null }) {
  return input.active && input.roleKey === "doctor" && input.organizationId === requested.organizationId && input.facilityId === requested.facilityId && input.departmentIds.includes(requested.departmentId) && (!requested.serviceId || input.serviceIds.includes(requested.serviceId)) && input.isPublic && input.acceptingAppointments;
}

export function serviceDurationFits(interval: AvailabilityInterval, durationMinutes: number) {
  const start = minutes(interval.startTime);
  const end = minutes(interval.endTime);
  return start !== null && end !== null && end - start >= durationMinutes;
}
