import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { TablesInsert } from "@clinic/database";

const RX_SELECT = "*,patients!prescriptions_patient_id_fkey(id,first_name,last_name,patient_number),facilities!prescriptions_facility_id_fkey(id,name),prescription_items(id,medication_id,medication_name,dose,route,frequency,duration_days,quantity,instructions,status)";

export async function listPrescriptions(organizationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("prescriptions").select(RX_SELECT).eq("organization_id", organizationId).order("prescribed_at", { ascending: false }).limit(200);
  if (error) throw error;
  return data ?? [];
}

export async function findPrescription(id: string, organizationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("prescriptions").select(RX_SELECT).eq("id", id).eq("organization_id", organizationId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function listMedications(organizationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("medications").select("*").eq("organization_id", organizationId).eq("is_active", true).order("generic_name");
  if (error) throw error;
  return data ?? [];
}

export async function createPrescription(input: {
  organizationId: string; facilityId: string; departmentId: string; encounterId: string; patientId: string;
  prescriberUserId: string; notes: string | null;
  items: { medicationId: string | null; medicationName: string; dose: string | null; route: string | null; frequency: string | null; durationDays: number | null; quantity: number | null; instructions: string | null }[];
}) {
  const supabase = await createClient();
  const { data: rx, error } = await supabase.from("prescriptions").insert({
    organization_id: input.organizationId, facility_id: input.facilityId, department_id: input.departmentId,
    encounter_id: input.encounterId, patient_id: input.patientId, prescriber_user_id: input.prescriberUserId,
    status: "active", notes: input.notes,
  } satisfies TablesInsert<"prescriptions">).select("id").single();
  if (error) throw error;
  const { error: itemsError } = await supabase.from("prescription_items").insert(
    input.items.map((item) => ({
      prescription_id: rx.id, medication_id: item.medicationId, medication_name: item.medicationName,
      dose: item.dose, route: item.route, frequency: item.frequency, duration_days: item.durationDays,
      quantity: item.quantity, instructions: item.instructions, status: "active",
    }) satisfies TablesInsert<"prescription_items">),
  );
  if (itemsError) throw itemsError;
  return rx.id;
}

export async function updatePrescriptionStatus(id: string, organizationId: string, status: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("prescriptions").update({ status: status as TablesInsert<"prescriptions">["status"] }).eq("id", id).eq("organization_id", organizationId);
  if (error) throw error;
}

export async function updatePrescriptionItemStatus(itemId: string, status: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("prescription_items").update({ status: status as TablesInsert<"prescription_items">["status"] }).eq("id", itemId);
  if (error) throw error;
}

export async function createMedication(input: { organizationId: string; code: string; genericName: string; brandName: string | null; dosageForm: string | null; strength: string | null; unit: string | null }) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("medications").insert({
    organization_id: input.organizationId, code: input.code, generic_name: input.genericName,
    brand_name: input.brandName, dosage_form: input.dosageForm, strength: input.strength, unit: input.unit ?? "unit",
  } satisfies TablesInsert<"medications">).select("id").single();
  if (error) throw error;
  return data.id;
}
