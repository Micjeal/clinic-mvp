import "server-only";
import { cache } from "react";
import { Permissions } from "@clinic/permissions";
import { NotFoundError, ValidationError } from "@/server/errors";
import { requirePermission } from "@/server/permissions/require-permission";
import { clinicOrganizationId } from "@/config/clinic";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import * as repo from "@/server/repositories/settings.repository";
import { listStaffDirectory } from "@/server/repositories/staff-management.repository";
import type { OrganizationProfilePatch, OrganizationSettingsPatch } from "@/server/repositories/settings.repository";

export type SettingsContext = {
  organization: repo.OrganizationProfile;
  settings: repo.OrganizationSettings | null;
  effective: typeof repo.DEFAULT_ORGANIZATION_SETTINGS & { organization_id: string } & Partial<Pick<repo.OrganizationSettings, "created_at" | "updated_at" | "updated_by">>;
};

function withDefaults(settings: repo.OrganizationSettings | null, organizationId: string) {
  return { organization_id: organizationId, ...repo.DEFAULT_ORGANIZATION_SETTINGS, ...(settings ?? {}) } as SettingsContext["effective"];
}

async function loadContext(organizationId: string): Promise<SettingsContext> {
  const [organization, settings] = await Promise.all([
    repo.findOrganizationProfile(organizationId),
    repo.findOrganizationSettings(organizationId),
  ]);
  if (!organization) throw new NotFoundError("Organization not found");
  return { organization, settings, effective: withDefaults(settings, organizationId) };
}

async function audit(
  staff: { user: { id: string }; membership: { organization_id: string } },
  action: string,
  entityType: string,
  entityId: string | null,
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
) {
  try {
    await repo.insertAuditLog({
      organizationId: staff.membership.organization_id,
      actorUserId: staff.user.id,
      action,
      entityType,
      entityId,
      before,
      after,
    });
  } catch (error) {
    // Audit failures must not roll back the settings change, but must be visible.
    console.error("settings-audit-write-failed", error);
  }
}

export async function getSettingsContext(permission: import("@clinic/permissions").Permission = Permissions.SETTINGS_MANAGE) {
  const staff = await requirePermission(permission);
  return loadContext(staff.membership.organization_id);
}

export async function getAuditContext() {
  const staff = await requirePermission(Permissions.AUDIT_READ);
  const [logs, organization] = await Promise.all([
    repo.listAuditLogs(staff.membership.organization_id, 100),
    repo.findOrganizationProfile(staff.membership.organization_id),
  ]);
  return { logs, organizationName: organization?.name ?? "Organization" };
}

export async function updateGeneralSettings(patch: Pick<OrganizationSettingsPatch,
  "default_date_format" | "default_time_format" | "default_locale">) {
  const staff = await requirePermission(Permissions.SETTINGS_MANAGE);
  const before = await repo.findOrganizationSettings(staff.membership.organization_id);
  const after = await repo.upsertOrganizationSettings(staff.membership.organization_id, patch, staff.user.id);
  await audit(staff, "settings.general.update", "organization_settings", staff.membership.organization_id,
    before ? { default_date_format: before.default_date_format, default_time_format: before.default_time_format, default_locale: before.default_locale } : null,
    { default_date_format: after.default_date_format, default_time_format: after.default_time_format, default_locale: after.default_locale });
  return after;
}

export async function updateAppointmentSettings(patch: Pick<OrganizationSettingsPatch,
  "online_booking_enabled" | "booking_min_advance_minutes" | "booking_max_advance_days" |
  "patient_cancellation_enabled" | "cancellation_cutoff_hours">) {
  const staff = await requirePermission(Permissions.SETTINGS_MANAGE);
  const before = await repo.findOrganizationSettings(staff.membership.organization_id);
  const after = await repo.upsertOrganizationSettings(staff.membership.organization_id, patch, staff.user.id);
  await audit(staff, "settings.appointments.update", "organization_settings", staff.membership.organization_id,
    before ? {
      online_booking_enabled: before.online_booking_enabled,
      booking_min_advance_minutes: before.booking_min_advance_minutes,
      booking_max_advance_days: before.booking_max_advance_days,
      patient_cancellation_enabled: before.patient_cancellation_enabled,
      cancellation_cutoff_hours: before.cancellation_cutoff_hours,
    } : null,
    {
      online_booking_enabled: after.online_booking_enabled,
      booking_min_advance_minutes: after.booking_min_advance_minutes,
      booking_max_advance_days: after.booking_max_advance_days,
      patient_cancellation_enabled: after.patient_cancellation_enabled,
      cancellation_cutoff_hours: after.cancellation_cutoff_hours,
    });
  return after;
}

export async function updateNotificationSettings(patch: Pick<OrganizationSettingsPatch,
  "in_app_notifications_enabled" | "email_notifications_enabled" |
  "appointment_reminders_enabled" | "reminder_hours_before">) {
  const staff = await requirePermission(Permissions.SETTINGS_MANAGE);
  const before = await repo.findOrganizationSettings(staff.membership.organization_id);
  const after = await repo.upsertOrganizationSettings(staff.membership.organization_id, patch, staff.user.id);
  await audit(staff, "settings.notifications.update", "organization_settings", staff.membership.organization_id,
    before ? {
      in_app_notifications_enabled: before.in_app_notifications_enabled,
      email_notifications_enabled: before.email_notifications_enabled,
      appointment_reminders_enabled: before.appointment_reminders_enabled,
      reminder_hours_before: before.reminder_hours_before,
    } : null,
    {
      in_app_notifications_enabled: after.in_app_notifications_enabled,
      email_notifications_enabled: after.email_notifications_enabled,
      appointment_reminders_enabled: after.appointment_reminders_enabled,
      reminder_hours_before: after.reminder_hours_before,
    });
  return after;
}

export async function updateBrandingSettings(patch: Pick<OrganizationSettingsPatch, "brand_color"> & { logoPath?: string | null }) {
  const staff = await requirePermission(Permissions.SETTINGS_MANAGE);
  const orgId = staff.membership.organization_id;
  const beforeSettings = await repo.findOrganizationSettings(orgId);
  const beforeOrg = await repo.findOrganizationProfile(orgId);
  const after = await repo.upsertOrganizationSettings(orgId, { brand_color: patch.brand_color }, staff.user.id);
  let organization = beforeOrg;
  if (patch.logoPath !== undefined) {
    organization = await repo.updateOrganizationProfile(orgId, { logo_path: patch.logoPath });
  }
  await audit(staff, "settings.branding.update", "organization_settings", orgId,
    beforeSettings ? { brand_color: beforeSettings.brand_color } : null,
    { brand_color: after.brand_color, logo_path: organization?.logo_path ?? null });
  return { settings: after, organization };
}

export async function updateOrganizationProfile(patch: OrganizationProfilePatch) {
  const staff = await requirePermission(Permissions.ORGANIZATION_MANAGE);
  const orgId = staff.membership.organization_id;
  const before = await repo.findOrganizationProfile(orgId);
  if (!before) throw new NotFoundError("Organization not found");
  const after = await repo.updateOrganizationProfile(orgId, patch);
  const safeKeys = Object.keys(patch);
  const beforeData = Object.fromEntries(safeKeys.map((key) => [key, before[key as keyof typeof before]]));
  const afterData = Object.fromEntries(safeKeys.map((key) => [key, after[key as keyof typeof after]]));
  await audit(staff, "settings.organization.update", "organization", orgId, beforeData, afterData);
  return after;
}

export async function saveOrganizationLogo(input: { file: File | null; remove: boolean }) {
  const staff = await requirePermission(Permissions.SETTINGS_MANAGE);
  const orgId = staff.membership.organization_id;
  const before = await repo.findOrganizationProfile(orgId);
  if (!before) throw new NotFoundError("Organization not found");

  const supabase = await createClient();
  let logoPath = before.logo_path ?? null;

  if (input.remove) {
    if (logoPath) {
      const objectPath = logoPath.split("/").slice(-2).join("/");
      await supabase.storage.from("organization-logos").remove([objectPath]);
    }
    logoPath = null;
  } else if (input.file) {
    const allowed = new Set(["image/jpeg", "image/png", "image/webp", "image/svg+xml"]);
    if (!allowed.has(input.file.type)) throw new ValidationError("Logo must be a JPG, PNG, WebP or SVG image.");
    if (input.file.size > 2 * 1024 * 1024) throw new ValidationError("Logo must be smaller than 2 MB.");
    const extension = input.file.type === "image/png" ? "png" : input.file.type === "image/webp" ? "webp" : input.file.type === "image/svg+xml" ? "svg" : "jpg";
    const objectPath = `${orgId}/logo-${crypto.randomUUID()}.${extension}`;
    const upload = await supabase.storage.from("organization-logos").upload(objectPath, input.file, {
      cacheControl: "3600", contentType: input.file.type, upsert: false,
    });
    if (upload.error) throw upload.error;
    if (before.logo_path) {
      const oldPath = before.logo_path.split("/").slice(-2).join("/");
      await supabase.storage.from("organization-logos").remove([oldPath]).catch(() => undefined);
    }
    logoPath = objectPath;
  }

  const organization = await repo.updateOrganizationProfileAdmin(orgId, { logo_path: logoPath });
  await audit(staff, "settings.branding.logo", "organization", orgId,
    { logo_path: before.logo_path ?? null }, { logo_path: logoPath });
  return { organization, logoUrl: logoPath ? supabase.storage.from("organization-logos").getPublicUrl(logoPath).data.publicUrl : null };
}

/** Public-safe organization profile for the marketing site. Returns null when unconfigured. */
async function fetchPublicOrganizationProfile() {
  let organizationId: string;
  try { organizationId = clinicOrganizationId(); } catch { return null; }
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("id,name,legal_name,email,phone,website,description,address_line,city,district,country_code,timezone,currency_code,logo_path,emergency_phone,status,is_public")
    .eq("id", organizationId)
    .eq("is_public", true)
    .eq("status", "active")
    .maybeSingle();
  if (error || !data) return null;
  const logoUrl = data.logo_path
    ? supabase.storage.from("organization-logos").getPublicUrl(data.logo_path).data.publicUrl
    : null;
  return { ...data, logo_url: logoUrl };
}


export async function listSettingsFacilities() {
  const staff = await requirePermission(Permissions.SETTINGS_MANAGE);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("facilities")
    .select("id,name,code,facility_type,city,timezone,is_active,is_public,phone,email")
    .eq("organization_id", staff.membership.organization_id)
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function listSettingsStaff() {
  const staff = await requirePermission(Permissions.STAFF_MANAGE);
  return listStaffDirectory(staff.membership.organization_id);
}

export async function listSettingsRoles() {
  const staff = await requirePermission(Permissions.SETTINGS_MANAGE);
  const supabase = await createClient();
  const [rolesResult, grantsResult, permissionsResult] = await Promise.all([
    supabase.from("roles").select("id,name,role_key,description,is_system,organization_id").or(`organization_id.eq.${staff.membership.organization_id},organization_id.is.null`).order("name"),
    supabase.from("role_permissions").select("role_id,permission_key"),
    supabase.from("permissions").select("permission_key,description"),
  ]);
  if (rolesResult.error) throw rolesResult.error;
  if (grantsResult.error) throw grantsResult.error;
  if (permissionsResult.error) throw permissionsResult.error;
  const grantsByRole = new Map<string, string[]>();
  for (const grant of grantsResult.data ?? []) {
    const list = grantsByRole.get(grant.role_id) ?? [];
    list.push(grant.permission_key);
    grantsByRole.set(grant.role_id, list);
  }
  const descriptions = new Map((permissionsResult.data ?? []).map((row) => [row.permission_key, row.description]));
  return (rolesResult.data ?? []).map((role) => ({
    ...role,
    permissions: (grantsByRole.get(role.id) ?? []).sort().map((key) => ({ key, description: descriptions.get(key) ?? null })),
  }));
}

export async function updateLocalizationSettings(patch: { timezone: string; currency_code: string }) {
  const staff = await requirePermission(Permissions.ORGANIZATION_MANAGE);
  const orgId = staff.membership.organization_id;
  const before = await repo.findOrganizationProfile(orgId);
  if (!before) throw new NotFoundError("Organization not found");
  const after = await repo.updateOrganizationProfile(orgId, patch);
  await audit(staff, "settings.localization.update", "organization", orgId,
    { timezone: before.timezone, currency_code: before.currency_code },
    { timezone: after.timezone, currency_code: after.currency_code });
  return after;
}


export async function listSettingsPermissions() {
  await requirePermission(Permissions.SETTINGS_MANAGE);
  return repo.listAllPermissions();
}

function roleKeyFromName(name: string) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40) || "role";
  return `custom_${slug}_${crypto.randomUUID().slice(0, 8)}`;
}

async function requireOrgRole(roleId: string, organizationId: string) {
  const role = await repo.findRoleForOrganization(roleId, organizationId);
  if (!role || role.is_system) throw new NotFoundError("Role not found");
  return role;
}

export async function createCustomRole(input: { name: string; description?: string | null; permissionKeys: string[] }) {
  const staff = await requirePermission(Permissions.SETTINGS_MANAGE);
  const orgId = staff.membership.organization_id;
  const name = input.name.trim();
  if (name.length < 2 || name.length > 80) throw new ValidationError("Role name must be between 2 and 80 characters.");
  const validKeys = new Set((await repo.listAllPermissions()).map((row) => row.permission_key));
  const permissionKeys = [...new Set(input.permissionKeys)].filter((key) => validKeys.has(key));
  const role = await repo.createOrgRole({
    organizationId: orgId,
    roleKey: roleKeyFromName(name),
    name,
    description: input.description?.trim() || null,
  });
  await repo.replaceRolePermissions(role.id, permissionKeys);
  await audit(staff, "settings.roles.create", "role", role.id, null, { name, role_key: role.role_key, permissions: permissionKeys });
  return role;
}

export async function updateCustomRole(roleId: string, input: { name?: string; description?: string | null; permissionKeys?: string[] }) {
  const staff = await requirePermission(Permissions.SETTINGS_MANAGE);
  const orgId = staff.membership.organization_id;
  const role = await requireOrgRole(roleId, orgId);
  const patch: { name?: string; description?: string | null } = {};
  if (input.name !== undefined) {
    const name = input.name.trim();
    if (name.length < 2 || name.length > 80) throw new ValidationError("Role name must be between 2 and 80 characters.");
    patch.name = name;
  }
  if (input.description !== undefined) patch.description = input.description?.trim() || null;
  const beforePermissions = await repo.listRolePermissionKeys(roleId);
  let afterPermissions = beforePermissions;
  if (input.permissionKeys !== undefined) {
    const validKeys = new Set((await repo.listAllPermissions()).map((row) => row.permission_key));
    afterPermissions = [...new Set(input.permissionKeys)].filter((key) => validKeys.has(key)).sort();
    await repo.replaceRolePermissions(roleId, afterPermissions);
  }
  const updated = Object.keys(patch).length ? await repo.updateOrgRole(roleId, patch) : role;
  await audit(staff, "settings.roles.update", "role", roleId,
    { name: role.name, description: role.description, permissions: beforePermissions },
    { name: updated.name, description: updated.description, permissions: afterPermissions });
  return updated;
}

export const getPublicOrganizationProfile = cache(fetchPublicOrganizationProfile);
