import "server-only";
import { createClient } from "@/lib/supabase/server";

const untyped = async () => (await createClient()) as unknown as import("@supabase/supabase-js").SupabaseClient;
const SELECT = "*,patients!mortuary_register_patient_id_fkey(id,first_name,last_name,patient_number),facilities!mortuary_register_facility_id_fkey(id,name)";

export async function listRegister(organizationId: string) {
  const supabase = await untyped();
  const { data, error } = await supabase.from("mortuary_register").select(SELECT).eq("organization_id", organizationId).order("date_of_death", { ascending: false }).limit(300);
  if (error) throw error;
  return data ?? [];
}

export async function createEntry(input: { organizationId: string; facilityId: string; patientId: string | null; deceasedName: string; age: string | null; sex: string | null; dateOfDeath: string; timeOfDeath: string | null; causeOfDeath: string | null; notes: string | null; createdBy: string }) {
  const supabase = await untyped();
  const { data, error } = await supabase.from("mortuary_register").insert({
    organization_id: input.organizationId, facility_id: input.facilityId, patient_id: input.patientId,
    deceased_name: input.deceasedName, age: input.age, sex: input.sex,
    date_of_death: input.dateOfDeath, time_of_death: input.timeOfDeath,
    cause_of_death: input.causeOfDeath, notes: input.notes, created_by: input.createdBy,
  }).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function releaseEntry(id: string, organizationId: string, releasedTo: string) {
  const supabase = await untyped();
  const { error } = await supabase.from("mortuary_register").update({ status: "released", released_to: releasedTo, released_at: new Date().toISOString() }).eq("id", id).eq("organization_id", organizationId);
  if (error) throw error;
}
