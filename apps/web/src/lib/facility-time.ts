export type ZonedDateTimeParts = {
  date: string;
  time: string;
  dayOfWeek: number;
};

const dateTimePattern = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

function zonedParts(value: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
  }).formatToParts(value);
  return Object.fromEntries(
    parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]),
  );
}

export function instantInTimeZone(value: string | Date, timeZone: string): ZonedDateTimeParts | null {
  const instant = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(instant.valueOf())) return null;
  const parts = zonedParts(instant, timeZone);
  const weekdays: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
    dayOfWeek: weekdays[parts.weekday] ?? -1,
  };
}

function offsetAt(instant: Date, timeZone: string) {
  const parts = zonedParts(instant, timeZone);
  const displayedAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return displayedAsUtc - instant.getTime();
}

export function facilityLocalDateTimeToInstant(value: string, timeZone: string) {
  const match = dateTimePattern.exec(value);
  if (!match) return null;
  const naiveUtc = Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
  );
  if (Number.isNaN(naiveUtc)) return null;

  let instant = new Date(naiveUtc - offsetAt(new Date(naiveUtc), timeZone));
  instant = new Date(naiveUtc - offsetAt(instant, timeZone));
  const roundTrip = instantInTimeZone(instant, timeZone);
  if (!roundTrip || `${roundTrip.date}T${roundTrip.time}` !== value) return null;
  return instant;
}

export function facilityLocalDateAndTimeToInstant(date: string, time: string, timeZone: string) {
  return facilityLocalDateTimeToInstant(`${date}T${time.slice(0, 5)}`, timeZone);
}

export function facilityDateTimeInputValue(value: string, timeZone: string) {
  const parts = instantInTimeZone(value, timeZone);
  return parts ? `${parts.date}T${parts.time}` : "";
}

export function facilityDateTimeLabel(value: string, timeZone: string) {
  const parts = instantInTimeZone(value, timeZone);
  return parts ? `${parts.date} ${parts.time}` : "Invalid date";
}
