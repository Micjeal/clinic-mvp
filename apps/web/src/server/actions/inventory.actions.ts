"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { safeServerMessage } from "@/server/errors";
import { logServerError } from "@/server/logging";
import { createInventoryItem, recordStockMovement } from "@/server/services/inventory.service";
import { requirePermission } from "@/server/permissions/require-permission";
import { Permissions } from "@clinic/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

const itemSchema = z.object({
  facility_id: z.string().uuid(),
  sku: z.string().trim().min(1).max(60),
  item_name: z.string().trim().min(2).max(200),
  unit: z.string().trim().min(1).max(40).default("unit"),
  on_hand_quantity: z.coerce.number().min(0).default(0),
  reorder_level: z.coerce.number().min(0).default(0),
  cost_price: z.coerce.number().min(0).default(0),
  selling_price: z.coerce.number().min(0).default(0),
});

export async function createInventoryItemAction(_prev: unknown, formData: FormData) {
  try {
    const input = itemSchema.parse(Object.fromEntries(formData));
    await createInventoryItem({
      facilityId: input.facility_id, sku: input.sku, itemName: input.item_name, unit: input.unit,
      onHandQuantity: input.on_hand_quantity, reorderLevel: input.reorder_level,
      costPrice: input.cost_price, sellingPrice: input.selling_price,
    });
    revalidatePath("/staff/inventory");
    return { success: true };
  } catch (error) {
    logServerError("inventory", "item-create-failed", error);
    return { error: safeServerMessage(error, "We couldn't create the item.") };
  }
}

const movementSchema = z.object({
  item_id: z.string().uuid(),
  movement_type: z.enum(["opening", "purchase", "adjustment_in", "adjustment_out", "dispense", "return", "transfer_in", "transfer_out", "waste"]),
  quantity: z.coerce.number().positive(),
  batch_number: z.string().trim().max(80).optional().or(z.literal("")),
  expiry_date: z.string().optional().or(z.literal("")),
  notes: z.string().trim().max(300).optional().or(z.literal("")),
});

export async function recordMovementAction(_prev: unknown, formData: FormData) {
  try {
    const input = movementSchema.parse(Object.fromEntries(formData));
    await recordStockMovement({
      itemId: input.item_id, movementType: input.movement_type, quantity: input.quantity,
      batchNumber: input.batch_number || null, expiryDate: input.expiry_date || null, notes: input.notes || null,
    });
    revalidatePath("/staff/inventory");
    revalidatePath(`/staff/inventory/${input.item_id}`);
    return { success: true };
  } catch (error) {
    logServerError("inventory", "movement-failed", error);
    return { error: safeServerMessage(error, "We couldn't record the movement.") };
  }
}

const CATALOG_FACILITY_NOTE = "essential-catalog";

export async function loadEssentialCatalogAction(_prev: unknown, formData: FormData) {
  try {
    const facilityId = z.string().uuid().parse(formData.get("facility_id"));
    const staff = await requirePermission(Permissions.INVENTORY_ADJUST);
    const orgId = staff.membership.organization_id;
    const admin = createAdminClient() as unknown as import("@supabase/supabase-js").SupabaseClient;
    const { data: existing } = await admin.from("inventory_items").select("sku").eq("organization_id", orgId).eq("facility_id", facilityId);
    const existingSkus = new Set((existing ?? []).map((row) => row.sku as string));
    const { ESSENTIAL_CATALOG } = await import("@/features/inventory/essential-catalog");
    const toInsert = ESSENTIAL_CATALOG.filter((item) => !existingSkus.has(item.sku)).map((item) => ({
      organization_id: orgId, facility_id: facilityId, department_id: null, medication_id: null,
      sku: item.sku, item_name: item.name, unit: item.unit,
      on_hand_quantity: 0, reorder_level: item.reorder, cost_price: item.cost, selling_price: item.price,
    }));
    if (toInsert.length) {
      const { error } = await admin.from("inventory_items").insert(toInsert);
      if (error) throw error;
    }
    revalidatePath("/staff/inventory");
    return { success: `${toInsert.length} catalog items added (${existingSkus.size ? `${ESSENTIAL_CATALOG.length - toInsert.length} already existed` : "all new"}).` };
  } catch (error) {
    logServerError("inventory", "catalog-load-failed", error);
    return { error: safeServerMessage(error, "Unable to load the catalog.") };
  }
}

const updateItemSchema = z.object({
  id: z.string().uuid(), facility_id: z.string().uuid(),
  sku: z.string().trim().min(1).max(60), item_name: z.string().trim().min(2).max(200),
  unit: z.string().trim().min(1).max(40), reorder_level: z.coerce.number().min(0),
  cost_price: z.coerce.number().min(0), selling_price: z.coerce.number().min(0),
});

export async function updateInventoryItemAction(_prev: unknown, formData: FormData) {
  try {
    const input = updateItemSchema.parse(Object.fromEntries(formData));
    const { updateInventoryItemDetails } = await import("@/server/services/inventory.service");
    await updateInventoryItemDetails({
      id: input.id, facilityId: input.facility_id, sku: input.sku, itemName: input.item_name,
      unit: input.unit, reorderLevel: input.reorder_level, costPrice: input.cost_price,
      sellingPrice: input.selling_price, isActive: formData.get("is_active") === "true",
    });
    revalidatePath("/staff/inventory");
    return { success: true };
  } catch (error) {
    logServerError("inventory", "item-update-failed", error);
    return { error: safeServerMessage(error, "Unable to update the item.") };
  }
}
