import "server-only";
import { createClient } from "@/lib/supabase/server";

const untyped = async () => (await createClient()) as unknown as import("@supabase/supabase-js").SupabaseClient;

export type ChargeInput = {
  organizationId: string;
  encounterId: string;
  patientId: string;
  facilityId: string | null;
  chargeType: string;
  description: string;
  quantity: number;
  unitPrice: number;
  currencyCode?: string;
  sourceType: string;
  sourceId: string;
  createdBy?: string | null;
};

export async function insertCharge(input: ChargeInput): Promise<string | null> {
  const supabase = await untyped();
  const total = input.quantity * input.unitPrice;
  const { data, error } = await supabase.from("encounter_charges").insert({
    organization_id: input.organizationId,
    encounter_id: input.encounterId,
    patient_id: input.patientId,
    facility_id: input.facilityId,
    charge_type: input.chargeType,
    description: input.description,
    quantity: input.quantity,
    unit_price: input.unitPrice,
    total,
    currency_code: input.currencyCode ?? "UGX",
    source_type: input.sourceType,
    source_id: input.sourceId,
    created_by: input.createdBy ?? null,
  }).select("id").single();
  if (error) {
    if (String(error.code) === "23505") return null; // already charged
    throw error;
  }
  return data.id;
}

export async function listPendingCharges(organizationId: string): Promise<any[]> {
  const supabase = await untyped();
  const { data, error } = await supabase.from("encounter_charges").select("*,patients!encounter_charges_patient_id_fkey(id,first_name,last_name,patient_number),encounters!encounter_charges_encounter_id_fkey(id,started_at,chief_complaint)").eq("organization_id", organizationId).eq("status", "pending").order("created_at", { ascending: false }).limit(300);
  if (error) throw error;
  return data ?? [];
}

export async function findPendingChargesByIds(ids: string[], organizationId: string): Promise<any[]> {
  const supabase = await untyped();
  const { data, error } = await supabase.from("encounter_charges").select("*").in("id", ids).eq("organization_id", organizationId).eq("status", "pending");
  if (error) throw error;
  return data ?? [];
}

export async function markChargesInvoiced(chargeIds: string[], invoiceItemIds: Record<string, string>, organizationId: string) {
  const supabase = await untyped();
  for (const id of chargeIds) {
    const { error } = await supabase.from("encounter_charges").update({ status: "invoiced", invoice_item_id: invoiceItemIds[id] ?? null }).eq("id", id).eq("organization_id", organizationId);
    if (error) throw error;
  }
}

export async function listStandardCharges(organizationId: string): Promise<any[]> {
  const supabase = await untyped();
  const { data, error } = await supabase.from("standard_charges").select("*").eq("organization_id", organizationId).eq("is_active", true).order("category").order("name");
  if (error) throw error;
  return data ?? [];
}

export async function findStandardCharge(organizationId: string, category: string, name?: string): Promise<any | null> {
  const supabase = await untyped();
  let query = supabase.from("standard_charges").select("*").eq("organization_id", organizationId).eq("category", category).eq("is_active", true);
  if (name) query = query.ilike("name", name);
  const { data, error } = await query.order("created_at", { ascending: true }).limit(1).maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertStandardCharge(input: { id?: string; organizationId: string; name: string; category: string; price: number; currencyCode?: string; isActive?: boolean }) {
  const supabase = await untyped();
  const row = { organization_id: input.organizationId, name: input.name, category: input.category, price: input.price, currency_code: input.currencyCode ?? "UGX", is_active: input.isActive ?? true };
  const { data, error } = input.id
    ? await supabase.from("standard_charges").update(row).eq("id", input.id).eq("organization_id", input.organizationId).select("id").single()
    : await supabase.from("standard_charges").insert(row).select("id").single();
  if (error) throw error;
  return data.id as string;
}

export async function deactivateStandardCharge(id: string, organizationId: string) {
  const supabase = await untyped();
  const { error } = await supabase.from("standard_charges").update({ is_active: false }).eq("id", id).eq("organization_id", organizationId);
  if (error) throw error;
}
