"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { safeServerMessage } from "@/server/errors";
import { logServerError } from "@/server/logging";
import { addClinicalNote, addDiagnosis } from "@/server/services/clinical.service";
import { requirePermission } from "@/server/permissions/require-permission";
import { Permissions } from "@clinic/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

const noteSchema = z.object({
  encounter_id: z.string().uuid(),
  patient_id: z.string().uuid(),
  note_type: z.enum(["progress", "admission", "discharge", "procedure", "consultation", "other"]).default("progress"),
  content: z.string().trim().min(1).max(20000),
  patient_visible: z.coerce.boolean().default(false),
});

export async function addClinicalNoteAction(_prev: unknown, formData: FormData) {
  try {
    const input = noteSchema.parse(Object.fromEntries(formData));
    await addClinicalNote({ encounterId: input.encounter_id, patientId: input.patient_id, noteType: input.note_type, content: input.content, patientVisible: input.patient_visible });
    revalidatePath("/staff/triage");
    return { success: true };
  } catch (error) {
    logServerError("clinical", "note-create-failed", error);
    return { error: safeServerMessage(error, "We couldn't save the note.") };
  }
}

const diagnosisSchema = z.object({
  encounter_id: z.string().uuid(),
  patient_id: z.string().uuid(),
  code_system: z.string().trim().max(40).optional().or(z.literal("")),
  diagnosis_code: z.string().trim().max(40).optional().or(z.literal("")),
  diagnosis_name: z.string().trim().min(2).max(300),
  diagnosis_type: z.enum(["working", "confirmed", "differential", "historical"]).default("working"),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  patient_visible: z.coerce.boolean().default(true),
});

export async function addDiagnosisAction(_prev: unknown, formData: FormData) {
  try {
    const input = diagnosisSchema.parse(Object.fromEntries(formData));
    await addDiagnosis({
      encounterId: input.encounter_id, patientId: input.patient_id,
      codeSystem: input.code_system || null, diagnosisCode: input.diagnosis_code || null,
      diagnosisName: input.diagnosis_name, diagnosisType: input.diagnosis_type,
      notes: input.notes || null, patientVisible: input.patient_visible,
    });
    revalidatePath("/staff/triage");
    return { success: true };
  } catch (error) {
    logServerError("clinical", "diagnosis-create-failed", error);
    return { error: safeServerMessage(error, "We couldn't save the diagnosis.") };
  }
}

export async function addEncounterChargeAction(_prev: unknown, formData: FormData) {
  try {
    const encounterId = String(formData.get("encounter_id") || "");
    const description = String(formData.get("description") || "").trim();
    const quantity = Number(formData.get("quantity") || 1);
    const unitPrice = Number(formData.get("unit_price") || 0);
    if (!encounterId || !description || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0) return { error: "Enter a description, quantity and price." };
    const staff = await requirePermission(Permissions.CLINICAL_NOTE_WRITE);
    const admin = createAdminClient() as unknown as import("@supabase/supabase-js").SupabaseClient;
    const { data: enc } = await admin.from("encounters").select("id,patient_id,facility_id").eq("id", encounterId).eq("organization_id", staff.membership.organization_id).maybeSingle();
    if (!enc?.patient_id) return { error: "Encounter not found." };
    const { insertCharge } = await import("@/server/repositories/charge.repository");
    const id = await insertCharge({ organizationId: staff.membership.organization_id, encounterId, patientId: enc.patient_id, facilityId: enc.facility_id ?? null, chargeType: "procedure", description, quantity, unitPrice, sourceType: "manual", sourceId: crypto.randomUUID(), createdBy: staff.user.id });
    if (!id) return { error: "Duplicate charge — already recorded." };
    revalidatePath("/staff/billing");
    return { success: "Charge added to unbilled." };
  } catch (error) {
    logServerError("clinical", "manual-charge-failed", error);
    return { error: safeServerMessage(error, "Unable to add the charge.") };
  }
}

export async function recordEncounterVitalsAction(_prev: unknown, formData: FormData) {
  try {
    const encounterId = String(formData.get("encounter_id") || "");
    const staff = await requirePermission(Permissions.CLINICAL_NOTE_WRITE);
    const admin = createAdminClient() as unknown as import("@supabase/supabase-js").SupabaseClient;
    const { data: enc } = await admin.from("encounters").select("id,patient_id,organization_id").eq("id", encounterId).eq("organization_id", staff.membership.organization_id).maybeSingle();
    if (!enc?.patient_id) return { error: "Encounter not found." };
    const num = (key: string) => { const v = formData.get(key); return v === null || v === "" ? undefined : Number(v); };
    const { createVitals } = await import("@/server/repositories/reception.repository");
    await createVitals({
      organization_id: staff.membership.organization_id, encounter_id: encounterId, patient_id: enc.patient_id,
      recorded_by: staff.user.id,
      temperature_c: num("temperature_c") ?? null, pulse_bpm: num("pulse_bpm") ?? null, respiratory_rate: num("respiratory_rate") ?? null,
      systolic_bp: num("systolic_bp") ?? null, diastolic_bp: num("diastolic_bp") ?? null, oxygen_saturation: num("oxygen_saturation") ?? null,
      weight_kg: num("weight_kg") ?? null, height_cm: num("height_cm") ?? null,
      notes: String(formData.get("notes") || "").trim() || null,
    });
    revalidatePath(`/staff/triage/${formData.get("queue_id") || ""}`);
    return { success: true };
  } catch (error) {
    logServerError("clinical", "encounter-vitals-failed", error);
    return { error: safeServerMessage(error, "Unable to record vitals.") };
  }
}
