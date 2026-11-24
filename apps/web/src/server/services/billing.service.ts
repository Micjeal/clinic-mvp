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
  const invoiceId = await repo.createInvoice({
    organizationId: orgId,
    facilityId: input.facilityId,
    patientId: input.patientId,
    invoiceNumber,
    currencyCode: input.currencyCode || "UGX",
    subtotal,
    total: subtotal,
    items,
  });
  return invoiceId;
}

export async function issueBillingInvoice(invoiceId: string) {
  const staff = await requirePermission(Permissions.BILLING_INVOICE_CREATE);
  const orgId = staff.membership.organization_id;
  const invoice = await repo.findInvoice(invoiceId, orgId);
  if (!invoice) throw new NotFoundError("Invoice not found");
  if (invoice.status !== "draft") throw new ValidationError("Only draft invoices can be issued.");
  await repo.updateInvoiceStatus(invoiceId, orgId, { status: "issued", issued_at: new Date().toISOString() });
  return invoiceId;
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
