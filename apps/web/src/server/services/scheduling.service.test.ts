import { describe, expect, it } from "vitest";
import { dayOfWeekForDate, generateSlots, isAvailabilityRuleEffective, isEligibleClinician, localDateBounds, validateAvailabilityIntervals } from "./scheduling.service";

describe("scheduling service", () => {
  it("maps every calendar date to the canonical Sunday=0 through Saturday=6 values", () => {
    expect(["2026-10-11", "2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16", "2026-10-17"].map(dayOfWeekForDate)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("uses the calendar weekday consistently when generating facility-local slots", () => {
    const slots = generateSlots({ date: "2026-10-12", timeZone: "Africa/Kampala", durationMinutes: 30, intervals: [{ dayOfWeek: 1, startTime: "08:00", endTime: "09:00" }] });
    expect(slots.map((slot) => slot.startsAt)).toEqual(["2026-10-12T05:00:00.000Z", "2026-10-12T05:15:00.000Z", "2026-10-12T05:30:00.000Z"]);
  });

  it("calculates recurring-date query bounds in the facility timezone", () => {
    const bounds = localDateBounds("2026-10-12", "Africa/Kampala");
    expect(bounds?.start.toISOString()).toBe("2026-10-11T21:00:00.000Z");
    expect(bounds?.end.toISOString()).toBe("2026-10-12T21:00:00.000Z");
  });

  it("validates multiple non-overlapping periods", () => {
    expect(validateAvailabilityIntervals([{ dayOfWeek: 1, startTime: "08:00", endTime: "13:00" }, { dayOfWeek: 1, startTime: "14:00", endTime: "17:00" }])).toBe(true);
    expect(validateAvailabilityIntervals([{ dayOfWeek: 1, startTime: "08:00", endTime: "10:00" }, { dayOfWeek: 1, startTime: "09:30", endTime: "11:00" }])).toBe(false);
  });

  it("uses service duration and removes overlapping appointments", () => {
    const slots = generateSlots({ date: "2026-10-12", timeZone: "Africa/Kampala", durationMinutes: 30, intervals: [{ dayOfWeek: 1, startTime: "08:00", endTime: "10:00" }], busy: [{ startsAt: "2026-10-12T05:30:00.000Z", endsAt: "2026-10-12T06:00:00.000Z" }] });
    expect(slots.map((slot) => slot.startsAt.slice(11, 16))).toEqual(["05:00", "06:00", "06:15", "06:30"]);
  });

  it("does not fit a service beyond the end of a working period", () => {
    const slots = generateSlots({ date: "2026-10-12", durationMinutes: 45, intervals: [{ dayOfWeek: 1, startTime: "08:00", endTime: "08:30" }] });
    expect(slots).toEqual([]);
  });

  it("applies unavailable and available override exceptions", () => {
    const slots = generateSlots({ date: "2026-10-12", durationMinutes: 30, intervals: [{ dayOfWeek: 1, startTime: "08:00", endTime: "10:00" }], exceptions: [{ startsAt: "2026-10-12T08:00:00", endsAt: "2026-10-12T09:00:00", type: "unavailable" }, { startsAt: "2026-10-12T08:30:00", endsAt: "2026-10-12T09:00:00", type: "available_override" }] });
    expect(slots.map((slot) => slot.startsAt.slice(11, 16))).not.toContain("05:15");
    expect(slots.map((slot) => slot.startsAt.slice(11, 16))).not.toContain("05:00");
  });

  it("filters doctors by organization, role, assignments and public settings", () => {
    const base = { active: true, roleKey: "doctor", organizationId: "org", facilityId: "facility", departmentIds: ["dept"], serviceIds: ["service"], isPublic: true, acceptingAppointments: true };
    expect(isEligibleClinician(base, { organizationId: "org", facilityId: "facility", departmentId: "dept", serviceId: "service" })).toBe(true);
    expect(isEligibleClinician({ ...base, acceptingAppointments: false }, { organizationId: "org", facilityId: "facility", departmentId: "dept", serviceId: "service" })).toBe(false);
    expect(isEligibleClinician({ ...base, roleKey: "receptionist" }, { organizationId: "org", facilityId: "facility", departmentId: "dept", serviceId: "service" })).toBe(false);
    expect(isEligibleClinician({ ...base, serviceIds: [] }, { organizationId: "org", facilityId: "facility", departmentId: "dept", serviceId: "service" })).toBe(false);
  });

  it("lets a valid available override add time outside the base schedule", () => {
    const slots = generateSlots({ date: "2026-10-12", timeZone: "Africa/Kampala", durationMinutes: 30, intervals: [], exceptions: [{ startsAt: "2026-10-12T11:00:00.000Z", endsAt: "2026-10-12T12:00:00.000Z", type: "available_override" }] });
    expect(slots.length).toBeGreaterThan(0);
  });

  it("keeps a Kampala available override on its local date across the UTC boundary", () => {
    const slots = generateSlots({
      date: "2026-10-12",
      timeZone: "Africa/Kampala",
      durationMinutes: 30,
      intervals: [],
      exceptions: [{
        startsAt: "2026-10-11T21:30:00.000Z",
        endsAt: "2026-10-11T23:30:00.000Z",
        type: "available_override",
      }],
    });
    expect(slots.map((slot) => slot.startsAt)).toContain("2026-10-11T21:30:00.000Z");
    expect(slots.map((slot) => slot.startsAt)).toContain("2026-10-11T23:00:00.000Z");
  });

  it("applies Kampala unavailability on the local date even when UTC is the previous day", () => {
    const slots = generateSlots({
      date: "2026-10-12",
      timeZone: "Africa/Kampala",
      durationMinutes: 30,
      intervals: [{ dayOfWeek: 1, startTime: "00:00", endTime: "03:00" }],
      exceptions: [{
        startsAt: "2026-10-11T21:30:00.000Z",
        endsAt: "2026-10-11T23:30:00.000Z",
        type: "unavailable",
      }],
    });
    expect(slots.map((slot) => slot.startsAt)).toEqual([
      "2026-10-11T21:00:00.000Z",
      "2026-10-11T23:30:00.000Z",
    ]);
  });

  it("keeps occupied ranges blocked even when an override exists", () => {
    const slots = generateSlots({ date: "2026-10-12", durationMinutes: 30, intervals: [{ dayOfWeek: 1, startTime: "08:00", endTime: "10:00" }], exceptions: [{ startsAt: "2026-10-12T08:00:00", endsAt: "2026-10-12T10:00:00", type: "available_override" }], busy: [{ startsAt: "2026-10-12T08:00:00", endsAt: "2026-10-12T09:00:00" }] });
    expect(slots.map((slot) => slot.startsAt.slice(11, 16))).not.toContain("05:00");
  });

  it("rejects malformed availability times", () => {
    expect(validateAvailabilityIntervals([{ dayOfWeek: 1, startTime: "09:00", endTime: "09:00" }])).toBe(false);
    expect(validateAvailabilityIntervals([{ dayOfWeek: 1, startTime: "noon", endTime: "17:00" }])).toBe(false);
  });

  it("treats effective windows as inclusive bounds", () => {
    const rule = { effectiveFrom: "2026-10-12", effectiveTo: "2026-10-16" };
    expect(isAvailabilityRuleEffective("2026-10-11", rule)).toBe(false);
    expect(isAvailabilityRuleEffective("2026-10-12", rule)).toBe(true);
    expect(isAvailabilityRuleEffective("2026-10-16", rule)).toBe(true);
    expect(isAvailabilityRuleEffective("2026-10-17", rule)).toBe(false);
  });

  it("keeps a rule with no effective bounds active", () => {
    expect(isAvailabilityRuleEffective("2026-10-12", {})).toBe(true);
    expect(isAvailabilityRuleEffective("2026-10-12", { effectiveFrom: null, effectiveTo: null })).toBe(true);
  });

  it("only generates slots inside the effective window", () => {
    const base = { dayOfWeek: 1, startTime: "08:00", endTime: "09:00" };
    const input = { timeZone: "Africa/Kampala", durationMinutes: 30 };
    expect(generateSlots({ ...input, date: "2026-10-12", intervals: [base] }).length).toBeGreaterThan(0);
    expect(generateSlots({ ...input, date: "2026-10-11", intervals: [{ ...base, effectiveFrom: "2026-10-12" }] })).toEqual([]);
    expect(generateSlots({ ...input, date: "2026-10-19", intervals: [{ ...base, effectiveTo: "2026-10-16" }] })).toEqual([]);
  });

  it("keeps generated slots inside the department's opening hours", () => {
    const input = {
      timeZone: "Africa/Kampala",
      durationMinutes: 30,
      intervals: [{ dayOfWeek: 1, startTime: "07:00", endTime: "10:00" }],
      openingHours: { mon: "08:00-09:00" },
    };
    expect(generateSlots({ ...input, date: "2026-10-12" }).map((slot) => slot.startsAt)).toEqual([
      "2026-10-12T05:00:00.000Z",
      "2026-10-12T05:15:00.000Z",
      "2026-10-12T05:30:00.000Z",
    ]);
    expect(generateSlots({ ...input, date: "2026-10-13" })).toEqual([]);
  });

  it("does not restrict slots when opening hours are not configured", () => {
    const slots = generateSlots({
      date: "2026-10-12",
      timeZone: "Africa/Kampala",
      durationMinutes: 30,
      intervals: [{ dayOfWeek: 1, startTime: "08:00", endTime: "09:00" }],
      openingHours: {},
    });
    expect(slots.length).toBeGreaterThan(0);
  });

  it("allows the same clock period with non-overlapping effective windows", () => {
    expect(validateAvailabilityIntervals([
      { dayOfWeek: 1, startTime: "08:00", endTime: "12:00", effectiveFrom: "2026-01-01", effectiveTo: "2026-01-31" },
      { dayOfWeek: 1, startTime: "08:00", endTime: "12:00", effectiveFrom: "2026-02-01", effectiveTo: "2026-02-28" },
    ])).toBe(true);
    expect(validateAvailabilityIntervals([
      { dayOfWeek: 1, startTime: "08:00", endTime: "12:00", effectiveFrom: "2026-01-01", effectiveTo: "2026-02-28" },
      { dayOfWeek: 1, startTime: "08:00", endTime: "12:00", effectiveFrom: "2026-02-01", effectiveTo: "2026-03-31" },
    ])).toBe(false);
  });

  it("rejects a rule whose effective window ends before it starts", () => {
    expect(validateAvailabilityIntervals([
      { dayOfWeek: 1, startTime: "08:00", endTime: "12:00", effectiveFrom: "2026-03-01", effectiveTo: "2026-02-01" },
    ])).toBe(false);
  });
});
