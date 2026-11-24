import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { TablesInsert } from "@clinic/database";

export async function listEncounterNotes(encounterId: string, organizationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("clinical_notes").select("*,profiles!clinical_notes_author_user_id_fkey(full_name)").eq("encounter_id", encounterId).eq("organization_id", organizationId).order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listEncounterDiagnoses(encounterId: string, organizationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("diagnoses").select("*,profiles!diagnoses_diagnosed_by_fkey(full_name)").eq("encounter_id", encounterId).eq("organization_id", organizationId).order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function insertClinicalNote(input: { organizationId: string; encounterId: string; patientId: string; authorUserId: string; noteType: string; content: string; patientVisible: boolean }) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("clinical_notes").insert({
    organization_id: input.organizationId, encounter_id: input.encounterId, patient_id: input.patientId,
    author_user_id: input.authorUserId, note_type: input.noteType, content: input.content, patient_visible: input.patientVisible,
  } satisfies TablesInsert<"clinical_notes">).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function insertDiagnosis(input: { organizationId: string; encounterId: string; patientId: string; diagnosedBy: string; codeSystem: string | null; diagnosisCode: string | null; diagnosisName: string; diagnosisType: string; notes: string | null; patientVisible: boolean }) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("diagnoses").insert({
    organization_id: input.organizationId, encounter_id: input.encounterId, patient_id: input.patientId,
    diagnosed_by: input.diagnosedBy, code_system: input.codeSystem, diagnosis_code: input.diagnosisCode,
    diagnosis_name: input.diagnosisName, diagnosis_type: input.diagnosisType as TablesInsert<"diagnoses">["diagnosis_type"],
    notes: input.notes, patient_visible: input.patientVisible,
  } satisfies TablesInsert<"diagnoses">).select("id").single();
  if (error) throw error;
  return data.id;
}
