"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { safeServerMessage } from "@/server/errors";
import { logServerError } from "@/server/logging";
import {
  createBillingInvoice,
  issueBillingInvoice,
  recordBillingPayment,
  voidBillingInvoice,
} from "@/server/services/billing.service";

const itemSchema = z.object({
  description: z.string().trim().min(1).max(300),
  quantity: z.coerce.number().positive().max(9999),
  unit_price: z.coerce.number().min(0).max(999999999),
  service_id: z.string().uuid().optional().nullable().or(z.literal("")),
});

const createSchema = z.object({
  facility_id: z.string().uuid(),
  patient_id: z.string().uuid(),
  currency_code: z.string().trim().length(3).toUpperCase().optional(),
  items: z.array(itemSchema).min(1).max(100),
});

export async function createInvoiceAction(_prev: unknown, formData: FormData) {
  try {
    let rawItems: unknown[] = [];
    const itemsJson = formData.get("items_json");
    if (itemsJson) {
      try { const parsed = JSON.parse(String(itemsJson)); if (Array.isArray(parsed)) rawItems = parsed; } catch { /* fall through to validation error */ }
    }
    const input = createSchema.parse({
      facility_id: formData.get("facility_id"),
      patient_id: formData.get("patient_id"),
      currency_code: formData.get("currency_code") || undefined,
      items: rawItems,
    });
    const invoiceId = await createBillingInvoice({
      facilityId: input.facility_id,
      patientId: input.patient_id,
      currencyCode: input.currency_code,
      items: input.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        serviceId: item.service_id || null,
      })),
    });
    revalidatePath("/staff/billing");
    return { success: true, invoiceId };
  } catch (error) {
    logServerError("billing", "invoice-create-failed", error);
    return { error: safeServerMessage(error, "We couldn't create the invoice.") };
  }
}

export async function issueInvoiceAction(invoiceId: string) {
  try {
    await issueBillingInvoice(invoiceId);
    revalidatePath("/staff/billing");
    revalidatePath(`/staff/billing/${invoiceId}`);
    return { success: true };
  } catch (error) {
    logServerError("billing", "invoice-issue-failed", error);
    return { error: safeServerMessage(error, "We couldn't issue the invoice.") };
  }
}

export async function voidInvoiceAction(invoiceId: string) {
  try {
    await voidBillingInvoice(invoiceId);
    revalidatePath("/staff/billing");
    revalidatePath(`/staff/billing/${invoiceId}`);
    return { success: true };
  } catch (error) {
    logServerError("billing", "invoice-void-failed", error);
    return { error: safeServerMessage(error, "We couldn't void the invoice.") };
  }
}

const paymentSchema = z.object({
  invoice_id: z.string().uuid(),
  amount: z.coerce.number().positive(),
  payment_method: z.enum(["cash", "card", "mobile_money", "bank_transfer", "insurance", "other"]),
});

export async function recordPaymentAction(_prev: unknown, formData: FormData) {
  try {
    const input = paymentSchema.parse(Object.fromEntries(formData));
    await recordBillingPayment({ invoiceId: input.invoice_id, amount: input.amount, paymentMethod: input.payment_method });
    revalidatePath("/staff/billing");
    revalidatePath(`/staff/billing/${input.invoice_id}`);
    return { success: true };
  } catch (error) {
    logServerError("billing", "payment-record-failed", error);
    return { error: safeServerMessage(error, "We couldn't record the payment.") };
  }
}
