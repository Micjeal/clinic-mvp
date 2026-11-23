import "server-only";
import {Permissions} from "@clinic/permissions";
import {requirePermission} from "@/server/permissions/require-permission";
import {NotFoundError,ValidationError,AuthorizationError} from "@/server/errors";
import * as repo from "@/server/repositories/catalog.repository";
import {hasRolePermission} from "@/server/repositories/staff.repository";
import type {TablesInsert,TablesUpdate} from "@clinic/database";

export type FacilityInput = {
  name: string; code: string; facility_type: string;
  address_line: string | null; city: string | null; district: string | null; country_code: string;
  phone: string | null; email: string | null; timezone: string;
  is_public: boolean; is_active: boolean;
};

export type DepartmentInput = {
  name: string; code: string; description: string | null;
  facility_id: string; phone: string | null; email: string | null;
  opening_hours: Record<string, unknown>;
  is_public: boolean; is_active: boolean; sort_order: number;
};

export type ServiceInput = {
  name: string; code: string; description: string | null; service_type: string;
  department_id: string | null; facility_id: string | null;
  base_price: number | null; currency_code: string; duration_minutes: number | null;
  is_public: boolean; is_active: boolean;
};

const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const TIME_WINDOW = /^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/;

export function parseOpeningHours(raw: string): Record<string, string | string[]> {
  if (!raw.trim()) return {};
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new ValidationError("Opening hours must be valid JSON."); }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new ValidationError("Opening hours must be an object keyed by weekday.");
  const result: Record<string, string | string[]> = {};
  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    const day = key.toLowerCase();
    if (!(WEEKDAYS as readonly string[]).includes(day)) throw new ValidationError(`Unknown weekday "${key}" in opening hours.`);
    const windows = Array.isArray(value) ? value : [value];
    if (value === null || value === undefined || value === "") { result[day] = []; continue; }
    const list = windows.filter((item): item is string => typeof item === "string" && item.trim() !== "");
    for (const window of list) {
      if (!TIME_WINDOW.test(window.trim())) throw new ValidationError(`Invalid opening-hours window "${window}" for ${day}. Use HH:MM-HH:MM.`);
    }
    result[day] = list.length === 1 ? list[0].trim() : list.map((item) => item.trim());
  }
  return result;
}



/* --------------------------------- facilities --------------------------------- */

export async function listFacilities() {
  const staff = await requirePermission(Permissions.FACILITY_MANAGE);
  return repo.listFacilitiesForOrganization(staff.membership.organization_id);
}

export async function getFacility(id: string) {
  const staff = await requirePermission(Permissions.FACILITY_MANAGE);
  const facility = await repo.findFacilityForOrganization(id, staff.membership.organization_id);
  if (!facility) throw new NotFoundError("Facility not found.");
  return facility;
}

export async function saveFacility(id: string | null, input: FacilityInput) {
  const staff = await requirePermission(Permissions.FACILITY_MANAGE);
  const orgId = staff.membership.organization_id;
  if (id) {
    await repo.updateFacility(id, orgId, input as TablesUpdate<"facilities">);
    return { id };
  }
  const created = await repo.createFacility({ ...(input as TablesInsert<"facilities">), organization_id: orgId, code: input.code.toUpperCase() });
  return { id: created.id };
}

export async function setFacilityActive(id: string, isActive: boolean) {
  const staff = await requirePermission(Permissions.FACILITY_MANAGE);
  const orgId = staff.membership.organization_id;
  if (!isActive) {
    const activeDepartments = await repo.countActiveDepartmentsForFacility(id, orgId);
    if (activeDepartments > 0) throw new ValidationError(`This facility still has ${activeDepartments} active department${activeDepartments === 1 ? "" : "s"}. Deactivate or move them first.`);
  }
  await repo.updateFacility(id, orgId, { is_active: isActive });
  return { id };
}

/* --------------------------------- departments -------------------------------- */

export async function listDepartments(filters: repo.DepartmentListFilters = {}) {
  const staff = await requirePermission(Permissions.DEPARTMENT_MANAGE);
  return repo.listDepartmentsForOrganization(staff.membership.organization_id, filters);
}

export async function getDepartmentStats() {
  const staff = await requirePermission(Permissions.DEPARTMENT_MANAGE);
  return repo.countDepartmentsSummary(staff.membership.organization_id);
}

export async function getDepartment(id: string) {
  const staff = await requirePermission(Permissions.DEPARTMENT_MANAGE);
  const department = await repo.findDepartmentForOrganization(id, staff.membership.organization_id);
  if (!department) throw new NotFoundError("Department not found.");
  return department;
}

export async function saveDepartment(id: string | null, input: DepartmentInput) {
  const staff = await requirePermission(Permissions.DEPARTMENT_MANAGE);
  const orgId = staff.membership.organization_id;
  const facility = await repo.findFacilityForOrganization(input.facility_id, orgId);
  if (!facility) throw new ValidationError("Choose a facility that belongs to this organization.");
  const record = {
    name: input.name,
    code: input.code.toUpperCase(),
    description: input.description,
    facility_id: input.facility_id,
    phone: input.phone,
    email: input.email,
    opening_hours: input.opening_hours,
    is_public: input.is_public,
    is_active: input.is_active,
    sort_order: input.sort_order,
  };
  if (id) {
    await repo.updateDepartment(id, orgId, record as TablesUpdate<"departments">);
    return { id };
  }
  const created = await repo.createDepartment({ ...(record as TablesInsert<"departments">), organization_id: orgId });
  return { id: created.id };
}

export async function setDepartmentActive(id: string, isActive: boolean) {
  const staff = await requirePermission(Permissions.DEPARTMENT_MANAGE);
  await repo.updateDepartment(id, staff.membership.organization_id, { is_active: isActive });
  return { id };
}

export async function getDepartmentWorkspace(id: string) {
  const staff = await requirePermission(Permissions.DEPARTMENT_MANAGE);
  const orgId = staff.membership.organization_id;
  const department = await repo.findDepartmentForOrganization(id, orgId);
  if (!department) throw new NotFoundError("Department not found.");
  const [services, staffMembers, stats, appointments] = await Promise.all([
    repo.listDepartmentServices(id),
    repo.listDepartmentStaff(id),
    repo.departmentAppointmentStats(id, orgId),
    repo.listRecentDepartmentAppointments(id, orgId),
  ]);
  let assignableMembers: { id: string; full_name: string; role_name: string }[] = [];
  let canManageStaff = false;
  try {
    canManageStaff = await hasRolePermission(staff.membership.role_id, Permissions.STAFF_MANAGE);
    if (canManageStaff) assignableMembers = await repo.listOrgMembershipsForAssignment(orgId);
  } catch { /* staff listing is best-effort for non staff.manage viewers */ }
  return { department, services, staffMembers, stats, appointments, assignableMembers, canManageStaff };
}

export async function assignDepartmentStaff(departmentId: string, membershipId: string) {
  const staff = await requirePermission(Permissions.STAFF_MANAGE);
  const department = await repo.findDepartmentForOrganization(departmentId, staff.membership.organization_id);
  if (!department) throw new NotFoundError("Department not found.");
  await repo.assignDepartmentStaff(departmentId, membershipId);
  return { departmentId };
}

export async function removeDepartmentStaff(departmentId: string, membershipId: string) {
  const staff = await requirePermission(Permissions.STAFF_MANAGE);
  const department = await repo.findDepartmentForOrganization(departmentId, staff.membership.organization_id);
  if (!department) throw new NotFoundError("Department not found.");
  await repo.removeDepartmentStaff(departmentId, membershipId);
  return { departmentId };
}

export async function setDepartmentHead(departmentId: string, membershipId: string) {
  const staff = await requirePermission(Permissions.STAFF_MANAGE);
  const department = await repo.findDepartmentForOrganization(departmentId, staff.membership.organization_id);
  if (!department) throw new NotFoundError("Department not found.");
  await repo.setDepartmentHead(departmentId, membershipId);
  return { departmentId };
}

/* ----------------------------------- services --------------------------------- */

export async function listServices(filters: repo.ServiceListFilters = {}) {
  const staff = await requirePermission(Permissions.SERVICE_MANAGE);
  return repo.listServicesForOrganization(staff.membership.organization_id, filters);
}

export async function getServiceStats() {
  const staff = await requirePermission(Permissions.SERVICE_MANAGE);
  return repo.countServicesSummary(staff.membership.organization_id);
}

export async function getService(id: string) {
  const staff = await requirePermission(Permissions.SERVICE_MANAGE);
  const service = await repo.findServiceForOrganization(id, staff.membership.organization_id);
  if (!service) throw new NotFoundError("Service not found.");
  return service;
}

export async function saveService(id: string | null, input: ServiceInput) {
  const staff = await requirePermission(Permissions.SERVICE_MANAGE);
  const orgId = staff.membership.organization_id;
  if (input.department_id) {
    const department = await repo.findDepartmentForOrganization(input.department_id, orgId);
    if (!department) throw new ValidationError("Choose a department that belongs to this organization.");
  }
  if (input.facility_id) {
    const facility = await repo.findFacilityForOrganization(input.facility_id, orgId);
    if (!facility) throw new ValidationError("Choose a facility that belongs to this organization.");
  }
  // Online-booking eligibility stays implicit: is_public && is_active &&
  // duration_minutes != null. Public services without a duration remain
  // listed but cannot be booked — the booking flow already enforces this.
  const record = {
    name: input.name,
    code: input.code.toUpperCase(),
    description: input.description,
    service_type: input.service_type,
    department_id: input.department_id,
    facility_id: input.facility_id,
    base_price: input.base_price,
    currency_code: input.currency_code,
    duration_minutes: input.duration_minutes,
    is_public: input.is_public,
    is_active: input.is_active,
  };
  if (id) {
    await repo.updateService(id, orgId, record as TablesUpdate<"services">);
    return { id };
  }
  const created = await repo.createService({ ...(record as TablesInsert<"services">), organization_id: orgId });
  return { id: created.id };
}

export async function setServiceActive(id: string, isActive: boolean) {
  const staff = await requirePermission(Permissions.SERVICE_MANAGE);
  await repo.updateService(id, staff.membership.organization_id, { is_active: isActive });
  return { id };
}

export async function getServiceWorkspace(id: string) {
  const staff = await requirePermission(Permissions.SERVICE_MANAGE);
  const orgId = staff.membership.organization_id;
  const service = await repo.findServiceForOrganization(id, orgId);
  if (!service) throw new NotFoundError("Service not found.");
  let appointmentCount = 0;
  try { appointmentCount = await repo.countAppointmentsForService(id, orgId); } catch { /* stats best-effort */ }
  return { service, appointmentCount };
}
