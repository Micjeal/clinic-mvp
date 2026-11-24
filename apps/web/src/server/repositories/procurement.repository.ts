import "server-only";
import { createClient } from "@/lib/supabase/server";

const untyped = async () => (await createClient()) as unknown as import("@supabase/supabase-js").SupabaseClient;

export async function listSuppliers(organizationId: string): Promise<any[]> {
  const supabase = await untyped();
  const { data, error } = await supabase.from("suppliers").select("*").eq("organization_id", organizationId).eq("is_active", true).order("name");
  if (error) throw error;
  return data ?? [];
}

export async function listPurchaseOrders(organizationId: string): Promise<any[]> {
  const supabase = await untyped();
  const { data, error } = await supabase.from("purchase_orders").select("*,suppliers(id,name),facilities!purchase_orders_facility_id_fkey(id,name),purchase_order_items(id,description,quantity_ordered,quantity_received,unit_cost,inventory_item_id)").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(200);
  if (error) throw error;
  return data ?? [];
}

export async function findPurchaseOrder(id: string, organizationId: string): Promise<any> {
  const supabase = await untyped();
  const { data, error } = await supabase.from("purchase_orders").select("*,suppliers(id,name,contact_person,phone,email,payment_terms_days),facilities!purchase_orders_facility_id_fkey(id,name),purchase_order_items(id,description,quantity_ordered,quantity_received,unit_cost,inventory_item_id,inventory_items!purchase_order_items_inventory_item_id_fkey(id,sku,item_name,unit))").eq("id", id).eq("organization_id", organizationId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function listInventoryItems(organizationId: string): Promise<any[]> {
  const supabase = await untyped();
  const { data, error } = await supabase.from("inventory_items").select("id,sku,item_name,unit").eq("organization_id", organizationId).eq("is_active", true).order("item_name");
  if (error) throw error;
  return data ?? [];
}

export async function listFacilities(organizationId: string): Promise<any[]> {
  const supabase = await untyped();
  const { data, error } = await supabase.from("facilities").select("id,name").eq("organization_id", organizationId).eq("is_active", true).order("name");
  if (error) throw error;
  return data ?? [];
}

export async function nextPoNumber(organizationId: string): Promise<string> {
  const supabase = await untyped();
  const { count } = await supabase.from("purchase_orders").select("id", { count: "exact", head: true }).eq("organization_id", organizationId);
  return `PO-${new Date().getFullYear()}-${String((count ?? 0) + 1).padStart(5, "0")}`;
}

export async function createPurchaseOrder(input: { organizationId: string; facilityId: string; supplierId: string; poNumber: string; expectedAt: string | null; notes: string | null; createdBy: string; items: { inventoryItemId: string | null; description: string; quantityOrdered: number; unitCost: number }[] }) {
  const supabase = await untyped();
  const { data: po, error } = await supabase.from("purchase_orders").insert({
    organization_id: input.organizationId, facility_id: input.facilityId, supplier_id: input.supplierId,
    po_number: input.poNumber, expected_at: input.expectedAt, notes: input.notes, created_by: input.createdBy, status: "submitted",
  }).select("id").single();
  if (error) throw error;
  const { error: itemsError } = await supabase.from("purchase_order_items").insert(
    input.items.map((item) => ({ purchase_order_id: po.id, inventory_item_id: item.inventoryItemId, description: item.description, quantity_ordered: item.quantityOrdered, unit_cost: item.unitCost })),
  );
  if (itemsError) throw itemsError;
  return po.id;
}

export async function findPoItem(itemId: string, organizationId: string): Promise<any> {
  const supabase = await untyped();
  const { data, error } = await supabase.from("purchase_order_items").select("*,purchase_orders!inner(organization_id,status,facility_id)").eq("id", itemId).eq("purchase_orders.organization_id", organizationId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function updatePoItemReceived(itemId: string, quantityReceived: number) {
  const supabase = await untyped();
  const { error } = await supabase.from("purchase_order_items").update({ quantity_received: quantityReceived }).eq("id", itemId);
  if (error) throw error;
}

export async function updatePurchaseOrder(id: string, organizationId: string, patch: Record<string, unknown>) {
  const supabase = await untyped();
  const { error } = await supabase.from("purchase_orders").update(patch).eq("id", id).eq("organization_id", organizationId);
  if (error) throw error;
}

export async function adjustItemQuantity(itemId: string, organizationId: string, delta: number) {
  const supabase = await untyped();
  const { data: item, error: readError } = await supabase.from("inventory_items").select("on_hand_quantity").eq("id", itemId).eq("organization_id", organizationId).single();
  if (readError) throw readError;
  const next = Math.max(0, Number(item.on_hand_quantity) + delta);
  const { error } = await supabase.from("inventory_items").update({ on_hand_quantity: next }).eq("id", itemId).eq("organization_id", organizationId);
  if (error) throw error;
}

export async function insertStockMovement(input: { organizationId: string; facilityId: string; itemId: string; quantity: number; notes: string | null; createdBy: string | null }) {
  const supabase = await untyped();
  const { error } = await supabase.from("stock_movements").insert({
    organization_id: input.organizationId, facility_id: input.facilityId, inventory_item_id: input.itemId,
    movement_type: "purchase", quantity: input.quantity, notes: input.notes, created_by: input.createdBy,
  });
  if (error) throw error;
}

export async function createSupplier(input: { organizationId: string; name: string; contactPerson: string | null; phone: string | null; email: string | null; address: string | null; paymentTermsDays: number }) {
  const supabase = await untyped();
  const { data, error } = await supabase.from("suppliers").insert({
    organization_id: input.organizationId, name: input.name, contact_person: input.contactPerson,
    phone: input.phone, email: input.email, address: input.address, payment_terms_days: input.paymentTermsDays,
  }).select("id").single();
  if (error) throw error;
  return data.id;
}
