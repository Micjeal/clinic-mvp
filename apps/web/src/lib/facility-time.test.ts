import { describe, expect, it } from "vitest";
import {
  facilityDateTimeInputValue,
  facilityLocalDateTimeToInstant,
} from "./facility-time";

describe("facility-local date and time conversion", () => {
  it("interprets datetime-local values in Africa/Kampala instead of the server timezone", () => {
    expect(facilityLocalDateTimeToInstant("2026-10-12T09:00", "Africa/Kampala")?.toISOString())
      .toBe("2026-10-12T06:00:00.000Z");
  });

  it("renders stored instants back to the same Kampala local input value", () => {
    expect(facilityDateTimeInputValue("2026-10-12T06:00:00.000Z", "Africa/Kampala"))
      .toBe("2026-10-12T09:00");
  });

  it("round-trips a Kampala local time whose UTC date is the previous day", () => {
    const instant = facilityLocalDateTimeToInstant("2026-10-12T00:30", "Africa/Kampala");
    expect(instant?.toISOString()).toBe("2026-10-11T21:30:00.000Z");
    expect(facilityDateTimeInputValue(instant?.toISOString() ?? "", "Africa/Kampala"))
      .toBe("2026-10-12T00:30");
  });
});
