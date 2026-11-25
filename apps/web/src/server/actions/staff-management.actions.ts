"use server";

import crypto from "node:crypto";
import { z } from "zod";
import { Permissions } from "@clinic/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { AuthorizationError, safeServerMessage } from "@/server/errors";
import { requirePermission } from "@/server/permissions/require-permission";
import { createStaffProvisioning, deleteProvisionedAuthUser } from "@/server/repositories/staff-management.repository";
import { insertAuditLog } from "@/server/repositories/settings.repository";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { facilityLocalDateTimeToInstant } from "@/lib/facility-time";
import {
  doctorPhotoObjectPath,
  missingOnlineBookingRequirements,
  opaqueDoctorPhotoObjectPath,
  validateDoctorPhoto,
} from "@/features/staff/utils/clinician-profile";

const schema = z.object({ full_name: z.string().trim().min(2), email: z.string().email(), role_id: z.string().uuid(), facility_id: z.string().uuid().or(z.literal("")), job_title: z.string().trim().max(120).optional(), employee_number: z.string().trim().max(80).optional(), registration_number: z.string().trim().max(80).optional() });
function temporaryPassword() { return `${crypto.randomBytes(12).toString("base64url")}aA1!`; }
function clinicianSlug(value: string) { return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80); }

export async function createStaffAccountAction(_previous: unknown, formData: FormData) {
  const staff = await requirePermission(Permissions.STAFF_MANAGE);
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Complete the required staff account fields." };
  const input = parsed.data;
  const supabase = createAdminClient();
  const { data: role, error: roleError } = await supabase.from("roles").select("id,organization_id,role_key").eq("id", input.role_id).or(`organization_id.eq.${staff.membership.organization_id},organization_id.is.null`).maybeSingle();
  if (roleError) return { error: "We couldn't verify the selected role." };
  if (!role) return { error: "That role is not available for this organization." };
  const password = temporaryPassword();
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({ email: input.email, password, email_confirm: true });
  if (authError || !authData.user) return { error: "We couldn't create the staff account. Check that the email is not already in use." };
  try {
    const createdMembership = await createStaffProvisioning({ userId: authData.user.id, organizationId: staff.membership.organization_id, roleId: role.id, jobTitle: input.job_title || null, employeeNumber: input.employee_number || null, registrationNumber: input.registration_number || null, facilityId: input.facility_id || null, fullName: input.full_name, mustChangePassword: true });
    if (!createdMembership?.id) throw new Error("Staff membership was not created.");
    return { success: true, membershipId: createdMembership.id, userId: authData.user.id, email: input.email, temporaryPassword: password, roleKey: role.role_key };
  } catch (error) {
    try { await deleteProvisionedAuthUser(authData.user.id); } catch { /* controlled compensation attempt */ }
    return { error: safeServerMessage(error, "We couldn't finish provisioning this staff account. No account was left active.") };
  }
}

export async function resetStaffPasswordAction(membershipId: string) {
  try {
    const actor = await requirePermission(Permissions.STAFF_MANAGE);
    const supabase = await createClient();
    const { data: member, error: memberError } = await supabase
      .from("staff_memberships")
      .select("id,user_id,is_active,organization_id,profiles!staff_memberships_user_id_fkey(full_name)")
      .eq("id", membershipId)
      .eq("organization_id", actor.membership.organization_id)
      .maybeSingle();
    if (memberError || !member) return { error: "Staff member not found." };
    if (!member.is_active) return { error: "Reactivate this account before resetting its password." };
    const password = temporaryPassword();
    const admin = createAdminClient();
    const { error: updateError } = await admin.auth.admin.updateUserById(member.user_id, { password });
    if (updateError) return { error: "We couldn't reset the password. Try again." };
    const { error: flagError } = await admin
      .from("staff_memberships")
      .update({ must_change_password: true })
      .eq("id", member.id)
      .eq("organization_id", actor.membership.organization_id);
    if (flagError) return { error: "Password was reset but the change-password flag could not be set." };
    const profile = member.profiles as { full_name?: string } | null;
    await insertAuditLog({
      organizationId: actor.membership.organization_id,
      actorUserId: actor.user.id,
      action: "staff.password.reset",
      entityType: "staff_membership",
      entityId: member.id,
      before: null,
      after: { member_name: profile?.full_name ?? null, must_change_password: true },
    }).catch(() => undefined);
    return { success: true, temporaryPassword: password };
  } catch (error) {
    return { error: safeServerMessage(error, "We couldn't reset the password.") };
  }
}

export async function assertStaffManageAccess() { const staff = await requirePermission(Permissions.STAFF_MANAGE); if (!staff.membership.organization_id) throw new AuthorizationError(); return staff; }

const updateSchema = z.object({ membership_id: z.string().uuid(), role_id: z.string().uuid(), facility_id: z.string().uuid().or(z.literal("")), job_title: z.string().trim().max(120), employee_number: z.string().trim().max(80), registration_number: z.string().trim().max(80), is_active: z.enum(["true", "false"]) });

export async function updateStaffMemberAction(_previous: unknown, formData: FormData) {
  try {
    const actor = await requirePermission(Permissions.STAFF_MANAGE);
    const parsed = updateSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) return { error: "Check the staff details and try again." };
    const input = parsed.data;
    const supabase = await createClient();
    const { data: member, error: memberError } = await supabase.from("staff_memberships").select("id,user_id,role_id,is_active,organization_id,roles(role_key)").eq("id", input.membership_id).eq("organization_id", actor.membership.organization_id).maybeSingle();
    if (memberError || !member) return { error: "Staff member not found." };
    const currentRole = (member.roles as { role_key?: string } | null)?.role_key;
    const { data: nextRole, error: roleError } = await supabase.from("roles").select("id,role_key").eq("id", input.role_id).or(`organization_id.eq.${actor.membership.organization_id},organization_id.is.null`).maybeSingle();
    if (roleError || !nextRole) return { error: "That role is not available." };
    const isActive = input.is_active === "true";
    const removingAdmin = currentRole === "organization_admin" && (nextRole.role_key !== "organization_admin" || !isActive);
    if (removingAdmin) {
      const { count } = await supabase.from("staff_memberships").select("id", { count: "exact", head: true }).eq("organization_id", actor.membership.organization_id).eq("is_active", true).eq("role_id", member.role_id);
      if ((count ?? 0) <= 1) return { error: "The last active organization administrator cannot be removed." };
    }
    if (!isActive && member.user_id === actor.user.id) return { error: "You cannot suspend your own staff account." };
    const { error } = await supabase.from("staff_memberships").update({ role_id: nextRole.id, primary_facility_id: input.facility_id || null, job_title: input.job_title || null, employee_number: input.employee_number || null, registration_number: input.registration_number || null, is_active: isActive }).eq("id", member.id).eq("organization_id", actor.membership.organization_id);
    if (error) return { error: "We couldn't update this staff member." };
    revalidatePath(`/staff/users/${member.id}`); revalidatePath("/staff/users");
    return { success: true };
  } catch (error) { return { error: safeServerMessage(error, "We couldn't update this staff member.") }; }
}

export async function saveClinicianProfileAction(_previous: unknown, formData: FormData) {
  try {
    const actor = await requirePermission(Permissions.STAFF_MANAGE);
    const supabase = await createClient();
    const membershipId = String(formData.get("membership_id") || "");
    const { data: member, error: memberError } = await supabase.from("staff_memberships").select("id,user_id,organization_id,roles(role_key)").eq("id", membershipId).eq("organization_id", actor.membership.organization_id).maybeSingle();
    if (memberError) return { error: "We couldn't verify the Doctor account." };
    if (!member || (member.roles as { role_key?: string } | null)?.role_key !== "doctor") return { error: "Only doctor accounts have a public clinician profile." };
    const displayName = String(formData.get("display_name") || "").trim();
    const professionalTitle = String(formData.get("professional_title") || "").trim();
    if (!displayName || !professionalTitle) return { error: "Add a display name and professional title before saving this profile." };
    const { data: departmentRows, error: departmentError } = await supabase.from("staff_department_assignments").select("membership_id").eq("membership_id", member.id).limit(1);
    if (departmentError) return { error: "We couldn't verify the Doctor's department assignment." };
    const parseJson = <T,>(key: string, fallback: T): T => { try { return JSON.parse(String(formData.get(key) || JSON.stringify(fallback))) as T; } catch { return fallback; } };
    const yearsRaw = String(formData.get("years_experience") || "").trim();
    const years = yearsRaw === "" ? null : Number(yearsRaw);
    if (years !== null && (!Number.isInteger(years) || years < 0 || years > 100)) return { error: "Years of experience must be a whole number from 0 to 100." };
    const languages = [...new Map<string, string>((parseJson<string[]>("languages_json", []) || []).map((value): [string, string] => [value.trim().toLocaleLowerCase(), value.trim()]).filter(([key, value]) => Boolean(key && value)).slice(0, 12)).values()];
    const specializations = parseJson<Array<{ name: string; description?: string }>>("specializations_json", []).map((item) => ({ name: String(item.name || "").trim(), description: String(item.description || "").trim() || null })).filter((item) => item.name).slice(0, 20);
    const qualifications = parseJson<Array<{ qualification_type: string; qualification: string; institution: string; country?: string; year?: number | null }>>("qualifications_json", []).map((item) => ({ qualification_type: item.qualification_type, qualification: String(item.qualification || "").trim(), institution: String(item.institution || "").trim(), country: String(item.country || "").trim() || null, year: item.year ? Number(item.year) : null })).filter((item) => item.qualification && item.institution).slice(0, 20);
    const achievements = parseJson<Array<{ title: string; description?: string; year?: number | null }>>("achievements_json", []).map((item) => ({ title: String(item.title || "").trim(), description: String(item.description || "").trim() || null, year: item.year ? Number(item.year) : null })).filter((item) => item.title).slice(0, 20);
    const { data: existingProfile, error: existingProfileError } = await supabase.from("clinician_profiles").select("slug,photo_path,is_public,accepting_appointments").eq("membership_id", member.id).maybeSingle();
    if (existingProfileError) return { error: "We couldn't load the existing clinician profile." };
    if (existingProfile?.is_public && !departmentRows?.length) return { error: "Assign at least one department before saving a published profile." };

    const photo = formData.get("doctor_photo");
    const photoFile = photo instanceof File && photo.size > 0 ? photo : null;
    if (photoFile) {
      const validationError = validateDoctorPhoto(photoFile);
      if (validationError) return { error: validationError };
    }
    const removePhoto = formData.get("remove_photo") === "on";
    let nextPhotoPath = removePhoto ? null : existingProfile?.photo_path ?? null;
    let uploadedObjectPath: string | null = null;
    if (photoFile) {
      const extension = photoFile.type === "image/png" ? "png" : photoFile.type === "image/webp" ? "webp" : "jpg";
      uploadedObjectPath = opaqueDoctorPhotoObjectPath(extension, crypto.randomUUID());
      const tracked = await supabase.from("clinician_photo_objects").insert({
        object_path: uploadedObjectPath,
        organization_id: actor.membership.organization_id,
        membership_id: member.id,
      });
      if (tracked.error) return { error: "We couldn't prepare secure Doctor photo storage." };
      const upload = await supabase.storage.from("clinician-photos").upload(uploadedObjectPath, photoFile, { cacheControl: "3600", contentType: photoFile.type, upsert: false });
      if (upload.error) {
        const trackerCleanup = await supabase.from("clinician_photo_objects").delete().eq("object_path", uploadedObjectPath);
        if (trackerCleanup.error) console.error("Doctor photo tracker cleanup failed after upload failure.");
        return { error: "We couldn't upload the Doctor photo. Please try again." };
      }
      nextPhotoPath = uploadedObjectPath;
    }
    try {
      const { error } = await supabase.rpc("replace_clinician_profile", {
        p_membership_id: member.id,
        p_slug: existingProfile?.slug || clinicianSlug(displayName),
        p_display_name: displayName,
        p_professional_title: professionalTitle,
        p_public_bio: String(formData.get("public_bio") || "").trim(),
        p_photo_path: (nextPhotoPath || null) as unknown as string,
        p_years_experience: years ?? 0,
        p_experience_summary: String(formData.get("experience_summary") || "").trim(),
        p_languages: languages,
        p_specializations: specializations,
        p_qualifications: qualifications,
        p_achievements: achievements,
      });
      if (error) throw error;
    } catch (error) {
      if (uploadedObjectPath) {
        const objectCleanup = await supabase.storage.from("clinician-photos").remove([uploadedObjectPath]);
        if (objectCleanup.error) console.error("Doctor photo object cleanup failed after profile save failure.");
        if (!objectCleanup.error) {
          const trackerCleanup = await supabase.from("clinician_photo_objects").delete().eq("object_path", uploadedObjectPath);
          if (trackerCleanup.error) console.error("Doctor photo tracker cleanup failed after profile save failure.");
        }
      }
      throw error;
    }
    const oldObjectPath = doctorPhotoObjectPath(existingProfile?.photo_path);
    let cleanupWarning: string | undefined;
    if (oldObjectPath && oldObjectPath !== uploadedObjectPath && (photoFile || removePhoto)) {
      const objectCleanup = await supabase.storage.from("clinician-photos").remove([oldObjectPath]);
      if (objectCleanup.error) {
        console.error("Old Doctor photo cleanup failed after replacement.");
        cleanupWarning = "Profile saved, but the previous photo could not be removed. An administrator should review Storage cleanup.";
      } else {
        const trackerCleanup = await supabase.from("clinician_photo_objects").delete().eq("object_path", oldObjectPath);
        if (trackerCleanup.error) {
          console.error("Old Doctor photo tracker cleanup failed after replacement.");
          cleanupWarning = "Profile saved, but the previous photo ownership record needs cleanup.";
        }
      }
    }
revalidatePath(`/staff/users/${membershipId}`); revalidatePath("/doctors"); revalidatePath("/doctors/[slug]", "page"); revalidatePath("/"); revalidatePath("/departments"); revalidatePath("/departments/[id]", "page"); revalidatePath("/services"); revalidatePath("/facilities"); revalidatePath("/appointments"); revalidatePath("/portal/appointments/new");
    const publicPhotoPath = nextPhotoPath
      ? supabase.storage.from("clinician-photos").getPublicUrl(nextPhotoPath).data.publicUrl
      : null;
    return { success: true, photoPath: publicPhotoPath, warning: cleanupWarning };
  } catch (error) { return { error: safeServerMessage(error, "We couldn't save the clinician profile.") }; }
}

export async function saveClinicianPublishingAction(_previous: unknown, formData: FormData) {
  try {
    const actor = await requirePermission(Permissions.STAFF_MANAGE);
    const supabase = await createClient();
    const membershipId = String(formData.get("membership_id") || "");
    const isPublic = formData.get("is_public") === "on";
    const acceptingAppointments = formData.get("accepting_appointments") === "on";
    const { data: member, error: memberError } = await supabase.from("staff_memberships").select("id,is_active,organization_id,roles(role_key)").eq("id", membershipId).eq("organization_id", actor.membership.organization_id).maybeSingle();
    if (memberError) return { error: "We couldn't verify the Doctor account." };
    if (!member || (member.roles as { role_key?: string } | null)?.role_key !== "doctor") return { error: "Only Doctor accounts can be published." };

    const [profileResult, departmentResult, serviceResult, availabilityResult] = await Promise.all([
      supabase.from("clinician_profiles").select("membership_id,display_name,professional_title").eq("membership_id", member.id).maybeSingle(),
      supabase.from("staff_department_assignments").select("membership_id").eq("membership_id", member.id).limit(1),
      supabase.from("staff_service_assignments").select("service_id,is_active,services(is_active,is_public)").eq("membership_id", member.id).eq("is_active", true),
      supabase.from("clinician_availability_rules").select("membership_id").eq("membership_id", member.id).eq("organization_id", actor.membership.organization_id).eq("is_active", true).limit(1),
    ]);
    if (profileResult.error || departmentResult.error || serviceResult.error || availabilityResult.error) return { error: "We couldn't verify the Doctor's publishing requirements." };
    const hasPublicProfile = Boolean(profileResult.data?.display_name?.trim() && profileResult.data.professional_title?.trim());
    const hasBookableService = (serviceResult.data ?? []).some((assignment) => {
      const service = assignment.services as { is_active?: boolean; is_public?: boolean } | null;
      return assignment.is_active && service?.is_active && service.is_public;
    });
    const readiness = {
      isActiveDoctor: member.is_active,
      hasPublicProfile,
      hasDepartment: Boolean(departmentResult.data?.length),
      hasBookableService,
      hasAvailability: Boolean(availabilityResult.data?.length),
    };
    if (isPublic) {
      const publishingMissing = missingOnlineBookingRequirements(readiness).filter((item) => ["Active Doctor account", "Public profile", "Department assignment"].includes(item));
      if (publishingMissing.length) return { error: "Doctor profile cannot be published yet.", missingRequirements: publishingMissing };
    }
    if (acceptingAppointments && !isPublic) return { error: "Show the Doctor on the website before enabling online booking.", missingRequirements: ["Published public profile"] };
    if (acceptingAppointments) {
      const missingRequirements = missingOnlineBookingRequirements(readiness);
      if (missingRequirements.length) return { error: "Online booking cannot be enabled yet.", missingRequirements };
    }
    const saved = await supabase.from("clinician_profiles").update({ is_public: isPublic, accepting_appointments: acceptingAppointments }).eq("membership_id", member.id).select("membership_id,is_public,accepting_appointments").single();
    if (saved.error || !saved.data) return { error: "We couldn't persist the publishing settings." };
revalidatePath(`/staff/users/${membershipId}`); revalidatePath("/doctors"); revalidatePath("/doctors/[slug]", "page"); revalidatePath("/"); revalidatePath("/departments"); revalidatePath("/departments/[id]", "page"); revalidatePath("/services"); revalidatePath("/facilities"); revalidatePath("/appointments"); revalidatePath("/portal/appointments/new");
    return { success: true, isPublic: saved.data.is_public, acceptingAppointments: saved.data.accepting_appointments };
  } catch (error) {
    return { error: safeServerMessage(error, "We couldn't update publishing.") };
  }
}

export async function saveAvailabilityAction(_previous: unknown, formData: FormData) {
  try {
    const actor = await requirePermission(Permissions.STAFF_MANAGE);
    const membershipId = String(formData.get("membership_id") || "");
    const facilityId = String(formData.get("facility_id") || "");
    const raw = JSON.parse(String(formData.get("periods_json") || "[]")) as Array<{ dayOfWeek: number; startTime: string; endTime: string; effectiveFrom?: string | null; effectiveTo?: string | null }>;
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data: member } = await supabase.from("staff_memberships").select("id,organization_id,roles(role_key)").eq("id", membershipId).eq("organization_id", actor.membership.organization_id).maybeSingle();
    if (!member || (member.roles as { role_key?: string } | null)?.role_key !== "doctor") return { error: "Only doctor accounts have availability." };
    const { data: facility } = await supabase.from("facilities").select("id").eq("id", facilityId).eq("organization_id", actor.membership.organization_id).maybeSingle();
    if (!facility) return { error: "Choose a facility in this organization." };
    const { validateAvailabilityIntervals } = await import("@/server/services/scheduling.service");
    if (!validateAvailabilityIntervals(raw)) return { error: "Check the weekly periods: times must be valid and cannot overlap." };
    const { data: memberUser } = await supabase.from("staff_memberships").select("user_id").eq("id", membershipId).eq("organization_id", actor.membership.organization_id).single();
    const { data: futureAppointments } = memberUser ? await supabase.from("appointments").select("scheduled_start,scheduled_end").eq("organization_id", actor.membership.organization_id).eq("facility_id", facilityId).eq("clinician_user_id", memberUser.user_id).in("status", ["requested", "scheduled", "confirmed", "checked_in", "in_progress"]).gte("scheduled_start", new Date().toISOString()) : { data: [] };
    const { data: insertedCount, error: replacementError } = await supabase.rpc("replace_clinician_availability", {
      p_membership_id: membershipId,
      p_facility_id: facilityId,
      p_periods: raw.map((period) => ({
        day_of_week: period.dayOfWeek,
        start_time: period.startTime,
        end_time: period.endTime,
        effective_from: period.effectiveFrom || null,
        effective_to: period.effectiveTo || null,
      })),
    });
    if (replacementError || insertedCount !== raw.length) return { error: "We couldn't verify the saved schedule. Please try again." };
revalidatePath(`/staff/users/${membershipId}`); revalidatePath("/doctors"); revalidatePath("/doctors/[slug]", "page"); revalidatePath("/"); revalidatePath("/departments"); revalidatePath("/departments/[id]", "page"); revalidatePath("/services"); revalidatePath("/facilities"); revalidatePath("/appointments"); revalidatePath("/portal/appointments/new");
    return { success: true, warning: futureAppointments?.length ? `${futureAppointments.length} existing appointment${futureAppointments.length === 1 ? " remains" : "s remain"} unchanged. Review them if this schedule change affects their time.` : undefined };
  } catch { return { error: "We couldn't update the schedule. Check the entered periods." }; }
}

export async function saveClinicianAssignmentsAction(_previous: unknown, formData: FormData) {
  try {
    const actor = await requirePermission(Permissions.STAFF_MANAGE);
    const membershipId = String(formData.get("membership_id") || "");
    const departmentIds = JSON.parse(String(formData.get("department_ids") || "[]")) as string[];
    const serviceIds = JSON.parse(String(formData.get("service_ids") || "[]")) as string[];
    const supabase = await createClient();
    const { data: member } = await supabase.from("staff_memberships").select("id,organization_id,roles(role_key)").eq("id", membershipId).eq("organization_id", actor.membership.organization_id).maybeSingle();
    if (!member || (member.roles as { role_key?: string } | null)?.role_key !== "doctor") return { error: "Only doctor accounts have clinical assignments." };
    const { data: departments } = await supabase.from("departments").select("id").in("id", departmentIds).eq("organization_id", actor.membership.organization_id);
    const { data: services } = await supabase.from("services").select("id,department_id").in("id", serviceIds).eq("organization_id", actor.membership.organization_id);
    if ((departments ?? []).length !== departmentIds.length || (services ?? []).length !== serviceIds.length || (services ?? []).some((service) => service.department_id && !departmentIds.includes(service.department_id))) return { error: "Choose departments and services from this organization." };
    const { data: replacement, error: replacementError } = await supabase.rpc("replace_clinician_assignments", {
      p_membership_id: membershipId,
      p_department_ids: departmentIds,
      p_service_ids: serviceIds,
    });
    const counts = replacement as { departments?: number; services?: number } | null;
    if (
      replacementError
      || counts?.departments !== departmentIds.length
      || counts?.services !== serviceIds.length
    ) return { error: "We couldn't save clinical assignments." };
revalidatePath(`/staff/users/${membershipId}`); revalidatePath("/doctors"); revalidatePath("/doctors/[slug]", "page"); revalidatePath("/"); revalidatePath("/departments"); revalidatePath("/departments/[id]", "page"); revalidatePath("/services"); revalidatePath("/facilities"); revalidatePath("/appointments"); revalidatePath("/portal/appointments/new");
    return { success: true };
  } catch (error) { return { error: safeServerMessage(error, "We couldn't save clinical assignments.") }; }
}

export async function saveExceptionAction(_previous: unknown, formData: FormData) {
  try {
    const actor = await requirePermission(Permissions.STAFF_MANAGE);
    const membershipId = String(formData.get("membership_id") || "");
    const id = String(formData.get("id") || "");
    const facilityId = String(formData.get("facility_id") || "");
    const startsAt = String(formData.get("starts_at") || "");
    const endsAt = String(formData.get("ends_at") || "");
    const type = String(formData.get("type") || "");
    if (!membershipId || !facilityId || !startsAt || !endsAt || !["unavailable", "available_override"].includes(type)) return { error: "Enter a valid exception period." };
    const supabase = await createClient();
    const { data: member } = await supabase.from("staff_memberships").select("id,organization_id,roles(role_key)").eq("id", membershipId).eq("organization_id", actor.membership.organization_id).maybeSingle();
    const { data: facility } = await supabase.from("facilities").select("id,timezone").eq("id", facilityId).eq("organization_id", actor.membership.organization_id).maybeSingle();
    if (!member || !facility || (member.roles as { role_key?: string } | null)?.role_key !== "doctor") return { error: "That clinician or facility is not available." };
    const starts = facilityLocalDateTimeToInstant(startsAt, facility.timezone);
    const ends = facilityLocalDateTimeToInstant(endsAt, facility.timezone);
    if (!starts || !ends || starts >= ends) return { error: "Enter a valid exception period in the facility's local time." };
    const { data: memberUser } = await supabase.from("staff_memberships").select("user_id").eq("id", membershipId).eq("organization_id", actor.membership.organization_id).single();
    const { data: futureAppointments } = memberUser ? await supabase.from("appointments").select("scheduled_start,scheduled_end").eq("organization_id", actor.membership.organization_id).eq("facility_id", facilityId).eq("clinician_user_id", memberUser.user_id).in("status", ["requested", "scheduled", "confirmed", "checked_in", "in_progress"]).gte("scheduled_start", new Date().toISOString()) : { data: [] };
    const conflicts = (futureAppointments ?? []).filter((appointment) => new Date(appointment.scheduled_start) < ends && new Date(appointment.scheduled_end ?? appointment.scheduled_start) > starts).length;
    const values = { membership_id: membershipId, organization_id: actor.membership.organization_id, facility_id: facilityId, starts_at: starts.toISOString(), ends_at: ends.toISOString(), type };
    const result = id ? await supabase.from("clinician_availability_exceptions").update(values).eq("id", id).eq("organization_id", actor.membership.organization_id) : await supabase.from("clinician_availability_exceptions").insert(values);
    if (result.error) return { error: "We couldn't save this schedule exception." };
revalidatePath(`/staff/users/${membershipId}`); revalidatePath("/doctors"); revalidatePath("/doctors/[slug]", "page"); revalidatePath("/"); revalidatePath("/departments"); revalidatePath("/departments/[id]", "page"); revalidatePath("/services"); revalidatePath("/facilities"); revalidatePath("/appointments"); revalidatePath("/portal/appointments/new");
    return { success: true, warning: conflicts ? `${conflicts} existing appointment${conflicts === 1 ? " is" : "s are"} inside this period. No appointment was changed.` : undefined };
  } catch (error) { return { error: safeServerMessage(error, "We couldn't save this schedule exception.") }; }
}

export async function deleteExceptionAction(_previous: unknown, formData: FormData) {
  try {
    const actor = await requirePermission(Permissions.STAFF_MANAGE);
    const id = String(formData.get("id") || "");
    if (!id) return { error: "Exception not found." };
    const supabase = await createClient();
    const { error } = await supabase.from("clinician_availability_exceptions").delete().eq("id", id).eq("organization_id", actor.membership.organization_id);
    if (error) return { error: "We couldn't delete this exception." };
revalidatePath(`/staff/users/${String(formData.get("membership_id") || "")}`); revalidatePath("/doctors"); revalidatePath("/doctors/[slug]", "page"); revalidatePath("/"); revalidatePath("/departments"); revalidatePath("/departments/[id]", "page"); revalidatePath("/services"); revalidatePath("/facilities"); revalidatePath("/appointments"); revalidatePath("/portal/appointments/new");
    return { success: true };
  } catch (error) { return { error: safeServerMessage(error, "We couldn't delete this exception.") }; }
}
