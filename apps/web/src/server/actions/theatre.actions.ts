"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Permissions } from "@clinic/permissions";
import { safeServerMessage, ValidationError } from "@/server/errors";
import { logServerError } from "@/server/logging";
import { requirePermission } from "@/server/permissions/require-permission";
import { hasRolePermission } from "@/server/repositories/staff.repository";
import * as repo from "@/server/repositories/theatre.repository";

async function ctx(permission: import("@clinic/permissions").Permission) {
  const staff = await requirePermission(permission);
  return { orgId: staff.membership.organization_id, userId: staff.user.id, staff };
}

export async function getTheatreData() {
  const { orgId, staff } = await ctx(Permissions.THEATRE_READ);
  const [sessions, surgeries] = await Promise.all([repo.listSessions(orgId), repo.listSurgeries(orgId)]);
  const canManage = await hasRolePermission(staff.membership.role_id, Permissions.THEATRE_MANAGE);
  return { sessions, surgeries, canManage };
}

const sessionSchema = z.object({ facility_id: z.string().uuid(), theatre_name: z.string().trim().min(1).max(80), session_date: z.string().min(8), start_time: z.string().optional().or(z.literal("")), end_time: z.string().optional().or(z.literal("")) });

export async function createSessionAction(_prev: unknown, formData: FormData) {
  try {
    const input = sessionSchema.parse({ facility_id: formData.get("facility_id"), theatre_name: formData.get("theatre_name"), session_date: formData.get("session_date"), start_time: formData.get("start_time") || "", end_time: formData.get("end_time") || "" });
    const { orgId, userId } = await ctx(Permissions.THEATRE_MANAGE);
    await repo.createSession({ organizationId: orgId, facilityId: input.facility_id, theatreName: input.theatre_name, sessionDate: input.session_date, startTime: input.start_time || null, endTime: input.end_time || null });
    revalidatePath("/staff/theatre");
    return { success: true };
  } catch (error) {
    logServerError("theatre", "session-create-failed", error);
    return { error: safeServerMessage(error, "We couldn't create the session.") };
  }
}

const surgerySchema = z.object({
  patient_id: z.string().uuid(), facility_id: z.string().uuid(),
  theatre_session_id: z.string().optional().or(z.literal("")), encounter_id: z.string().optional().or(z.literal("")),
  procedure_name: z.string().trim().min(1).max(200), procedure_code: z.string().trim().max(40).optional().or(z.literal("")),
  surgeon_user_id: z.string().optional().or(z.literal("")), anaesthetist_user_id: z.string().optional().or(z.literal("")),
  scheduled_at: z.string().optional().or(z.literal("")),
});

export async function createSurgeryAction(_prev: unknown, formData: FormData) {
  try {
    const input = surgerySchema.parse({
      patient_id: formData.get("patient_id"), facility_id: formData.get("facility_id"),
      theatre_session_id: formData.get("theatre_session_id") || "", encounter_id: formData.get("encounter_id") || "",
      procedure_name: formData.get("procedure_name"), procedure_code: formData.get("procedure_code") || "",
      surgeon_user_id: formData.get("surgeon_user_id") || "", anaesthetist_user_id: formData.get("anaesthetist_user_id") || "",
      scheduled_at: formData.get("scheduled_at") || "",
    });
    const { orgId, userId } = await ctx(Permissions.THEATRE_MANAGE);
    const id = await repo.createSurgery({
      organizationId: orgId, facilityId: input.facility_id, patientId: input.patient_id,
      encounterId: input.encounter_id || null, theatreSessionId: input.theatre_session_id || null,
      procedureName: input.procedure_name, procedureCode: input.procedure_code || null,
      surgeonUserId: input.surgeon_user_id || null, anaesthetistUserId: input.anaesthetist_user_id || null,
      scheduledAt: input.scheduled_at || null, createdBy: userId,
    });
    revalidatePath("/staff/theatre");
    return { success: true, surgeryId: id };
  } catch (error) {
    logServerError("theatre", "surgery-create-failed", error);
    return { error: safeServerMessage(error, "We couldn't book the surgery.") };
  }
}

const noteSchema = z.object({ surgery_id: z.string().uuid(), status: z.enum(["scheduled", "in_progress", "completed", "cancelled", "postponed"]).optional(), operative_note: z.string().optional().or(z.literal("")), findings: z.string().optional().or(z.literal("")), procedure_performed: z.string().optional().or(z.literal("")), blood_loss_ml: z.coerce.number().min(0).optional().or(z.literal("")), complications: z.string().optional().or(z.literal("")), outcome: z.string().optional().or(z.literal("")) });

export async function updateSurgeryAction(_prev: unknown, formData: FormData) {
  try {
    const input = noteSchema.parse({
      surgery_id: formData.get("surgery_id"), status: formData.get("status") || undefined,
      operative_note: formData.get("operative_note") || "", findings: formData.get("findings") || "",
      procedure_performed: formData.get("procedure_performed") || "", blood_loss_ml: formData.get("blood_loss_ml") || "",
      complications: formData.get("complications") || "", outcome: formData.get("outcome") || "",
    });
    const { orgId } = await ctx(Permissions.THEATRE_MANAGE);
    const patch: Record<string, unknown> = {};
    if (input.status) patch.status = input.status;
    for (const key of ["operative_note", "findings", "procedure_performed", "complications", "outcome"] as const) {
      const val = input[key];
      if (val !== undefined) patch[key] = val || null;
    }
    if (input.blood_loss_ml !== "") patch.blood_loss_ml = input.blood_loss_ml;
    await repo.updateSurgery(input.surgery_id, orgId, patch);
    revalidatePath("/staff/theatre");
    return { success: true };
  } catch (error) {
    logServerError("theatre", "surgery-update-failed", error);
    return { error: safeServerMessage(error, "We couldn't update the surgery.") };
  }
}
