import "server-only";
import { createClient } from "@/lib/supabase/server";

const untyped = async () => (await createClient()) as unknown as import("@supabase/supabase-js").SupabaseClient;

export async function listWards(organizationId: string): Promise<any[]> {
  const supabase = await untyped();
  const { data, error } = await supabase.from("wards").select("*,facilities!wards_facility_id_fkey(id,name),beds(id,bed_number,status)").eq("organization_id", organizationId).eq("is_active", true).order("name");
  if (error) throw error;
  return data ?? [];
}

export async function listAdmissions(organizationId: string): Promise<any[]> {
  const supabase = await untyped();
  const { data, error } = await supabase.from("admissions").select("*,patients!admissions_patient_id_fkey(id,first_name,last_name,patient_number),wards(id,name,ward_type),beds(id,bed_number),facilities!admissions_facility_id_fkey(id,name)").eq("organization_id", organizationId).order("admitted_at", { ascending: false }).limit(200);
  if (error) throw error;
  return data ?? [];
}

export async function findAdmission(id: string, organizationId: string): Promise<any> {
  const supabase = await untyped();
  const { data, error } = await supabase.from("admissions").select("*,patients!admissions_patient_id_fkey(id,first_name,last_name,patient_number,date_of_birth,sex),wards(id,name,ward_type),beds(id,bed_number,status),facilities!admissions_facility_id_fkey(id,name)").eq("id", id).eq("organization_id", organizationId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function listPatients(organizationId: string): Promise<any[]> {
  const supabase = await untyped();
  const { data, error } = await supabase.from("patients").select("id,first_name,last_name,patient_number").eq("organization_id", organizationId).order("last_name").limit(500);
  if (error) throw error;
  return data ?? [];
}

export async function nextAdmissionNumber(organizationId: string): Promise<string> {
  const supabase = await untyped();
  const { count } = await supabase.from("admissions").select("id", { count: "exact", head: true }).eq("organization_id", organizationId);
  return `ADM-${new Date().getFullYear()}-${String((count ?? 0) + 1).padStart(5, "0")}`;
}

export async function createAdmission(input: { organizationId: string; facilityId: string; patientId: string; wardId: string; bedId: string | null; encounterId: string | null; admittedBy: string; admissionNumber: string; reasonForAdmission: string | null; diagnosisOnAdmission: string | null }) {
  const supabase = await untyped();
  const { data, error } = await supabase.from("admissions").insert(input).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function updateAdmission(id: string, organizationId: string, patch: Record<string, unknown>) {
  const supabase = await untyped();
  const { error } = await supabase.from("admissions").update(patch).eq("id", id).eq("organization_id", organizationId);
  if (error) throw error;
}

export async function setBedStatus(bedId: string, organizationId: string, status: string) {
  const supabase = await untyped();
  const { error } = await supabase.from("beds").update({ status }).eq("id", bedId).eq("organization_id", organizationId);
  if (error) throw error;
}

export async function createWard(input: { organizationId: string; facilityId: string; name: string; wardType: string; departmentId: string | null }) {
  const supabase = await untyped();
  const { data, error } = await supabase.from("wards").insert(input).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function createBed(input: { organizationId: string; wardId: string; bedNumber: string }) {
  const supabase = await untyped();
  const { data, error } = await supabase.from("beds").insert(input).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function listFacilities(organizationId: string): Promise<any[]> {
  const supabase = await untyped();
  const { data, error } = await supabase.from("facilities").select("id,name").eq("organization_id", organizationId).eq("is_active", true).order("name");
  if (error) throw error;
  return data ?? [];
}
