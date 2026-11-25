"use server";

import { requirePermission } from "@/server/permissions/require-permission";
import { Permissions } from "@clinic/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

export async function searchPatientsAction(query: string) {
  try {
    const staff = await requirePermission(Permissions.RECEPTION_CHECKIN);
    const admin = createAdminClient() as unknown as import("@supabase/supabase-js").SupabaseClient;
    const { data, error } = await admin.from("patients")
      .select("id,patient_number,first_name,last_name,phone")
      .eq("organization_id", staff.membership.organization_id)
      .or(`patient_number.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
      .order("created_at", { ascending: false }).limit(8);
    if (error) throw error;
    return { patients: data ?? [] };
  } catch { return { patients: [] }; }
}
