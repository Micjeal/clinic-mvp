"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { safeServerMessage } from "@/server/errors";
import { logServerError } from "@/server/logging";
import {
  saveOrganizationLogo,
  updateAppointmentSettings,
  updateBrandingSettings,
  updateGeneralSettings,
  updateLocalizationSettings,
  updateNotificationSettings,
  createCustomRole,
  updateCustomRole,
  updateOrganizationProfile,
} from "@/server/services/settings.service";

const optionalText = (max: number) => z.string().trim().max(max).optional().nullable().or(z.literal(""));
const boolField = z.string().optional().transform((value) => value === "true");
const optionalInt = (min: number, max: number) => z.preprocess(
  (value) => value === "" || value == null ? null : value,
  z.coerce.number().int().min(min).max(max).nullable().optional(),
);

const generalSchema = z.object({
  default_date_format: z.enum(["d mmm yyyy", "yyyy-mm-dd", "dd/mm/yyyy", "mm/dd/yyyy"]),
  default_time_format: z.enum(["12h", "24h"]),
  default_locale: z.string().trim().min(2).max(20),
});

const appointmentSchema = z.object({
  online_booking_enabled: boolField,
  booking_min_advance_minutes: z.coerce.number().int().min(0).max(10080),
  booking_max_advance_days: z.coerce.number().int().min(1).max(365),
  patient_cancellation_enabled: boolField,
  cancellation_cutoff_hours: z.coerce.number().int().min(0).max(168),
});

const notificationSchema = z.object({
  in_app_notifications_enabled: boolField,
  email_notifications_enabled: boolField,
  appointment_reminders_enabled: boolField,
  reminder_hours_before: z.coerce.number().int().min(1).max(168),
});

const localizationSchema = z.object({
  timezone: z.string().trim().min(3).max(60),
  currency_code: z.string().trim().length(3).toUpperCase(),
});

const brandingSchema = z.object({
  brand_color: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Use a hex colour like #0d9488"),
});

const organizationSchema = z.object({
  name: z.string().trim().min(2).max(120),
  legal_name: optionalText(160),
  email: z.string().trim().email().optional().nullable().or(z.literal("")),
  phone: optionalText(40),
  website: z.string().trim().url().optional().nullable().or(z.literal("")),
  timezone: z.string().trim().min(3).max(60).optional(),
  currency_code: z.string().trim().length(3).toUpperCase().optional(),
  description: optionalText(2000),
  address_line: optionalText(200),
  city: optionalText(100),
  district: optionalText(100),
  country_code: z.string().trim().length(2).toUpperCase(),
  emergency_phone: optionalText(40),
});

function revalidateSettings() {
  revalidatePath("/staff/settings");
  revalidatePath("/staff/settings/general");
  revalidatePath("/staff/settings/appointments");
  revalidatePath("/staff/settings/notifications");
  revalidatePath("/staff/settings/branding");
  revalidatePath("/staff/settings/organization");
  revalidatePath("/staff/settings/localization");
  revalidatePath("/staff/settings/facilities");
  revalidatePath("/staff/settings/users");
  revalidatePath("/staff/settings/roles");
}

export async function updateGeneralSettingsAction(_prev: unknown, formData: FormData) {
  try {
    const input = generalSchema.parse(Object.fromEntries(formData));
    await updateGeneralSettings(input);
    revalidateSettings();
    return { success: true };
  } catch (error) {
    logServerError("settings", "general-update-failed", error);
    return { error: safeServerMessage(error, "We couldn't save your preferences.") };
  }
}

export async function updateAppointmentSettingsAction(_prev: unknown, formData: FormData) {
  try {
    const input = appointmentSchema.parse(Object.fromEntries(formData));
    await updateAppointmentSettings(input);
    revalidateSettings();
    revalidatePath("/appointments");
    revalidatePath("/portal/appointments/new");
    return { success: true };
  } catch (error) {
    logServerError("settings", "appointments-update-failed", error);
    return { error: safeServerMessage(error, "We couldn't save the booking rules.") };
  }
}

export async function updateNotificationSettingsAction(_prev: unknown, formData: FormData) {
  try {
    const input = notificationSchema.parse(Object.fromEntries(formData));
    await updateNotificationSettings(input);
    revalidateSettings();
    return { success: true };
  } catch (error) {
    logServerError("settings", "notifications-update-failed", error);
    return { error: safeServerMessage(error, "We couldn't save the notification settings.") };
  }
}

export async function updateBrandingSettingsAction(_prev: unknown, formData: FormData) {
  try {
    const input = brandingSchema.parse({ brand_color: formData.get("brand_color") });
    await updateBrandingSettings({ brand_color: input.brand_color });
    revalidateSettings();
    revalidatePath("/staff", "layout");
    return { success: true };
  } catch (error) {
    logServerError("settings", "branding-update-failed", error);
    return { error: safeServerMessage(error, "We couldn't save the branding settings.") };
  }
}

export async function updateOrganizationProfileAction(_prev: unknown, formData: FormData) {
  try {
    const raw = Object.fromEntries(formData);
    const input = organizationSchema.parse(raw);
    await updateOrganizationProfile({
      name: input.name,
      legal_name: input.legal_name || null,
      email: input.email || null,
      phone: input.phone || null,
      website: input.website || null,
      description: input.description || null,
      address_line: input.address_line || null,
      city: input.city || null,
      district: input.district || null,
      country_code: input.country_code,
      emergency_phone: input.emergency_phone || null,
      ...(input.timezone ? { timezone: input.timezone } : {}),
      ...(input.currency_code ? { currency_code: input.currency_code } : {}),
    });
    revalidateSettings();
    revalidatePath("/contact");
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    logServerError("settings", "organization-update-failed", error);
    return { error: safeServerMessage(error, "We couldn't save the organization profile.") };
  }
}

export async function updateLocalizationSettingsAction(_prev: unknown, formData: FormData) {
  try {
    const input = localizationSchema.parse(Object.fromEntries(formData));
    await updateLocalizationSettings({ timezone: input.timezone, currency_code: input.currency_code });
    revalidateSettings();
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error) {
    logServerError("settings", "localization-update-failed", error);
    return { error: safeServerMessage(error, "We couldn't save the regional settings.") };
  }
}

const roleSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: optionalText(300),
});

const permissionListSchema = z.array(z.string().trim().min(3).max(80)).max(200);

export async function createRoleAction(_prev: unknown, formData: FormData) {
  try {
    const input = roleSchema.parse({ name: formData.get("name"), description: formData.get("description") });
    const permissionKeys = permissionListSchema.parse(formData.getAll("permissions").map(String));
    await createCustomRole({ name: input.name, description: input.description || null, permissionKeys });
    revalidateSettings();
    revalidatePath("/staff/settings/roles");
    revalidatePath("/staff/users");
    return { success: true };
  } catch (error) {
    logServerError("settings", "role-create-failed", error);
    return { error: safeServerMessage(error, "We couldn't create the role.") };
  }
}

export async function updateRolePermissionsAction(roleId: string, _prev: unknown, formData: FormData) {
  try {
    const name = formData.get("name");
    const description = formData.get("description");
    const permissionKeys = permissionListSchema.parse(formData.getAll("permissions").map(String));
    await updateCustomRole(roleId, {
      ...(typeof name === "string" && name.trim() ? { name } : {}),
      ...(typeof description === "string" ? { description } : {}),
      permissionKeys,
    });
    revalidateSettings();
    revalidatePath("/staff/settings/roles");
    revalidatePath("/staff/users");
    return { success: true };
  } catch (error) {
    logServerError("settings", "role-update-failed", error);
    return { error: safeServerMessage(error, "We couldn't update the role.") };
  }
}

export async function uploadOrganizationLogoAction(_prev: unknown, formData: FormData) {
  try {
    const file = formData.get("logo");
    const remove = formData.get("remove_logo") === "true";
    const result = await saveOrganizationLogo({
      file: file instanceof File && file.size > 0 ? file : null,
      remove,
    });
    revalidateSettings();
    revalidatePath("/", "layout");
    revalidatePath("/contact");
    return { success: true, logoUrl: result.logoUrl };
  } catch (error) {
    logServerError("settings", "logo-upload-failed", error);
    return { error: safeServerMessage(error, "We couldn't update the logo.") };
  }
}
