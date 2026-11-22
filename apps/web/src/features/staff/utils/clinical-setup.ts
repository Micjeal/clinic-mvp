export type ClinicalServiceOption = {
  id: string;
  department_id: string | null;
};

export function addClinicalDepartment(departmentIds: string[], departmentId: string) {
  return departmentIds.includes(departmentId) ? departmentIds : [...departmentIds, departmentId];
}

export function makeClinicalDepartmentPrimary(departmentIds: string[], departmentId: string) {
  if (!departmentIds.includes(departmentId)) return departmentIds;
  return [departmentId, ...departmentIds.filter((id) => id !== departmentId)];
}

export function removeClinicalDepartment(
  departmentIds: string[],
  serviceIds: string[],
  departmentId: string,
  services: ClinicalServiceOption[],
) {
  const remainingDepartmentIds = departmentIds.filter((id) => id !== departmentId);
  const removedServiceIds = new Set(
    services.filter((service) => service.department_id === departmentId).map((service) => service.id),
  );

  return {
    departmentIds: remainingDepartmentIds,
    serviceIds: remainingDepartmentIds.length
      ? serviceIds.filter((id) => !removedServiceIds.has(id))
      : [],
  };
}

export function toggleClinicalService(serviceIds: string[], serviceId: string, checked: boolean) {
  if (checked) return serviceIds.includes(serviceId) ? serviceIds : [...serviceIds, serviceId];
  return serviceIds.filter((id) => id !== serviceId);
}

export function clinicalSelectionKey(departmentIds: string[], serviceIds: string[]) {
  return `${departmentIds.join("|")}::${[...serviceIds].sort().join("|")}`;
}
