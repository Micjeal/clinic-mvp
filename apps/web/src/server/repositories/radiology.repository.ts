import "server-only";
import { createClient } from "@/lib/supabase/server";

const ORDER_SELECT = "*,patients!imaging_orders_patient_id_fkey(id,first_name,last_name,patient_number),facilities!imaging_orders_facility_id_fkey(id,name),imaging_tests(id,code,name,modality,body_part,price,currency_code),imaging_reports(id,findings,impression,recommendations,status,reported_at,approved_at,patient_visible)";

export async function listImagingOrders(organizationId: string): Promise<any[]> {
  const supabase = (await createClient()) as unknown as import("@supabase/supabase-js").SupabaseClient;
  const { data, error } = await supabase.from("imaging_orders").select(ORDER_SELECT).eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(200);
  if (error) throw error;
  return data ?? [];
}

export async function findImagingOrder(id: string, organizationId: string): Promise<any> {
  const supabase = (await createClient()) as unknown as import("@supabase/supabase-js").SupabaseClient;
  const { data, error } = await supabase.from("imaging_orders").select(ORDER_SELECT).eq("id", id).eq("organization_id", organizationId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function listImagingTests(organizationId: string): Promise<any[]> {
  const supabase = (await createClient()) as unknown as import("@supabase/supabase-js").SupabaseClient;
  const { data, error } = await supabase.from("imaging_tests").select("*").eq("organization_id", organizationId).eq("is_active", true).order("name");
  if (error) throw error;
  return data ?? [];
}

export async function createImagingOrder(input: { organizationId: string; facilityId: string; encounterId: string; patientId: string; imagingTestId: string; orderedBy: string; priority: string; clinicalIndication: string | null; scheduledAt: string | null }) {
  const supabase = (await createClient()) as unknown as import("@supabase/supabase-js").SupabaseClient;
  const { data, error } = await supabase.from("imaging_orders").insert({
    organization_id: input.organizationId, facility_id: input.facilityId, encounter_id: input.encounterId,
    patient_id: input.patientId, imaging_test_id: input.imagingTestId, ordered_by: input.orderedBy,
    priority: input.priority,
    clinical_indication: input.clinicalIndication, scheduled_at: input.scheduledAt,
  }).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function updateImagingOrder(id: string, organizationId: string, patch: { status?: string; scheduled_at?: string | null; completed_at?: string | null }) {
  const supabase = (await createClient()) as unknown as import("@supabase/supabase-js").SupabaseClient;
  const { error } = await supabase.from("imaging_orders").update(patch).eq("id", id).eq("organization_id", organizationId);
  if (error) throw error;
}

export async function upsertImagingReport(input: { organizationId: string; imagingOrderId: string; patientId: string; findings: string | null; impression: string | null; recommendations: string | null; reportedBy: string }) {
  const supabase = (await createClient()) as unknown as import("@supabase/supabase-js").SupabaseClient;
  const { error } = await supabase.from("imaging_reports").upsert({
    organization_id: input.organizationId, imaging_order_id: input.imagingOrderId, patient_id: input.patientId,
    findings: input.findings, impression: input.impression, recommendations: input.recommendations,
    status: "draft", reported_by: input.reportedBy, reported_at: new Date().toISOString(),
  }, { onConflict: "imaging_order_id" });
  if (error) throw error;
}

export async function finalizeImagingReport(reportId: string, organizationId: string, approvedBy: string) {
  const supabase = (await createClient()) as unknown as import("@supabase/supabase-js").SupabaseClient;
  const { error } = await supabase.from("imaging_reports").update({ status: "final", approved_by: approvedBy, approved_at: new Date().toISOString() }).eq("id", reportId).eq("organization_id", organizationId);
  if (error) throw error;
}

export async function createImagingTest(input: { organizationId: string; code: string; name: string; modality: string; bodyPart: string | null; description: string | null; price: number }) {
  const supabase = (await createClient()) as unknown as import("@supabase/supabase-js").SupabaseClient;
  const { data, error } = await supabase.from("imaging_tests").insert({
    organization_id: input.organizationId, code: input.code, name: input.name,
    modality: input.modality,
    body_part: input.bodyPart, description: input.description, price: input.price,
  }).select("id").single();
  if (error) throw error;
  return data.id;
}
