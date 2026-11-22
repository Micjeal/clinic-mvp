import { describe, expect, it } from "vitest";
import type { Tables } from "@clinic/database";
import {
  clinicianIsCompatible,
  filterPortalServices,
  portalBookingPath,
  portalBookingPathWithContext,
  portalBookingSteps,
} from "./portal-booking";

const service = (id: string, facility_id: string | null, department_id: string | null) => ({ id, facility_id, department_id } as Tables<"services">);

describe("portal booking workflow", () => {
  it("uses the native portal booking route and compact steps", () => {
    expect(portalBookingPath).toBe("/portal/appointments/new");
    expect(portalBookingSteps).toEqual(["Location", "Department", "Service", "Doctor", "Date & time", "Review"]);
  });

  it("keeps services scoped to the selected location and department", () => {
    expect(filterPortalServices([service("matching", "facility-a", "department-a"), service("other-department", "facility-a", "department-b"), service("general", null, null)], "facility-a", "department-a").map((item) => item.id)).toEqual(["matching", "general"]);
  });

  it("preserves a Doctor slug through the authenticated portal redirect", () => {
    expect(portalBookingPathWithContext({ doctor: "dr-peter" }))
      .toBe("/portal/appointments/new?doctor=dr-peter");
  });

  it("preserves all supported safe booking context", () => {
    expect(portalBookingPathWithContext({
      facility: "facility-a",
      department: "department-a",
      service: "service-a",
      doctor: "dr-peter",
      date: "2026-10-15",
      scheduledStart: "2026-10-15T06:00:00.000Z",
    })).toContain("doctor=dr-peter");
  });

  it("retains a selected Doctor only while the care selection remains compatible", () => {
    const clinician = {
      key: "dr-peter",
      facilityIds: ["facility-a"],
      departmentIds: ["department-a"],
      serviceIds: ["service-a"],
    } as Parameters<typeof clinicianIsCompatible>[0];
    expect(clinicianIsCompatible(clinician, { facilityId: "facility-a", departmentId: "department-a" })).toBe(true);
    expect(clinicianIsCompatible(clinician, { facilityId: "facility-b" })).toBe(false);
  });
});
