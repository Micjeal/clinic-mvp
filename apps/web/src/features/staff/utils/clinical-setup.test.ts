import { describe, expect, it } from "vitest";
import {
  addClinicalDepartment,
  clinicalSelectionKey,
  makeClinicalDepartmentPrimary,
  removeClinicalDepartment,
  toggleClinicalService,
} from "./clinical-setup";

const services = [
  { id: "pediatric-consultation", department_id: "pediatrics" },
  { id: "child-review", department_id: "pediatrics" },
  { id: "general-consultation", department_id: "general" },
];

describe("clinical setup selection", () => {
  it("makes the first assigned department primary and adds more without changing it", () => {
    const oneDepartment = addClinicalDepartment([], "pediatrics");
    expect(oneDepartment).toEqual(["pediatrics"]);
    expect(addClinicalDepartment(oneDepartment, "general")).toEqual(["pediatrics", "general"]);
  });

  it("changes the explicit primary department by moving it first", () => {
    expect(makeClinicalDepartmentPrimary(["pediatrics", "general"], "general")).toEqual([
      "general",
      "pediatrics",
    ]);
  });

  it("removes a department and only its services", () => {
    expect(
      removeClinicalDepartment(
        ["pediatrics", "general"],
        ["pediatric-consultation", "child-review", "general-consultation"],
        "pediatrics",
        services,
      ),
    ).toEqual({ departmentIds: ["general"], serviceIds: ["general-consultation"] });
  });

  it("clears services when the last department is removed", () => {
    expect(
      removeClinicalDepartment(
        ["pediatrics"],
        ["pediatric-consultation", "shared-service"],
        "pediatrics",
        [...services, { id: "shared-service", department_id: null }],
      ),
    ).toEqual({ departmentIds: [], serviceIds: [] });
  });

  it("supports no, one, and multiple selected services", () => {
    const oneService = toggleClinicalService([], "pediatric-consultation", true);
    const multipleServices = toggleClinicalService(oneService, "child-review", true);
    expect(oneService).toEqual(["pediatric-consultation"]);
    expect(multipleServices).toEqual(["pediatric-consultation", "child-review"]);
    expect(toggleClinicalService(multipleServices, "pediatric-consultation", false)).toEqual([
      "child-review",
    ]);
  });

  it("detects unsaved changes while ignoring checkbox selection order", () => {
    const saved = clinicalSelectionKey(["pediatrics"], ["child-review", "pediatric-consultation"]);
    expect(clinicalSelectionKey(["pediatrics"], ["pediatric-consultation", "child-review"])).toBe(saved);
    expect(clinicalSelectionKey(["general", "pediatrics"], ["child-review"])).not.toBe(saved);
  });
});
