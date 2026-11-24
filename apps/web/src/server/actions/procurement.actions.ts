"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { safeServerMessage } from "@/server/errors";
import { logServerError } from "@/server/logging";
import { approvePurchaseOrder, createPurchaseOrder, createSupplier, receivePoItem } from "@/server/services/procurement.service";

const poItemSchema = z.object({
  inventory_item_id: z.string().uuid().optional().or(z.literal("")),
  description: z.string().trim().min(1).max(300),
  quantity_ordered: z.coerce.number().positive(),
  unit_cost: z.coerce.number().min(0),
});

const poSchema = z.object({
  facility_id: z.string().uuid(),
  supplier_id: z.string().uuid(),
  expected_at: z.string().optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  items: z.array(poItemSchema).min(1).max(100),
});

export async function createPurchaseOrderAction(_prev: unknown, formData: FormData) {
  try {
    const raw = formData.get("items_json");
    let items: unknown[] = [];
    if (raw) { try { const parsed = JSON.parse(String(raw)); if (Array.isArray(parsed)) items = parsed; } catch { /* validation catches */ } }
    const input = poSchema.parse({ facility_id: formData.get("facility_id"), supplier_id: formData.get("supplier_id"), expected_at: formData.get("expected_at") || "", notes: formData.get("notes") || "", items });
    const id = await createPurchaseOrder({
      facilityId: input.facility_id, supplierId: input.supplier_id,
      expectedAt: input.expected_at || null, notes: input.notes || null,
      items: input.items.map((item) => ({ inventoryItemId: item.inventory_item_id || null, description: item.description, quantityOrdered: item.quantity_ordered, unitCost: item.unit_cost })),
    });
    revalidatePath("/staff/procurement");
    return { success: true, poId: id };
  } catch (error) {
    logServerError("procurement", "po-create-failed", error);
    return { error: safeServerMessage(error, "We couldn't create the purchase order.") };
  }
}

export async function approvePoAction(poId: string) {
  try {
    await approvePurchaseOrder(poId);
    revalidatePath("/staff/procurement");
    revalidatePath(`/staff/procurement/${poId}`);
    return { success: true };
  } catch (error) {
    logServerError("procurement", "po-approve-failed", error);
    return { error: safeServerMessage(error, "We couldn't approve the order.") };
  }
}

const receiveSchema = z.object({
  item_id: z.string().uuid(),
  quantity_received: z.coerce.number().positive(),
});

export async function receivePoItemAction(_prev: unknown, formData: FormData) {
  try {
    const input = receiveSchema.parse(Object.fromEntries(formData));
    await receivePoItem(input.item_id, input.quantity_received);
    revalidatePath("/staff/procurement");
    return { success: true };
  } catch (error) {
    logServerError("procurement", "receive-failed", error);
    return { error: safeServerMessage(error, "We couldn't record the receipt.") };
  }
}

const supplierSchema = z.object({
  name: z.string().trim().min(2).max(160),
  contact_person: z.string().trim().max(120).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  email: z.string().trim().email().optional().or(z.literal("")),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  payment_terms_days: z.coerce.number().int().min(0).max(365).default(30),
});

export async function createSupplierAction(_prev: unknown, formData: FormData) {
  try {
    const input = supplierSchema.parse(Object.fromEntries(formData));
    await createSupplier({
      name: input.name, contactPerson: input.contact_person || null, phone: input.phone || null,
      email: input.email || null, address: input.address || null, paymentTermsDays: input.payment_terms_days,
    });
    revalidatePath("/staff/procurement/suppliers");
    return { success: true };
  } catch (error) {
    logServerError("procurement", "supplier-create-failed", error);
    return { error: safeServerMessage(error, "We couldn't add the supplier.") };
  }
}
