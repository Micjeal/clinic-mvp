import "server-only";
import { createClient } from "@/lib/supabase/server";

const untyped = async () => (await createClient()) as unknown as import("@supabase/supabase-js").SupabaseClient;
const SELECT = "*,patients!transport_requests_patient_id_fkey(id,first_name,last_name,patient_number),facilities!transport_requests_facility_id_fkey(id,name)";

export async function listRequests(organizationId: string) {
  const supabase = await untyped();
  const { data, error } = await supabase.from("transport_requests").select(SELECT).eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(300);
  if (error) throw error;
  return data ?? [];
}

export async function createRequest(input: { organizationId: string; facilityId: string | null; patientId: string | null; requestType: string; pickupLocation: string; destination: string | null; scheduledAt: string | null; priority: string; vehicle: string | null; notes: string | null; createdBy: string }) {
  const supabase = await untyped();
  const { data, error } = await supabase.from("transport_requests").insert({
    organization_id: input.organizationId, facility_id: input.facilityId, patient_id: input.patientId,
    request_type: input.requestType, pickup_location: input.pickupLocation, destination: input.destination,
    scheduled_at: input.scheduledAt, priority: input.priority, vehicle: input.vehicle, notes: input.notes,
    created_by: input.createdBy,
  }).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function updateRequest(id: string, organizationId: string, patch: Record<string, unknown>) {
  const supabase = await untyped();
  const { error } = await supabase.from("transport_requests").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id).eq("organization_id", organizationId);
  if (error) throw error;
}
