import "server-only";
import { createClient } from "@/lib/supabase/server";

const untyped = async () => (await createClient()) as unknown as import("@supabase/supabase-js").SupabaseClient;

export async function listSchemes(organizationId: string): Promise<any[]> {
  const supabase = await untyped();
  const { data, error } = await supabase.from("insurance_schemes").select("*").eq("organization_id", organizationId).order("name");
  if (error) throw error;
  return data ?? [];
}

export async function listClaims(organizationId: string): Promise<any[]> {
  const supabase = await untyped();
  const { data, error } = await supabase.from("insurance_claims").select("*,patients!insurance_claims_patient_id_fkey(id,first_name,last_name,patient_number),insurance_schemes(id,name),facilities!insurance_claims_facility_id_fkey(id,name),invoices(id,invoice_number,total,currency_code)").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(200);
  if (error) throw error;
  return data ?? [];
}

export async function findClaim(id: string, organizationId: string): Promise<any> {
  const supabase = await untyped();
  const { data, error } = await supabase.from("insurance_claims").select("*,patients!insurance_claims_patient_id_fkey(id,first_name,last_name,patient_number),insurance_schemes(id,name,scheme_type,coverage_percent),invoices(id,invoice_number,total,currency_code,status)").eq("id", id).eq("organization_id", organizationId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function listIssuedInvoices(organizationId: string): Promise<any[]> {
  const supabase = await untyped();
  const { data, error } = await supabase.from("invoices").select("id,invoice_number,patient_id,total,balance,currency_code,status,patients!invoices_patient_id_fkey(id,first_name,last_name,patient_number)").eq("organization_id", organizationId).in("status", ["issued", "partially_paid"]).order("created_at", { ascending: false }).limit(200);
  if (error) throw error;
  return data ?? [];
}

export async function listPatientPolicies(organizationId: string, patientId?: string): Promise<any[]> {
  const supabase = await untyped();
  let query = supabase.from("patient_insurance_policies").select("*,insurance_schemes(id,name,scheme_type,coverage_percent)").eq("organization_id", organizationId).eq("status", "active");
  if (patientId) query = query.eq("patient_id", patientId);
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listPatients(organizationId: string): Promise<any[]> {
  const supabase = await untyped();
  const { data, error } = await supabase.from("patients").select("id,first_name,last_name,patient_number").eq("organization_id", organizationId).order("last_name").limit(500);
  if (error) throw error;
  return data ?? [];
}

export async function nextClaimNumber(organizationId: string): Promise<string> {
  const supabase = await untyped();
  const { count } = await supabase.from("insurance_claims").select("id", { count: "exact", head: true }).eq("organization_id", organizationId);
  return `CLM-${new Date().getFullYear()}-${String((count ?? 0) + 1).padStart(5, "0")}`;
}

export async function createClaim(input: { organizationId: string; facilityId: string; patientId: string; invoiceId: string | null; insuranceSchemeId: string; policyId: string | null; claimNumber: string; claimedAmount: number; currencyCode: string; diagnosisSummary: string | null; notes: string | null; createdBy: string }) {
  const supabase = await untyped();
  const { data, error } = await supabase.from("insurance_claims").insert({
    organization_id: input.organizationId, facility_id: input.facilityId, patient_id: input.patientId,
    invoice_id: input.invoiceId, insurance_scheme_id: input.insuranceSchemeId, policy_id: input.policyId,
    claim_number: input.claimNumber, claimed_amount: input.claimedAmount, currency_code: input.currencyCode,
    diagnosis_summary: input.diagnosisSummary, notes: input.notes, created_by: input.createdBy,
  }).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function updateClaim(id: string, organizationId: string, patch: Record<string, unknown>) {
  const supabase = await untyped();
  const { error } = await supabase.from("insurance_claims").update(patch).eq("id", id).eq("organization_id", organizationId);
  if (error) throw error;
}

export async function createScheme(input: { organizationId: string; name: string; schemeType: string; contactPhone: string | null; contactEmail: string | null; preauthRequired: boolean; coveragePercent: number }) {
  const supabase = await untyped();
  const { data, error } = await supabase.from("insurance_schemes").insert({
    organization_id: input.organizationId, name: input.name, scheme_type: input.schemeType,
    contact_phone: input.contactPhone, contact_email: input.contactEmail,
    preauth_required: input.preauthRequired, coverage_percent: input.coveragePercent,
  }).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function createPolicy(input: { organizationId: string; patientId: string; insuranceSchemeId: string; policyNumber: string; memberNumber: string | null; groupNumber: string | null; coveragePercent: number | null; validFrom: string | null; validTo: string | null }) {
  const supabase = await untyped();
  const { data, error } = await supabase.from("patient_insurance_policies").insert({
    organization_id: input.organizationId, patient_id: input.patientId, insurance_scheme_id: input.insuranceSchemeId,
    policy_number: input.policyNumber, member_number: input.memberNumber, group_number: input.groupNumber,
    coverage_percent: input.coveragePercent, valid_from: input.validFrom, valid_to: input.validTo,
  }).select("id").single();
  if (error) throw error;
  return data.id;
}
