import "server-only";
import { createClient } from "@/lib/supabase/server";

const untyped = async () => (await createClient()) as unknown as import("@supabase/supabase-js").SupabaseClient;

export async function listMemberships(organizationId: string): Promise<any[]> {
  const supabase = await untyped();
  const { data, error } = await supabase.from("staff_memberships").select("id,user_id,is_active,profiles!staff_memberships_user_id_fkey(full_name,email),roles!staff_memberships_role_id_fkey(name)").eq("organization_id", organizationId).eq("is_active", true).order("created_at");
  if (error) throw error;
  return data ?? [];
}

export async function listShifts(organizationId: string, fromDate?: string, toDate?: string): Promise<any[]> {
  const supabase = await untyped();
  let query = supabase.from("staff_shifts").select("*,staff_memberships!staff_shifts_staff_membership_id_fkey(profiles!staff_memberships_user_id_fkey(full_name)),facilities!staff_shifts_facility_id_fkey(name)").eq("organization_id", organizationId).order("shift_date").order("start_time").limit(400);
  if (fromDate) query = query.gte("shift_date", fromDate);
  if (toDate) query = query.lte("shift_date", toDate);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function listLeaveRequests(organizationId: string): Promise<any[]> {
  const supabase = await untyped();
  const { data, error } = await supabase.from("leave_requests").select("*,staff_memberships!leave_requests_staff_membership_id_fkey(profiles!staff_memberships_user_id_fkey(full_name)),roles!staff_memberships_role_id_fkey(name)").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(200);
  if (error) throw error;
  return data ?? [];
}

export async function findLeaveRequest(id: string, organizationId: string): Promise<any> {
  const supabase = await untyped();
  const { data, error } = await supabase.from("leave_requests").select("*,staff_memberships!leave_requests_staff_membership_id_fkey(profiles!staff_memberships_user_id_fkey(full_name))").eq("id", id).eq("organization_id", organizationId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function findMembership(membershipId: string, organizationId: string): Promise<any> {
  const supabase = await untyped();
  const { data, error } = await supabase.from("staff_memberships").select("id").eq("id", membershipId).eq("organization_id", organizationId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function createShift(input: { organizationId: string; staffMembershipId: string; facilityId: string | null; shiftDate: string; startTime: string; endTime: string; roleOnDuty: string | null; notes: string | null }) {
  const supabase = await untyped();
  const { data, error } = await supabase.from("staff_shifts").insert(input).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function deleteShift(id: string, organizationId: string) {
  const supabase = await untyped();
  const { error } = await supabase.from("staff_shifts").delete().eq("id", id).eq("organization_id", organizationId);
  if (error) throw error;
}

export async function createLeaveRequest(input: { organizationId: string; staffMembershipId: string; leaveType: string; startDate: string; endDate: string; reason: string | null }) {
  const supabase = await untyped();
  const { data, error } = await supabase.from("leave_requests").insert(input).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function updateLeaveRequest(id: string, organizationId: string, patch: Record<string, unknown>) {
  const supabase = await untyped();
  const { error } = await supabase.from("leave_requests").update(patch).eq("id", id).eq("organization_id", organizationId);
  if (error) throw error;
}

export async function listFacilities(organizationId: string): Promise<any[]> {
  const supabase = await untyped();
  const { data, error } = await supabase.from("facilities").select("id,name").eq("organization_id", organizationId).eq("is_active", true).order("name");
  if (error) throw error;
  return data ?? [];
}
