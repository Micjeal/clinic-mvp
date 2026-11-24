import "server-only";
import { Permissions } from "@clinic/permissions";
import { NotFoundError, ValidationError } from "@/server/errors";
import { requirePermission } from "@/server/permissions/require-permission";
import * as repo from "@/server/repositories/billing.repository";

export async function getBillingContext(permission: import("@clinic/permissions").Permission = Permissions.BILLING_READ) {
  const staff = await requirePermission(permission);
  return staff.membership.organization_id;
}

export async function listBillingInvoices() {
  const orgId = await getBillingContext();
  return repo.listInvoices(orgId);
}

export async function getBillingInvoice(id: string) {
  const orgId = await getBillingContext();
  const [invoice, payments] = await Promise.all([repo.findInvoice(id, orgId), repo.listInvoicePayments(id)]);
  if (!invoice) throw new NotFoundError("Invoice not found");
  return { invoice, payments };
}

export async function getBillingFormData() {
  const orgId = await getBillingContext(Permissions.BILLING_INVOICE_CREATE);
  const [patients, facilities] = await Promise.all([repo.listPatientsForBilling(orgId), repo.listOrgFacilities(orgId)]);
  return { patients, facilities };
}

async function nextInvoiceNumber(organizationId: string) {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const supabase = (await import("@/lib/supabase/server")).createClient;
  return prefix; // numbering handled by count query below
}

export async function createBillingInvoice(input: {
  facilityId: string;
  patientId: string;
  currencyCode?: string;
  items: { description: string; quantity: number; unitPrice: number; serviceId?: string | null }[];
}) {
  const staff = await requirePermission(Permissions.BILLING_INVOICE_CREATE);
  const orgId = staff.membership.organization_id;
  if (!input.items.length) throw new ValidationError("Add at least one line item.");
  const items = input.items.map((item) => {
    const lineTotal = Math.round(item.quantity * item.unitPrice * 100) / 100;
    return { ...item, lineTotal };
  });
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { count } = await supabase.from("invoices").select("id", { count: "exact", head: true }).eq("organization_id", orgId);
  const invoiceNumber = `INV-${new Date().getFullYear()}-${String((count ?? 0) + 1).padStart(5, "0")}`;
  const created = await repo.createInvoice({
    organizationId: orgId,
    facilityId: input.facilityId,
    patientId: input.patientId,
    invoiceNumber,
    currencyCode: input.currencyCode || "UGX",
    subtotal,
    total: subtotal,
    items,
  });
  return created.invoiceId;
}

export async function issueBillingInvoice(invoiceId: string) {
  const staff = await requirePermission(Permissions.BILLING_INVOICE_CREATE);
  const orgId = staff.membership.organization_id;
  const invoice = await repo.findInvoice(invoiceId, orgId);
  if (!invoice) throw new NotFoundError("Invoice not found");
  if (invoice.status !== "draft") throw new ValidationError("Only draft invoices can be issued.");
  await repo.updateInvoiceStatus(invoiceId, orgId, { status: "issued", issued_at: new Date().toISOString() });
  await autoCreateInsuranceClaim(invoice, orgId, staff.user.id);
  return invoiceId;
}

async function autoCreateInsuranceClaim(invoice: { id: string; patient_id: string; facility_id: string | null; total: number; currency_code: string }, orgId: string, actorId: string) {
  try {
    const admin = (await import("@/lib/supabase/admin")).createAdminClient() as unknown as import("@supabase/supabase-js").SupabaseClient;
    const { data: existing } = await admin.from("insurance_claims").select("id").eq("invoice_id", invoice.id).limit(1);
    if (existing?.length) return;
    const { data: policy } = await admin.from("patient_insurance_policies").select("id,insurance_scheme_id,coverage_percent,insurance_schemes(name)").eq("patient_id", invoice.patient_id).eq("organization_id", orgId).eq("status", "active").limit(1).maybeSingle();
    if (!policy?.insurance_scheme_id || !invoice.facility_id) return;
    const { count } = await admin.from("insurance_claims").select("id", { count: "exact", head: true }).eq("organization_id", orgId);
    const claimNumber = `CLM-${new Date().getFullYear()}-${String((count ?? 0) + 1).padStart(5, "0")}`;
    const scheme = policy.insurance_schemes as { name?: string } | null;
    const { error } = await admin.from("insurance_claims").insert({
      organization_id: orgId, facility_id: invoice.facility_id, patient_id: invoice.patient_id,
      invoice_id: invoice.id, insurance_scheme_id: policy.insurance_scheme_id, policy_id: policy.id,
      claim_number: claimNumber, claimed_amount: Number(invoice.total), currency_code: invoice.currency_code,
      diagnosis_summary: null, notes: `Auto-created on invoice issue${scheme?.name ? ` — ${scheme.name}` : ""}`,
      status: "submitted", submitted_at: new Date().toISOString(), created_by: actorId,
    });
    if (error && error.code !== "23505") throw error;
  } catch { /* auto-claim must never block invoicing */ }
}

export async function voidBillingInvoice(invoiceId: string) {
  const staff = await requirePermission(Permissions.BILLING_INVOICE_CREATE);
  const orgId = staff.membership.organization_id;
  const invoice = await repo.findInvoice(invoiceId, orgId);
  if (!invoice) throw new NotFoundError("Invoice not found");
  if (invoice.status === "paid" || invoice.status === "void") throw new ValidationError("This invoice cannot be voided.");
  await repo.updateInvoiceStatus(invoiceId, orgId, { status: "void" });
  return invoiceId;
}

export async function recordBillingPayment(input: {
  invoiceId: string;
  amount: number;
  paymentMethod: string;
}) {
  const staff = await requirePermission(Permissions.BILLING_PAYMENT_CREATE);
  const orgId = staff.membership.organization_id;
  const invoice = await repo.findInvoice(input.invoiceId, orgId);
  if (!invoice) throw new NotFoundError("Invoice not found");
  if (invoice.status === "draft" || invoice.status === "void" || invoice.status === "refunded") {
    throw new ValidationError("Payments can only be recorded on issued invoices.");
  }
  if (input.amount <= 0) throw new ValidationError("Payment amount must be greater than zero.");
  const newBalance = Math.round((invoice.balance - input.amount) * 100) / 100;
  if (newBalance < -0.005) throw new ValidationError("Payment exceeds the outstanding balance.");
  await repo.insertPayment({
    organizationId: orgId,
    facilityId: invoice.facility_id,
    invoiceId: invoice.id,
    patientId: invoice.patient_id,
    amount: input.amount,
    currencyCode: invoice.currency_code,
    paymentMethod: input.paymentMethod,
    receivedBy: staff.user.id,
  });
  const status = newBalance <= 0.005 ? "paid" : "partially_paid";
  await repo.updateInvoiceStatus(invoice.id, orgId, { balance: Math.max(0, newBalance), status });
  return invoice.id;
}

export async function listUnbilledCharges() {
  const staff = await requirePermission(Permissions.BILLING_READ);
  const orgId = staff.membership.organization_id;
  const supabase = (await (await import("@/lib/supabase/server")).createClient()) as unknown as import("@supabase/supabase-js").SupabaseClient;
  const { data, error } = await supabase.from("encounter_charges").select("*,patients!encounter_charges_patient_id_fkey(id,first_name,last_name,patient_number)").eq("organization_id", orgId).eq("status", "pending").order("created_at", { ascending: false }).limit(300);
  if (error) throw error;
  return data ?? [];
}

export async function createInvoiceFromCharges(input: { chargeIds: string[]; facilityId: string }) {
  const staff = await requirePermission(Permissions.BILLING_INVOICE_CREATE);
  const orgId = staff.membership.organization_id;
  const chargeRepo = await import("@/server/repositories/charge.repository");
  const charges = await chargeRepo.findPendingChargesByIds(input.chargeIds, orgId);
  if (!charges.length) throw new ValidationError("No pending charges selected.");
  const byPatient = new Map<string, typeof charges>();
  for (const charge of charges) {
    const key = charge.patient_id as string;
    byPatient.set(key, [...(byPatient.get(key) ?? []), charge]);
  }
  const invoiceIds: string[] = [];
  for (const [patientId, patientCharges] of byPatient) {
    const facilityId = (patientCharges[0].facility_id as string | null) ?? input.facilityId;
    const items = patientCharges.map((charge) => ({
      description: charge.description as string,
      quantity: Number(charge.quantity),
      unitPrice: Number(charge.unit_price),
      lineTotal: Number(charge.total),
    }));
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { count } = await supabase.from("invoices").select("id", { count: "exact", head: true }).eq("organization_id", orgId);
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String((count ?? 0) + 1).padStart(5, "0")}`;
    const created = await repo.createInvoice({
      organizationId: orgId, facilityId, patientId, invoiceNumber,
      currencyCode: (patientCharges[0].currency_code as string) ?? "UGX",
      subtotal, total: subtotal, items,
    });
    const itemIds = created.itemIds;
    const chargeItemMap: Record<string, string> = {};
    patientCharges.forEach((charge, index) => { chargeItemMap[charge.id as string] = itemIds[index] ?? ""; });
    await chargeRepo.markChargesInvoiced(patientCharges.map((c) => c.id as string), chargeItemMap, orgId);
    invoiceIds.push(created.invoiceId);
  }
  return invoiceIds;
}
