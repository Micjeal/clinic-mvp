import { describe, expect, it } from "vitest";
import { canTransitionQueue, isQueuePriority } from "@clinic/shared";

describe("queue workflow", () => {
  it("allows the reception-to-triage path", () => {
    expect(canTransitionQueue("waiting_triage", "in_triage")).toBe(true);
    expect(canTransitionQueue("in_triage", "waiting_clinician")).toBe(true);
  });
  it("rejects skipping triage", () => {
    expect(canTransitionQueue("waiting_triage", "waiting_clinician")).toBe(false);
  });
  it("accepts only controlled priorities", () => {
    expect(isQueuePriority("urgent")).toBe(true);
    expect(isQueuePriority("critical")).toBe(false);
  });
});
