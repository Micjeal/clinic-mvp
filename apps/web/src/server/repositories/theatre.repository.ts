import "server-only";
import { createClient } from "@/lib/supabase/server";

const untyped = async () => (await createClient()) as unknown as import("@supabase/supabase-js").SupabaseClient;

const SESSION_SELECT = "*,surgeries(id,procedure_name,status,patient_id)";
const SURGERY_SELECT = "*,patients!surgeries_patient_id_fkey(id,first_name,last_name,patient_number),theatre_sessions(id,theatre_name,session_date)";

export async function listSessions(organizationId: string) {
  const supabase = await untyped();
  const { data, error } = await supabase.from("theatre_sessions").select(SESSION_SELECT).eq("organization_id", organizationId).order("session_date", { ascending: false }).limit(100);
  if (error) throw error;
  return data ?? [];
}

export async function listSurgeries(organizationId: string) {
  const supabase = await untyped();
  const { data, error } = await supabase.from("surgeries").select(SURGERY_SELECT).eq("organization_id", organizationId).order("scheduled_at", { ascending: false }).limit(200);
  if (error) throw error;
  return data ?? [];
}

export async function createSession(input: { organizationId: string; facilityId: string; theatreName: string; sessionDate: string; startTime: string | null; endTime: string | null }) {
  const supabase = await untyped();
  const { data, error } = await supabase.from("theatre_sessions").insert({
    organization_id: input.organizationId, facility_id: input.facilityId, theatre_name: input.theatreName,
    session_date: input.sessionDate, start_time: input.startTime, end_time: input.endTime,
  }).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function createSurgery(input: { organizationId: string; facilityId: string; patientId: string; encounterId: string | null; theatreSessionId: string | null; procedureName: string; procedureCode: string | null; surgeonUserId: string | null; anaesthetistUserId: string | null; scheduledAt: string | null; createdBy: string }) {
  const supabase = await untyped();
  const { data, error } = await supabase.from("surgeries").insert({
    organization_id: input.organizationId, facility_id: input.facilityId, patient_id: input.patientId,
    encounter_id: input.encounterId, theatre_session_id: input.theatreSessionId,
    procedure_name: input.procedureName, procedure_code: input.procedureCode,
    surgeon_user_id: input.surgeonUserId, anaesthetist_user_id: input.anaesthetistUserId,
    scheduled_at: input.scheduledAt, created_by: input.createdBy,
  }).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function updateSurgery(id: string, organizationId: string, patch: Record<string, unknown>) {
  const supabase = await untyped();
  const { error } = await supabase.from("surgeries").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id).eq("organization_id", organizationId);
  if (error) throw error;
}

export async function listPatientsForSurgery(organizationId: string) {
  const supabase = await untyped();
  const { data, error } = await supabase.from("patients").select("id,first_name,last_name,patient_number").eq("organization_id", organizationId).eq("is_active", true).order("last_name").limit(500);
  if (error) throw error;
  return data ?? [];
}
