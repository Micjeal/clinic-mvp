import "server-only";
import { Permissions } from "@clinic/permissions";
import { requirePermission } from "@/server/permissions/require-permission";
import { createClient } from "@/lib/supabase/server";

const untyped = async () => (await createClient()) as unknown as import("@supabase/supabase-js").SupabaseClient;

async function count(table: string, orgId: string, filter?: (q: any) => any): Promise<number> {
  const supabase = await untyped();
  let query = supabase.from(table).select("id", { count: "exact", head: true }).eq("organization_id", orgId);
  if (filter) query = filter(query);
  const { count: c, error } = await query;
  if (error) return 0;
  return c ?? 0;
}

async function sum(table: string, orgId: string, column: string): Promise<number> {
  const supabase = await untyped();
  const { data, error } = await supabase.from(table).select(column).eq("organization_id", orgId);
  if (error || !data) return 0;
  return ((data ?? []) as unknown as Record<string, number>[]).reduce((s, row) => s + Number(row[column] ?? 0), 0);
}

export async function getOperationalReports() {
  const staff = await requirePermission(Permissions.REPORTS_READ);
  const orgId = staff.membership.organization_id;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const weekAgo = new Date(Date.now() - 7 * 86400000);

  const [
    appointmentsToday, appointmentsWeek, encountersTotal, encountersToday,
    invoicesPaid, invoicesOutstanding, claimsOpen, labPending, imagingPending,
    admissionsActive, patientsTotal, queueActive,
  ] = await Promise.all([
    count("appointments", orgId, (q) => q.gte("scheduled_start", today.toISOString())),
    count("appointments", orgId, (q) => q.gte("scheduled_start", weekAgo.toISOString())),
    count("encounters", orgId),
    count("encounters", orgId, (q) => q.gte("started_at", today.toISOString())),
    sum("invoices", orgId, "total").then(async () => {
      const supabase = await untyped();
      const { data } = await supabase.from("invoices").select("total").eq("organization_id", orgId).eq("status", "paid");
      return (data ?? []).reduce((s: number, r: { total: number }) => s + Number(r.total), 0);
    }),
    sum("invoices", orgId, "balance").then(async () => {
      const supabase = await untyped();
      const { data } = await supabase.from("invoices").select("balance").eq("organization_id", orgId).in("status", ["issued", "partially_paid"]);
      return (data ?? []).reduce((s: number, r: { balance: number }) => s + Number(r.balance), 0);
    }),
    count("insurance_claims", orgId, (q) => q.in("status", ["draft", "submitted", "under_review", "approved"])),
    count("lab_orders", orgId, (q) => q.in("status", ["ordered", "sample_collected", "processing"])),
    count("imaging_orders", orgId, (q) => q.in("status", ["ordered", "scheduled", "in_progress"])),
    count("admissions", orgId, (q) => q.in("status", ["admitted", "on_leave"])),
    count("patients", orgId),
    count("queue_entries", orgId, (q) => q.not("status", "in", "(completed,cancelled)")),
  ]);

  return {
    appointmentsToday, appointmentsWeek, encountersTotal, encountersToday,
    revenueCollected: invoicesPaid, revenueOutstanding: invoicesOutstanding,
    openClaims: claimsOpen, labPending, imagingPending,
    admissionsActive, patientsTotal, queueActive,
  };
}
