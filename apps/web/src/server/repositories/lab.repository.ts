import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { TablesInsert } from "@clinic/database";

const ORDER_SELECT = "*,patients!lab_orders_patient_id_fkey(id,first_name,last_name,patient_number),facilities!lab_orders_facility_id_fkey(id,name),departments!lab_orders_department_id_fkey(id,name),lab_order_items(id,lab_test_id,status,specimen_id,collected_at,completed_at,lab_tests(id,code,name,specimen_type,default_unit,reference_range_text,price,currency_code),lab_results(id,result_value,unit,reference_range,abnormal_flag,result_text,patient_visible,resulted_at,approved_at))";

export async function listLabOrders(organizationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("lab_orders").select(ORDER_SELECT).eq("organization_id", organizationId).order("ordered_at", { ascending: false }).limit(200);
  if (error) throw error;
  return data ?? [];
}

export async function findLabOrder(id: string, organizationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("lab_orders").select(ORDER_SELECT).eq("id", id).eq("organization_id", organizationId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function listLabTests(organizationId: string, includeInactive = false) {
  const supabase = await createClient();
  let query = supabase.from("lab_tests").select("*,departments!lab_tests_department_id_fkey(id,name)").eq("organization_id", organizationId);
  if (!includeInactive) query = query.eq("is_active", true);
  const { data, error } = await query.order("name");
  if (error) throw error;
  return data ?? [];
}

export async function listLabDepartments(organizationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("departments").select("id,name").eq("organization_id", organizationId).eq("is_active", true).order("name");
  if (error) throw error;
  return data ?? [];
}

export async function listOrderableEncounters(organizationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("encounters").select("id,patient_id,facility_id,department_id,started_at,status,patients!encounters_patient_id_fkey(id,first_name,last_name,patient_number)").eq("organization_id", organizationId).order("started_at", { ascending: false }).limit(500);
  if (error) throw error;
  return data ?? [];
}

export async function createLabOrder(input: {
  organizationId: string; facilityId: string; departmentId: string; encounterId: string; patientId: string;
  orderedBy: string; priority: string; clinicalNotes: string | null; testIds: string[];
}) {
  const supabase = await createClient();
  const { data: order, error } = await supabase.from("lab_orders").insert({
    organization_id: input.organizationId, facility_id: input.facilityId, department_id: input.departmentId,
    encounter_id: input.encounterId, patient_id: input.patientId, ordered_by: input.orderedBy,
    priority: input.priority as TablesInsert<"lab_orders">["priority"], clinical_notes: input.clinicalNotes,
  } satisfies TablesInsert<"lab_orders">).select("id").single();
  if (error) throw error;
  const { error: itemsError } = await supabase.from("lab_order_items").insert(
    input.testIds.map((testId) => ({ lab_order_id: order.id, lab_test_id: testId }) satisfies TablesInsert<"lab_order_items">),
  );
  if (itemsError) throw itemsError;
  return order.id;
}

export async function updateLabOrderStatus(id: string, organizationId: string, patch: { status?: string; completed_at?: string | null }) {
  const supabase = await createClient();
  const { error } = await supabase.from("lab_orders").update(patch).eq("id", id).eq("organization_id", organizationId);
  if (error) throw error;
}

export async function updateLabOrderItemStatus(itemId: string, patch: { status?: string; collected_by?: string | null; collected_at?: string | null; completed_at?: string | null; specimen_id?: string | null }) {
  const supabase = await createClient();
  const { error } = await supabase.from("lab_order_items").update(patch).eq("id", itemId);
  if (error) throw error;
}

export async function upsertLabResult(input: {
  organizationId: string; labOrderItemId: string; patientId: string; resultValue: string | null;
  unit: string | null; referenceRange: string | null; abnormalFlag: string | null; resultText: string | null;
  resultedBy: string | null;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("lab_results").upsert({
    organization_id: input.organizationId,
    lab_order_item_id: input.labOrderItemId,
    patient_id: input.patientId,
    result_value: input.resultValue,
    unit: input.unit,
    reference_range: input.referenceRange,
    abnormal_flag: input.abnormalFlag as TablesInsert<"lab_results">["abnormal_flag"],
    result_text: input.resultText,
    resulted_by: input.resultedBy,
    resulted_at: new Date().toISOString(),
  } satisfies TablesInsert<"lab_results">, { onConflict: "lab_order_item_id" });
  if (error) throw error;
}

export async function approveLabResult(resultId: string, organizationId: string, approvedBy: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("lab_results").update({ approved_by: approvedBy, approved_at: new Date().toISOString() }).eq("id", resultId).eq("organization_id", organizationId);
  if (error) throw error;
}

export async function createLabTest(input: { organizationId: string; code: string; name: string; description: string | null; specimenType: string | null; defaultUnit: string | null; referenceRangeText: string | null; price: number; departmentId: string | null; isActive?: boolean }) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("lab_tests").insert({
    organization_id: input.organizationId, code: input.code, name: input.name, description: input.description,
    specimen_type: input.specimenType, default_unit: input.defaultUnit, reference_range_text: input.referenceRangeText,
    price: input.price, department_id: input.departmentId, is_active: input.isActive ?? true,
  } satisfies TablesInsert<"lab_tests">).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function markOrderNotified(orderId: string, organizationId: string) {
  const supabase = (await createClient()) as unknown as import("@supabase/supabase-js").SupabaseClient;
  const { error } = await supabase.from("lab_orders").update({ clinician_notified_at: new Date().toISOString() }).eq("id", orderId).eq("organization_id", organizationId);
  if (error) throw error;
}

export async function updateLabTest(input: { id: string; organizationId: string; code: string; name: string; description: string | null; specimenType: string | null; defaultUnit: string | null; referenceRangeText: string | null; price: number; departmentId: string | null; isActive: boolean }) {
  const supabase = await createClient();
  const { error } = await supabase.from("lab_tests").update({
    code: input.code, name: input.name, description: input.description,
    specimen_type: input.specimenType, default_unit: input.defaultUnit, reference_range_text: input.referenceRangeText,
    price: input.price, department_id: input.departmentId, is_active: input.isActive,
  }).eq("id", input.id).eq("organization_id", input.organizationId);
  if (error) throw error;
}
