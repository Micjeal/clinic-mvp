import "server-only";
import type { TablesInsert } from "@clinic/database";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type StaffDirectoryRow = { id: string; user_id: string; role_id: string; role_name: string; role_key: string; full_name: string; job_title: string | null; employee_number: string | null; registration_number: string | null; primary_facility_id: string | null; facility_name: string | null; is_active: boolean; must_change_password: boolean; department_names: string[] };
type RawStaff = { id: string; user_id: string; role_id: string; job_title: string | null; employee_number: string | null; registration_number: string | null; primary_facility_id: string | null; is_active: boolean; must_change_password: boolean; profiles: { full_name: string | null } | null; roles: { name: string; role_key: string } | null; facilities: { name: string } | null; staff_department_assignments: Array<{ departments: { name: string } | null }> | null };

export async function listStaffDirectory(organizationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("staff_memberships").select("id,user_id,role_id,job_title,employee_number,registration_number,primary_facility_id,is_active,must_change_password,profiles!staff_memberships_user_id_fkey(full_name),roles!staff_memberships_role_id_fkey(name,role_key),facilities!staff_memberships_primary_facility_id_fkey(name),staff_department_assignments(departments(name))").eq("organization_id", organizationId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((item) => mapStaffDirectoryRow(item as unknown as RawStaff));
}

export async function findStaffDirectoryMember(id: string, organizationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("staff_memberships").select("id,user_id,role_id,job_title,employee_number,registration_number,primary_facility_id,is_active,must_change_password,profiles!staff_memberships_user_id_fkey(full_name),roles!staff_memberships_role_id_fkey(name,role_key),facilities!staff_memberships_primary_facility_id_fkey(name),staff_department_assignments(departments(name))").eq("id", id).eq("organization_id", organizationId).maybeSingle();
  if (error) throw error;
  return data ? mapStaffDirectoryRow(data as unknown as RawStaff) : null;
}

function mapStaffDirectoryRow(item: RawStaff): StaffDirectoryRow {
  return { id: item.id, user_id: item.user_id, role_id: item.role_id, role_name: item.roles?.name ?? "Staff", role_key: item.roles?.role_key ?? "staff", full_name: item.profiles?.full_name ?? "Unnamed staff member", job_title: item.job_title, employee_number: item.employee_number, registration_number: item.registration_number, primary_facility_id: item.primary_facility_id, facility_name: item.facilities?.name ?? null, is_active: item.is_active, must_change_password: item.must_change_password, department_names: (item.staff_department_assignments ?? []).map((assignment) => assignment.departments?.name).filter((name): name is string => Boolean(name)) } satisfies StaffDirectoryRow;
}

export async function listStaffRoles(organizationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("roles").select("id,name,role_key").or(`organization_id.eq.${organizationId},organization_id.is.null`).order("name");
  if (error) throw error;
  return data ?? [];
}

export async function createStaffProvisioning(input: { userId: string; organizationId: string; roleId: string; jobTitle: string | null; employeeNumber: string | null; registrationNumber: string | null; facilityId: string | null; fullName: string; mustChangePassword: boolean }) {
  const admin = createAdminClient();
  const membership: TablesInsert<"staff_memberships"> = { user_id: input.userId, organization_id: input.organizationId, role_id: input.roleId, job_title: input.jobTitle, employee_number: input.employeeNumber, registration_number: input.registrationNumber, primary_facility_id: input.facilityId, must_change_password: input.mustChangePassword, is_active: true };
  const { error: profileError } = await admin.from("profiles").upsert({ id: input.userId, full_name: input.fullName, professional_title: input.jobTitle, status: "active" }, { onConflict: "id" });
  if (profileError) throw profileError;
  const { data, error } = await admin.from("staff_memberships").insert(membership).select("id").single();
  if (error) throw error;
  return data;
}

export async function deleteProvisionedAuthUser(userId: string) { const admin = createAdminClient(); const { error } = await admin.auth.admin.deleteUser(userId); if (error) throw error; }

export async function getClinicianManagementData(membershipId: string, organizationId: string) {
  const supabase = await createClient();
  const [{ data: profile }, { data: departments }, { data: services }, { data: rules }, { data: exceptions }, { data: specializations }, { data: qualifications }, { data: achievements }] = await Promise.all([
    supabase.from("clinician_profiles").select("slug,display_name,professional_title,public_bio,photo_path,years_experience,experience_summary,languages,is_public,accepting_appointments").eq("membership_id", membershipId).maybeSingle(),
    supabase.from("staff_department_assignments").select("department_id,is_primary,departments(id,name)").eq("membership_id", membershipId),
    supabase.from("staff_service_assignments").select("service_id,is_active,services(id,name,department_id)").eq("membership_id", membershipId),
    supabase.from("clinician_availability_rules").select("id,facility_id,day_of_week,start_time,end_time,effective_from,effective_to,is_active").eq("membership_id", membershipId).eq("organization_id", organizationId).order("day_of_week"),
    supabase.from("clinician_availability_exceptions").select("id,facility_id,starts_at,ends_at,type").eq("membership_id", membershipId).eq("organization_id", organizationId).order("starts_at"),
    supabase.from("clinician_specializations").select("id,name,description,sort_order").eq("membership_id", membershipId).eq("organization_id", organizationId).order("sort_order"),
    supabase.from("clinician_qualifications").select("id,qualification_type,qualification,institution,country,year,sort_order").eq("membership_id", membershipId).eq("organization_id", organizationId).order("sort_order"),
    supabase.from("clinician_achievements").select("id,title,description,year,sort_order").eq("membership_id", membershipId).eq("organization_id", organizationId).order("sort_order"),
  ]);
  const profileWithPublicPhoto = profile?.photo_path && !profile.photo_path.startsWith("http")
    ? {
        ...profile,
        photo_path: supabase.storage.from("clinician-photos").getPublicUrl(profile.photo_path).data.publicUrl,
      }
    : profile;
  return { profile: profileWithPublicPhoto, departments: departments ?? [], services: services ?? [], rules: rules ?? [], exceptions: exceptions ?? [], specializations: specializations ?? [], qualifications: qualifications ?? [], achievements: achievements ?? [] };
}
