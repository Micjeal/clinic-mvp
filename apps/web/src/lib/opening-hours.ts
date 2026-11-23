const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

export function openingHoursToText(hours: Record<string, unknown> | null | undefined): string {
  if (!hours || typeof hours !== "object") return "";
  const result: Record<string, string | string[]> = {};
  for (const day of WEEKDAYS) {
    const value = (hours as Record<string, unknown>)[day];
    if (value == null || value === "") continue;
    const windows = (Array.isArray(value) ? value : [value]).filter((item): item is string => typeof item === "string" && item.trim() !== "");
    if (!windows.length) continue;
    result[day] = windows.length === 1 ? windows[0].trim() : windows.map((item) => item.trim());
  }
  return Object.keys(result).length ? JSON.stringify(result) : "";
}

const WEEKDAY_LABELS: Record<string, string> = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" };

export function openingHoursToSchedule(hours: Record<string, unknown> | null | undefined): Array<{ day: string; windows: string }> {
  if (!hours || typeof hours !== "object") return [];
  return (WEEKDAYS as readonly string[])
    .map((day) => {
      const value = (hours as Record<string, unknown>)[day];
      const windows = Array.isArray(value) ? value.filter(Boolean).join(", ") : String(value ?? "");
      return windows ? { day: WEEKDAY_LABELS[day] ?? day, windows } : null;
    })
    .filter((item): item is { day: string; windows: string } => item !== null);
}
