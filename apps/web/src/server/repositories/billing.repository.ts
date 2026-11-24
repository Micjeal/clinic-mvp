import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Tables, TablesInsert } from "@clinic/database";

export type InvoiceRow = Tables<"invoices">;
export type InvoiceItemRow = Tables<"invoice_items">;
export type PaymentRow = Tables<"payments">;

const INVOICE_SELECT = "*,patients!invoices_patient_id_fkey(id,first_name,last_name,patient_number),facilities!invoices_facility_id_fkey(id,name),invoice_items(id,description,quantity,unit_price,discount_amount,line_total,service_id)";

export async function listInvoices(organizationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("invoices").select(INVOICE_SELECT).eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(200);
  if (error) throw error;
  return data ?? [];
}

export async function findInvoice(invoiceId: string, organizationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("invoices").select(INVOICE_SELECT).eq("id", invoiceId).eq("organization_id", organizationId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function listInvoicePayments(invoiceId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("payments").select("*").eq("invoice_id", invoiceId).order("paid_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createInvoice(input: {
  organizationId: string;
  facilityId: string;
  patientId: string;
  invoiceNumber: string;
  currencyCode: string;
  subtotal: number;
  total: number;
  items: { description: string; quantity: number; unitPrice: number; lineTotal: number; serviceId?: string | null }[];
}) {
  const supabase = await createClient();
  const invoiceInsert: TablesInsert<"invoices"> = {
    organization_id: input.organizationId,
    facility_id: input.facilityId,
    patient_id: input.patientId,
    invoice_number: input.invoiceNumber,
    status: "draft",
    currency_code: input.currencyCode,
    subtotal: input.subtotal,
    total: input.total,
    balance: input.total,
  };
  const { data: invoice, error } = await supabase.from("invoices").insert(invoiceInsert).select("id").single();
  if (error) throw error;
  const itemRows = input.items.map((item) => ({
    invoice_id: invoice.id,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    line_total: item.lineTotal,
    service_id: item.serviceId ?? null,
  }));
  const { error: itemsError } = await supabase.from("invoice_items").insert(itemRows);
  if (itemsError) throw itemsError;
  return invoice.id;
}

export async function updateInvoiceStatus(invoiceId: string, organizationId: string, patch: Partial<Pick<InvoiceRow, "status" | "balance" | "issued_at" | "subtotal" | "total" | "discount_total" | "tax_total">>) {
  const supabase = await createClient();
  const { error } = await supabase.from("invoices").update(patch).eq("id", invoiceId).eq("organization_id", organizationId);
  if (error) throw error;
}

export async function insertPayment(input: {
  organizationId: string;
  facilityId: string;
  invoiceId: string;
  patientId: string;
  amount: number;
  currencyCode: string;
  paymentMethod: string;
  receivedBy: string;
}) {
  const supabase = await createClient();
  const row: TablesInsert<"payments"> = {
    organization_id: input.organizationId,
    facility_id: input.facilityId,
    invoice_id: input.invoiceId,
    patient_id: input.patientId,
    amount: input.amount,
    currency_code: input.currencyCode,
    payment_method: input.paymentMethod as TablesInsert<"payments">["payment_method"],
    status: "completed",
    received_by: input.receivedBy,
  };
  const { data, error } = await supabase.from("payments").insert(row).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function listPatientsForBilling(organizationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("patients").select("id,first_name,last_name,patient_number").eq("organization_id", organizationId).order("last_name").limit(500);
  if (error) throw error;
  return data ?? [];
}

export async function listOrgFacilities(organizationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("facilities").select("id,name,timezone").eq("organization_id", organizationId).eq("is_active", true).order("name");
  if (error) throw error;
  return data ?? [];
}
