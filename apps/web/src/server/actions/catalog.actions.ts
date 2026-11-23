"use server";

import {revalidatePath} from "next/cache";
import {z} from "zod";
import {safeServerMessage} from "@/server/errors";
import {logServerError} from "@/server/logging";
import {
  assignDepartmentStaff,
  parseOpeningHours,
  removeDepartmentStaff,
  saveDepartment,
  saveFacility,
  saveService,
  setDepartmentActive,
  setDepartmentHead,
  setFacilityActive,
  setServiceActive,
} from "@/server/services/catalog.service";

const codeSchema = z.string().trim().min(2, "Code is required").max(30).regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/, "Use letters, numbers, dashes or underscores");
const optionalText = (max: number) => z.string().trim().max(max).optional().nullable();
const boolField = z.string().optional().transform((value) => value === "true");
const optionalNumber = (schema: z.ZodType<number>) => z.preprocess((value) => value === "" || value == null ? null : value, schema.nullable().optional());

const facilitySchema = z.object({
  name: z.string().trim().min(2).max(120),
  code: codeSchema,
  facility_type: z.string().trim().min(2).max(40),
  address_line: optionalText(200),
  city: optionalText(100),
  district: optionalText(100),
  country_code: z.string().trim().length(2).default("UG"),
  phone: optionalText(30),
  email: z.string().trim().email().optional().nullable().or(z.literal("")),
  timezone: z.string().trim().min(3).max(60),
  is_public: boolField,
  is_active: boolField,
});

const departmentSchema = z.object({
  name: z.string().trim().min(2).max(120),
  code: codeSchema,
  description: optionalText(2000),
  facility_id: z.string().uuid(),
  phone: optionalText(30),
  email: z.string().trim().email().optional().nullable().or(z.literal("")),
  opening_hours: z.string().max(4000).default(""),
  is_public: boolField,
  is_active: boolField,
  sort_order: z.coerce.number().int().min(0).max(9999).default(0),
});

const SERVICE_TYPES = ["clinical", "diagnostic", "therapy", "procedure", "wellness", "administrative"] as const;

const serviceSchema = z.object({
  name: z.string().trim().min(2).max(160),
  code: codeSchema,
  description: optionalText(2000),
  service_type: z.enum(SERVICE_TYPES).default("clinical"),
  department_id: z.string().uuid().optional().nullable().or(z.literal("")),
  facility_id: z.string().uuid().optional().nullable().or(z.literal("")),
  base_price: optionalNumber(z.coerce.number().min(0).max(999999999)),
  currency_code: z.string().trim().length(3).default("UGX"),
  duration_minutes: optionalNumber(z.coerce.number().int().min(1).max(1440)),
  is_public: boolField,
  is_active: boolField,
});

function cleanEmail(value: string | null | undefined) {
  return value && value.trim() ? value.trim() : null;
}

function catalogPaths() {
  for (const path of ["/staff/facilities", "/staff/departments", "/staff/services", "/departments", "/departments/[id]", "/services", "/facilities", "/", "/appointments"]) revalidatePath(path);
}

export async function saveFacilityAction(_previous: unknown, formData: FormData) {
  const parsed = facilitySchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the facility details." };
  const input = parsed.data;
  try {
    const id = formData.get("id")?.toString() || null;
    const result = await saveFacility(id, {
      name: input.name, code: input.code, facility_type: input.facility_type,
      address_line: input.address_line || null, city: input.city || null, district: input.district || null,
      country_code: input.country_code.toUpperCase(), phone: input.phone || null, email: cleanEmail(input.email),
      timezone: input.timezone, is_public: input.is_public, is_active: input.is_active,
    });
    catalogPaths();
    return { success: "Facility saved.", id: result.id };
  } catch (error) {
    logServerError("catalog-actions", "save-facility-failed", error);
    return { error: safeServerMessage(error, "We couldn't save this facility.") };
  }
}

export async function setFacilityActiveAction(id: string, isActive: boolean) {
  try {
    await setFacilityActive(id, isActive);
    catalogPaths();
    return { success: isActive ? "Facility activated." : "Facility deactivated." };
  } catch (error) {
    logServerError("catalog-actions", "facility-active-failed", error, { facilityId: id });
    return { error: safeServerMessage(error, "We couldn't update this facility.") };
  }
}

export async function saveDepartmentAction(_previous: unknown, formData: FormData) {
  const parsed = departmentSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the department details." };
  const input = parsed.data;
  let openingHours: Record<string, unknown>;
  try {
    openingHours = parseOpeningHours(input.opening_hours);
  } catch (error) {
    return { error: safeServerMessage(error, "Check the opening hours format.") };
  }
  try {
    const id = formData.get("id")?.toString() || null;
    const result = await saveDepartment(id, {
      name: input.name, code: input.code, description: input.description || null,
      facility_id: input.facility_id, phone: input.phone || null, email: cleanEmail(input.email),
      opening_hours: openingHours, is_public: input.is_public, is_active: input.is_active, sort_order: input.sort_order,
    });
    catalogPaths();
    return { success: "Department saved.", id: result.id };
  } catch (error) {
    logServerError("catalog-actions", "save-department-failed", error);
    return { error: safeServerMessage(error, "We couldn't save this department.") };
  }
}

export async function setDepartmentActiveAction(id: string, isActive: boolean) {
  try {
    await setDepartmentActive(id, isActive);
    catalogPaths();
    return { success: isActive ? "Department activated." : "Department deactivated." };
  } catch (error) {
    logServerError("catalog-actions", "department-active-failed", error, { departmentId: id });
    return { error: safeServerMessage(error, "We couldn't update this department.") };
  }
}

export async function saveServiceAction(_previous: unknown, formData: FormData) {
  const parsed = serviceSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the service details." };
  const input = parsed.data;
  try {
    const id = formData.get("id")?.toString() || null;
    const result = await saveService(id, {
      name: input.name, code: input.code, description: input.description || null, service_type: input.service_type,
      department_id: input.department_id || null, facility_id: input.facility_id || null,
      base_price: input.base_price ?? null, currency_code: input.currency_code.toUpperCase(),
      duration_minutes: input.duration_minutes ?? null, is_public: input.is_public, is_active: input.is_active,
    });
    catalogPaths();
    return { success: "Service saved.", id: result.id };
  } catch (error) {
    logServerError("catalog-actions", "save-service-failed", error);
    return { error: safeServerMessage(error, "We couldn't save this service.") };
  }
}

export async function setServiceActiveAction(id: string, isActive: boolean) {
  try {
    await setServiceActive(id, isActive);
    catalogPaths();
    return { success: isActive ? "Service activated." : "Service deactivated." };
  } catch (error) {
    logServerError("catalog-actions", "service-active-failed", error, { serviceId: id });
    return { error: safeServerMessage(error, "We couldn't update this service.") };
  }
}

const uuidField = z.string().uuid();

export async function assignDepartmentStaffAction(departmentId: string, membershipId: string) {
  const parsed = uuidField.safeParse(membershipId);
  if (!parsed.success) return { error: "Choose a staff member." };
  try {
    await assignDepartmentStaff(departmentId, parsed.data);
    revalidatePath(`/staff/departments/${departmentId}`);
    return { success: "Staff member assigned." };
  } catch (error) {
    logServerError("catalog-actions", "assign-department-staff-failed", error, { departmentId });
    return { error: safeServerMessage(error, "We couldn't assign this staff member.") };
  }
}

export async function removeDepartmentStaffAction(departmentId: string, membershipId: string) {
  const parsed = uuidField.safeParse(membershipId);
  if (!parsed.success || !uuidField.safeParse(departmentId).success) return { error: "Invalid staff assignment." };
  try {
    await removeDepartmentStaff(departmentId, parsed.data);
    revalidatePath(`/staff/departments/${departmentId}`);
    return { success: "Staff assignment removed." };
  } catch (error) {
    logServerError("catalog-actions", "remove-department-staff-failed", error, { departmentId });
    return { error: safeServerMessage(error, "We couldn't remove this assignment.") };
  }
}

export async function setDepartmentHeadAction(departmentId: string, membershipId: string) {
  const parsed = uuidField.safeParse(membershipId);
  if (!parsed.success) return { error: "Choose a staff member." };
  try {
    await setDepartmentHead(departmentId, parsed.data);
    revalidatePath(`/staff/departments/${departmentId}`);
    return { success: "Department head updated." };
  } catch (error) {
    logServerError("catalog-actions", "set-department-head-failed", error, { departmentId });
    return { error: safeServerMessage(error, "We couldn't update the department head.") };
  }
}

