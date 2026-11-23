import "server-only";
import {createClient} from "@/lib/supabase/server";
import type {Tables,TablesInsert,TablesUpdate} from "@clinic/database";

export type CatalogFacility = Tables<"facilities"> & { department_count?: number };
export type CatalogDepartment = Tables<"departments"> & { facility_name?: string | null };
export type CatalogService = Tables<"services"> & { department_name?: string | null; facility_name?: string | null };

export type DepartmentStaffMember = {
  membership_id: string;
  department_id: string;
  is_primary: boolean;
  is_department_head: boolean;
  full_name: string;
  job_title: string | null;
  role_name: string;
  is_active: boolean;
};

export type DepartmentAppointmentRow = {
  id: string;
  status: string;
  scheduled_start: string;
  patient_name: string;
};

const FACILITY_SELECT = "*";
const DEPARTMENT_SELECT = "*,facilities!departments_facility_id_fkey(name)";
const SERVICE_SELECT = "*,departments!services_department_id_fkey(name),facilities!services_facility_id_fkey(name)";

function one<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function mapDepartment(row: Record<string, unknown>): CatalogDepartment {
  const facility = one(row.facilities as { name: string } | { name: string }[] | null);
  const { facilities: _facilities, ...rest } = row;
  return { ...(rest as unknown as Tables<"departments">), facility_name: facility?.name ?? null };
}

function mapService(row: Record<string, unknown>): CatalogService {
  const department = one(row.departments as { name: string } | { name: string }[] | null);
  const facility = one(row.facilities as { name: string } | { name: string }[] | null);
  const { departments: _departments, facilities: _facilities, ...rest } = row;
  return { ...(rest as unknown as Tables<"services">), department_name: department?.name ?? null, facility_name: facility?.name ?? null };
}

/* ---------------------------------- facilities ---------------------------------- */

export async function listFacilitiesForOrganization(organizationId: string): Promise<CatalogFacility[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("facilities").select(FACILITY_SELECT).eq("organization_id", organizationId).order("name");
  if (error) throw error;
  const facilities = (data ?? []) as Tables<"facilities">[];
  const { data: deptCounts, error: countError } = await supabase.from("departments").select("facility_id").eq("organization_id", organizationId).eq("is_active", true);
  if (countError) throw countError;
  const counts = new Map<string, number>();
  for (const row of deptCounts ?? []) counts.set(row.facility_id, (counts.get(row.facility_id) ?? 0) + 1);
  return facilities.map((facility) => ({ ...facility, department_count: counts.get(facility.id) ?? 0 }));
}

export async function findFacilityForOrganization(id: string, organizationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("facilities").select(FACILITY_SELECT).eq("id", id).eq("organization_id", organizationId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function createFacility(input: TablesInsert<"facilities">) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("facilities").insert(input).select("id").single();
  if (error) throw error;
  return data;
}

export async function updateFacility(id: string, organizationId: string, patch: TablesUpdate<"facilities">) {
  const supabase = await createClient();
  const { error } = await supabase.from("facilities").update(patch).eq("id", id).eq("organization_id", organizationId);
  if (error) throw error;
}

export async function countActiveDepartmentsForFacility(facilityId: string, organizationId: string) {
  const supabase = await createClient();
  const { count, error } = await supabase.from("departments").select("id", { count: "exact", head: true }).eq("facility_id", facilityId).eq("organization_id", organizationId).eq("is_active", true);
  if (error) throw error;
  return count ?? 0;
}

/* --------------------------------- departments --------------------------------- */

export type DepartmentListFilters = { facilityId?: string; status?: "active" | "inactive" | "all"; search?: string; page?: number; pageSize?: number };

export async function listDepartmentsForOrganization(organizationId: string, filters: DepartmentListFilters = {}) {
  const supabase = await createClient();
  const pageSize = filters.pageSize ?? 25;
  const page = Math.max(1, filters.page ?? 1);
  let query = supabase.from("departments").select(DEPARTMENT_SELECT, { count: "exact" }).eq("organization_id", organizationId);
  if (filters.facilityId) query = query.eq("facility_id", filters.facilityId);
  if (filters.status === "active") query = query.eq("is_active", true);
  if (filters.status === "inactive") query = query.eq("is_active", false);
  if (filters.search?.trim()) {
    const term = filters.search.trim().replace(/[%,()]/g, "");
    query = query.or(`name.ilike.%${term}%,code.ilike.%${term}%`);
  }
  const { data, error, count } = await query.order("sort_order").order("name").range((page - 1) * pageSize, page * pageSize - 1);
  if (error) throw error;
  return { items: ((data ?? []) as unknown as Record<string, unknown>[]).map(mapDepartment), total: count ?? 0, page, pageSize };
}

export async function countDepartmentsSummary(organizationId: string) {
  const supabase = await createClient();
  const base = () => supabase.from("departments").select("id", { count: "exact", head: true }).eq("organization_id", organizationId);
  const [total, active, visible] = await Promise.all([
    base(), base().eq("is_active", true), base().eq("is_active", true).eq("is_public", true),
  ]);
  for (const result of [total, active, visible]) if (result.error) throw result.error;
  return { total: total.count ?? 0, active: active.count ?? 0, public: visible.count ?? 0 };
}

export async function findDepartmentForOrganization(id: string, organizationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("departments").select(DEPARTMENT_SELECT).eq("id", id).eq("organization_id", organizationId).maybeSingle();
  if (error) throw error;
  return data ? mapDepartment(data as unknown as Record<string, unknown>) : null;
}

export async function createDepartment(input: TablesInsert<"departments">) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("departments").insert(input).select("id").single();
  if (error) throw error;
  return data;
}

export async function updateDepartment(id: string, organizationId: string, patch: TablesUpdate<"departments">) {
  const supabase = await createClient();
  const { error } = await supabase.from("departments").update(patch).eq("id", id).eq("organization_id", organizationId);
  if (error) throw error;
}

export async function listDepartmentStaff(departmentId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("staff_department_assignments")
    .select("membership_id,department_id,is_primary,is_department_head,staff_memberships!staff_department_assignments_membership_id_fkey(id,is_active,job_title,profiles!staff_memberships_user_id_fkey(full_name),roles!staff_memberships_role_id_fkey(name))")
    .eq("department_id", departmentId);
  if (error) throw error;
  return ((data ?? []) as unknown as Array<Record<string, unknown>>).map((row) => {
    const membership = one(row.staff_memberships as Record<string, unknown> | Record<string, unknown>[] | null) ?? {};
    const profile = one(membership.profiles as { full_name: string | null } | { full_name: string | null }[] | null);
    const role = one(membership.roles as { name: string } | { name: string }[] | null);
    return {
      membership_id: row.membership_id as string,
      department_id: row.department_id as string,
      is_primary: Boolean(row.is_primary),
      is_department_head: Boolean(row.is_department_head),
      full_name: profile?.full_name ?? "Staff member",
      job_title: (membership.job_title as string | null) ?? null,
      role_name: role?.name ?? "Staff",
      is_active: Boolean(membership.is_active),
    } satisfies DepartmentStaffMember;
  }).sort((a, b) => Number(b.is_department_head) - Number(a.is_department_head) || Number(b.is_primary) - Number(a.is_primary) || a.full_name.localeCompare(b.full_name));
}

export async function assignDepartmentStaff(departmentId: string, membershipId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("staff_department_assignments").upsert({ department_id: departmentId, membership_id: membershipId, is_primary: false }, { onConflict: "membership_id,department_id", ignoreDuplicates: true });
  if (error) throw error;
}

export async function removeDepartmentStaff(departmentId: string, membershipId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("staff_department_assignments").delete().eq("department_id", departmentId).eq("membership_id", membershipId);
  if (error) throw error;
}

export async function setDepartmentHead(departmentId: string, membershipId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_department_head", { p_department_id: departmentId, p_membership_id: membershipId });
  if (error) throw error;
}

export async function listDepartmentServices(departmentId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("services").select(SERVICE_SELECT).eq("department_id", departmentId).order("name");
  if (error) throw error;
  return ((data ?? []) as unknown as Record<string, unknown>[]).map(mapService);
}

export async function departmentAppointmentStats(departmentId: string, organizationId: string) {
  const supabase = await createClient();
  const { count: total, error: totalError } = await supabase.from("appointments").select("id", { count: "exact", head: true }).eq("department_id", departmentId).eq("organization_id", organizationId);
  if (totalError) throw totalError;
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { count: recent, error: recentError } = await supabase.from("appointments").select("id", { count: "exact", head: true }).eq("department_id", departmentId).eq("organization_id", organizationId).gte("scheduled_start", since);
  if (recentError) throw recentError;
  return { total: total ?? 0, last30Days: recent ?? 0 };
}

export async function listRecentDepartmentAppointments(departmentId: string, organizationId: string, limit = 10) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("appointments")
    .select("id,status,scheduled_start,patients!appointments_patient_id_fkey(first_name,last_name)")
    .eq("department_id", departmentId)
    .eq("organization_id", organizationId)
    .order("scheduled_start", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as unknown as Array<Record<string, unknown>>).map((row) => {
    const patient = one(row.patients as { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null);
    return {
      id: row.id as string,
      status: row.status as string,
      scheduled_start: row.scheduled_start as string,
      patient_name: patient ? [patient.first_name, patient.last_name].filter(Boolean).join(" ") : "Patient",
    } satisfies DepartmentAppointmentRow;
  });
}

export async function listOrgMembershipsForAssignment(organizationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("staff_memberships")
    .select("id,is_active,profiles!staff_memberships_user_id_fkey(full_name),roles!staff_memberships_role_id_fkey(name)")
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as Array<Record<string, unknown>>).map((row) => {
    const profile = one(row.profiles as { full_name: string | null } | { full_name: string | null }[] | null);
    const role = one(row.roles as { name: string } | { name: string }[] | null);
    return { id: row.id as string, full_name: profile?.full_name ?? "Staff member", role_name: role?.name ?? "Staff" };
  });
}

/* ----------------------------------- services ---------------------------------- */

export type ServiceListFilters = { departmentId?: string; status?: "active" | "inactive" | "all"; search?: string; page?: number; pageSize?: number };

export async function listServicesForOrganization(organizationId: string, filters: ServiceListFilters = {}) {
  const supabase = await createClient();
  const pageSize = filters.pageSize ?? 25;
  const page = Math.max(1, filters.page ?? 1);
  let query = supabase.from("services").select(SERVICE_SELECT, { count: "exact" }).eq("organization_id", organizationId);
  if (filters.departmentId === "none") query = query.is("department_id", null);
  else if (filters.departmentId) query = query.eq("department_id", filters.departmentId);
  if (filters.status === "active") query = query.eq("is_active", true);
  if (filters.status === "inactive") query = query.eq("is_active", false);
  if (filters.search?.trim()) {
    const term = filters.search.trim().replace(/[%,()]/g, "");
    query = query.or(`name.ilike.%${term}%,code.ilike.%${term}%`);
  }
  const { data, error, count } = await query.order("name").range((page - 1) * pageSize, page * pageSize - 1);
  if (error) throw error;
  return { items: ((data ?? []) as unknown as Record<string, unknown>[]).map(mapService), total: count ?? 0, page, pageSize };
}

export async function countServicesSummary(organizationId: string) {
  const supabase = await createClient();
  const base = () => supabase.from("services").select("id", { count: "exact", head: true }).eq("organization_id", organizationId);
  const [total, active, bookable] = await Promise.all([
    base(), base().eq("is_active", true), base().eq("is_active", true).eq("is_public", true).not("duration_minutes", "is", null),
  ]);
  for (const result of [total, active, bookable]) if (result.error) throw result.error;
  return { total: total.count ?? 0, active: active.count ?? 0, bookable: bookable.count ?? 0 };
}

export async function findServiceForOrganization(id: string, organizationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("services").select(SERVICE_SELECT).eq("id", id).eq("organization_id", organizationId).maybeSingle();
  if (error) throw error;
  return data ? mapService(data as unknown as Record<string, unknown>) : null;
}

export async function createService(input: TablesInsert<"services">) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("services").insert(input).select("id").single();
  if (error) throw error;
  return data;
}

export async function updateService(id: string, organizationId: string, patch: TablesUpdate<"services">) {
  const supabase = await createClient();
  const { error } = await supabase.from("services").update(patch).eq("id", id).eq("organization_id", organizationId);
  if (error) throw error;
}

export async function countAppointmentsForService(serviceId: string, organizationId: string) {
  const supabase = await createClient();
  const { count, error } = await supabase.from("appointments").select("id", { count: "exact", head: true }).eq("service_id", serviceId).eq("organization_id", organizationId);
  if (error) throw error;
  return count ?? 0;
}
