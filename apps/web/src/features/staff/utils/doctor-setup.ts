export type DoctorSetupInput = {
  hasFacility: boolean;
  departmentCount: number;
  serviceCount: number;
  hasProfile: boolean;
  hasAvailability: boolean;
  isPublished: boolean;
};

export function getDoctorSetupProgress(input: DoctorSetupInput) {
  const steps = [
    ["Account created", true],
    ["Facility assigned", input.hasFacility],
    ["Department assigned", input.departmentCount > 0],
    ["Services assigned", input.serviceCount > 0],
    ["Public profile completed", input.hasProfile],
    ["Weekly availability configured", input.hasAvailability],
    ["Published on website", input.isPublished],
  ] as const;
  return { steps, completed: steps.filter(([, complete]) => complete).length, total: steps.length };
}
