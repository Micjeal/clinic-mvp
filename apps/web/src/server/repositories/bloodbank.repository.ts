import "server-only";
import { createClient } from "@/lib/supabase/server";

const untyped = async () => (await createClient()) as unknown as import("@supabase/supabase-js").SupabaseClient;

export async function listUnits(organizationId: string) {
  const supabase = await untyped();
  const { data, error } = await supabase.from("blood_units").select("*,facilities!blood_units_facility_id_fkey(id,name)").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(500);
  if (error) throw error;
  return data ?? [];
}

export async function listTransfusions(organizationId: string) {
  const supabase = await untyped();
  const { data, error } = await supabase.from("blood_transfusions").select("*,patients!blood_transfusions_patient_id_fkey(id,first_name,last_name,patient_number),blood_units(unit_number,blood_group,component)").eq("organization_id", organizationId).order("transfused_at", { ascending: false }).limit(200);
  if (error) throw error;
  return data ?? [];
}

export async function createUnit(input: { organizationId: string; facilityId: string | null; unitNumber: string; bloodGroup: string; component: string; volumeMl: number | null; donorName: string | null; collectionDate: string | null; expiryDate: string | null; notes: string | null; createdBy: string }) {
  const supabase = await untyped();
  const { data, error } = await supabase.from("blood_units").insert({
    organization_id: input.organizationId, facility_id: input.facilityId, unit_number: input.unitNumber,
    blood_group: input.bloodGroup, component: input.component, volume_ml: input.volumeMl,
    donor_name: input.donorName, collection_date: input.collectionDate, expiry_date: input.expiryDate,
    notes: input.notes, created_by: input.createdBy,
  }).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function updateUnitStatus(id: string, organizationId: string, status: string) {
  const supabase = await untyped();
  const { error } = await supabase.from("blood_units").update({ status }).eq("id", id).eq("organization_id", organizationId);
  if (error) throw error;
}

export async function recordTransfusion(input: { organizationId: string; bloodUnitId: string; patientId: string; encounterId: string | null; reactionNotes: string | null; createdBy: string }) {
  const supabase = await untyped();
  const { data, error } = await supabase.from("blood_transfusions").insert({
    organization_id: input.organizationId, blood_unit_id: input.bloodUnitId, patient_id: input.patientId,
    encounter_id: input.encounterId, reaction_notes: input.reactionNotes, transfused_by: input.createdBy,
  }).select("id").single();
  if (error) throw error;
  await supabase.from("blood_units").update({ status: "issued" }).eq("id", input.bloodUnitId).eq("organization_id", input.organizationId);
  return data.id;
}
