import { describe, expect, it } from "vitest";
import { staffMembershipPath } from "./staff-route";

describe("staff membership route contract", () => {
  it("uses the membership id for the detail route", () => {
    expect(staffMembershipPath("membership-123")).toBe("/staff/users/membership-123");
  });

  it("keeps doctor setup as a UI query on the same membership route", () => {
    expect(staffMembershipPath("membership-123", true)).toBe("/staff/users/membership-123?setup=doctor");
  });
});
