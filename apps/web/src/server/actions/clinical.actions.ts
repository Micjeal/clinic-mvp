"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { safeServerMessage } from "@/server/errors";
import { logServerError } from "@/server/logging";
import { addClinicalNote, addDiagnosis } from "@/server/services/clinical.service";

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
