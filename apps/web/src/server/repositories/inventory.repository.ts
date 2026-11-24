import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { TablesInsert } from "@clinic/database";

export async function listInventoryItems(organizationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("inventory_items").select("*,facilities!inventory_items_facility_id_fkey(id,name),medications!inventory_items_medication_id_fkey(id,generic_name,brand_name)").eq("organization_id", organizationId).eq("is_active", true).order("item_name");
  if (error) throw error;
  return data ?? [];
}

export async function findInventoryItem(id: string, organizationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("inventory_items").select("*,facilities!inventory_items_facility_id_fkey(id,name),medications!inventory_items_medication_id_fkey(id,generic_name,brand_name)").eq("id", id).eq("organization_id", organizationId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function listStockMovements(organizationId: string, itemId?: string) {
  const supabase = await createClient();
  let query = supabase.from("stock_movements").select("*,profiles!stock_movements_created_by_fkey(full_name)").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(100);
  if (itemId) query = query.eq("inventory_item_id", itemId);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function createInventoryItem(input: {
  organizationId: string; facilityId: string; departmentId: string | null; medicationId: string | null;
  sku: string; itemName: string; unit: string; onHandQuantity: number; reorderLevel: number; costPrice: number; sellingPrice: number;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("inventory_items").insert({
    organization_id: input.organizationId, facility_id: input.facilityId, department_id: input.departmentId,
    medication_id: input.medicationId, sku: input.sku, item_name: input.itemName, unit: input.unit,
    on_hand_quantity: input.onHandQuantity, reorder_level: input.reorderLevel,
    cost_price: input.costPrice, selling_price: input.sellingPrice,
  } satisfies TablesInsert<"inventory_items">).select("id").single();
  if (error) throw error;
  return data.id;
}

export async function adjustItemQuantity(itemId: string, organizationId: string, delta: number) {
  const supabase = await createClient();
  const { data: item, error: readError } = await supabase.from("inventory_items").select("on_hand_quantity").eq("id", itemId).eq("organization_id", organizationId).single();
  if (readError) throw readError;
  const next = Math.max(0, Number(item.on_hand_quantity) + delta);
  const { error: updateError } = await supabase.from("inventory_items").update({ on_hand_quantity: next }).eq("id", itemId).eq("organization_id", organizationId);
  if (updateError) throw updateError;
}

export async function insertStockMovement(input: {
  organizationId: string; facilityId: string; itemId: string; movementType: string; quantity: number;
  batchNumber: string | null; expiryDate: string | null; notes: string | null; createdBy: string | null;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("stock_movements").insert({
    organization_id: input.organizationId, facility_id: input.facilityId, inventory_item_id: input.itemId,
    movement_type: input.movementType as TablesInsert<"stock_movements">["movement_type"],
    quantity: input.quantity, batch_number: input.batchNumber, expiry_date: input.expiryDate,
    notes: input.notes, created_by: input.createdBy,
  } satisfies TablesInsert<"stock_movements">);
  if (error) throw error;
}

export async function listOrgFacilities(organizationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("facilities").select("id,name").eq("organization_id", organizationId).eq("is_active", true).order("name");
  if (error) throw error;
  return data ?? [];
}
