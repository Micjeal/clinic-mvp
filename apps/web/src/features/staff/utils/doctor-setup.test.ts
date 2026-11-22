import { describe, expect, it } from "vitest";
import { getDoctorSetupProgress } from "./doctor-setup";

describe("doctor setup progress", () => {
  it("shows incomplete configuration without inventing completion", () => {
    const progress = getDoctorSetupProgress({ hasFacility: true, departmentCount: 1, serviceCount: 0, hasProfile: false, hasAvailability: false, isPublished: false });
    expect(progress.completed).toBe(3);
    expect(progress.total).toBe(7);
    expect(progress.steps.find(([label]) => label === "Services assigned")?.[1]).toBe(false);
  });

  it("marks a fully configured doctor complete", () => {
    expect(getDoctorSetupProgress({ hasFacility: true, departmentCount: 1, serviceCount: 2, hasProfile: true, hasAvailability: true, isPublished: true }).completed).toBe(7);
  });
});
