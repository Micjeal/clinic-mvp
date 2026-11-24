import "server-only";
import { createClient } from "@/lib/supabase/server";

const untyped = async () => (await createClient()) as unknown as import("@supabase/supabase-js").SupabaseClient;
const SELECT = "*,facilities!expenses_facility_id_fkey(id,name)";

export async function listExpenses(organizationId: string) {
  const supabase = await untyped();
  const { data, error } = await supabase.from("expenses").select(SELECT).eq("organization_id", organizationId).order("expense_date", { ascending: false }).limit(500);
  if (error) throw error;
  return data ?? [];
}

export async function createExpense(input: { organizationId: string; facilityId: string | null; category: string; description: string; amount: number; currencyCode: string; expenseDate: string; paymentMethod: string | null; reference: string | null; createdBy: string }) {
  const supabase = await untyped();
  const { data, error } = await supabase.from("expenses").insert({
    organization_id: input.organizationId, facility_id: input.facilityId, category: input.category,
    description: input.description, amount: input.amount, currency_code: input.currencyCode,
    expense_date: input.expenseDate, payment_method: input.paymentMethod, reference: input.reference,
    created_by: input.createdBy,
  }).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function updateExpenseStatus(id: string, organizationId: string, status: string) {
  const supabase = await untyped();
  const { error } = await supabase.from("expenses").update({ status }).eq("id", id).eq("organization_id", organizationId);
  if (error) throw error;
}
