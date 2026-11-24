import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json, Tables, TablesInsert, TablesUpdate } from "@clinic/database";

export type OrganizationSettings = Tables<"organization_settings">;
export type OrganizationSettingsPatch = TablesUpdate<"organization_settings">;
export type OrganizationProfile = Tables<"organizations">;
export type OrganizationProfilePatch = TablesUpdate<"organizations">;
export type AuditLogRow = Tables<"audit_logs">;
export type RoleRow = Tables<"roles">;
export type PermissionRow = Pick<Tables<"permissions">, "permission_key" | "description">;

/** Pre-migration deployments must keep working on defaults until the table exists. */
function isMissingSettingsTable(error: { code?: string } | null) {
  return error?.code === "PGRST205" || error?.code === "42P01";
}

/** Values identical to the database defaults; used when no row exists yet. */
export const DEFAULT_ORGANIZATION_SETTINGS: Omit<OrganizationSettings, "organization_id" | "created_at" | "updated_at" | "updated_by"> = {
  default_date_format: "d mmm yyyy",
  default_time_format: "24h",
  default_locale: "en-UG",
  online_booking_enabled: true,
  booking_min_advance_minutes: 0,
  booking_max_advance_days: 30,
  patient_cancellation_enabled: true,
  cancellation_cutoff_hours: 0,
  in_app_notifications_enabled: true,
  email_notifications_enabled: true,
  sms_notifications_enabled: true,
  appointment_reminders_enabled: false,
  reminder_hours_before: 24,
  brand_color: "#0d9488",
};

export async function findOrganizationSettings(organizationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_settings")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error) {
    if (isMissingSettingsTable(error)) return null;
    throw error;
  }
  return data;
}

/** System-path read (booking engine, notification service, cron) — bypasses RLS. */
export async function findOrganizationSettingsAdmin(organizationId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("organization_settings")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error) {
    if (isMissingSettingsTable(error)) return null;
    throw error;
  }
  return data;
}

export async function listOrganizationSettingsAdmin() {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("organization_settings").select("*");
  if (error) {
    if (isMissingSettingsTable(error)) return [];
    throw error;
  }
  return data ?? [];
}

export async function upsertOrganizationSettings(
  organizationId: string,
  patch: OrganizationSettingsPatch,
  updatedBy: string | null,
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_settings")
    .upsert(
      { organization_id: organizationId, ...patch, updated_by: updatedBy },
      { onConflict: "organization_id" },
    )
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function findOrganizationProfile(organizationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", organizationId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateOrganizationProfile(
  organizationId: string,
  patch: OrganizationProfilePatch,
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizations")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", organizationId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateOrganizationProfileAdmin(
  organizationId: string,
  patch: OrganizationProfilePatch,
) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("organizations")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", organizationId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function listAuditLogs(organizationId: string, limit = 50) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("audit_logs")
    .select("id,action,entity_type,entity_id,before_data,after_data,actor_user_id,created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function insertAuditLog(input: {
  organizationId: string;
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("audit_logs").insert({
    organization_id: input.organizationId,
    actor_user_id: input.actorUserId,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    before_data: input.before == null ? null : (input.before as unknown as Json),
    after_data: input.after == null ? null : (input.after as unknown as Json),
  });
  if (error) throw error;
}

export async function listAllPermissions() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("permissions").select("permission_key,description").order("permission_key");
  if (error) throw error;
  return data ?? [];
}

export async function findRoleForOrganization(roleId: string, organizationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("roles")
    .select("id,organization_id,role_key,name,description,is_system")
    .eq("id", roleId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createOrgRole(input: { organizationId: string; roleKey: string; name: string; description: string | null }) {
  const supabase = await createClient();
  const row: TablesInsert<"roles"> = {
    organization_id: input.organizationId,
    role_key: input.roleKey,
    name: input.name,
    description: input.description,
    is_system: false,
  };
  const { data, error } = await supabase.from("roles").insert(row).select("id,organization_id,role_key,name,description,is_system").single();
  if (error) throw error;
  return data;
}

export async function updateOrgRole(roleId: string, patch: { name?: string; description?: string | null }) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("roles")
    .update(patch)
    .eq("id", roleId)
    .select("id,organization_id,role_key,name,description,is_system")
    .single();
  if (error) throw error;
  return data;
}

export async function listRolePermissionKeys(roleId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("role_permissions").select("permission_key").eq("role_id", roleId);
  if (error) throw error;
  return (data ?? []).map((row) => row.permission_key);
}

export async function replaceRolePermissions(roleId: string, permissionKeys: string[]) {
  const supabase = await createClient();
  const { error: deleteError } = await supabase.from("role_permissions").delete().eq("role_id", roleId);
  if (deleteError) throw deleteError;
  if (!permissionKeys.length) return;
  const rows = permissionKeys.map((permission_key) => ({ role_id: roleId, permission_key }));
  const { error: insertError } = await supabase.from("role_permissions").insert(rows);
  if (insertError) throw insertError;
}
