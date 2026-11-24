import "server-only";
import { Permissions } from "@clinic/permissions";
import { NotFoundError, ValidationError } from "@/server/errors";
import { requirePermission } from "@/server/permissions/require-permission";
import * as repo from "@/server/repositories/procurement.repository";

async function orgContext(permission: import("@clinic/permissions").Permission) {
  const staff = await requirePermission(permission);
  return { orgId: staff.membership.organization_id, userId: staff.user.id };
}

export async function listProcurement() {
  const { orgId } = await orgContext(Permissions.PROCUREMENT_READ);
  const [pos, suppliers] = await Promise.all([repo.listPurchaseOrders(orgId), repo.listSuppliers(orgId)]);
  return { pos, suppliers };
}

export async function getPurchaseOrder(id: string) {
  const { orgId } = await orgContext(Permissions.PROCUREMENT_READ);
  const po = await repo.findPurchaseOrder(id, orgId);
  if (!po) throw new NotFoundError("Purchase order not found");
  return po;
}

export async function getPoFormData() {
  const { orgId } = await orgContext(Permissions.PROCUREMENT_MANAGE);
  const [suppliers, items, facilities] = await Promise.all([repo.listSuppliers(orgId), repo.listInventoryItems(orgId), repo.listFacilities(orgId)]);
  return { suppliers, items, facilities };
}

export async function createPurchaseOrder(input: { facilityId: string; supplierId: string; expectedAt: string | null; notes: string | null; items: { inventoryItemId: string | null; description: string; quantityOrdered: number; unitCost: number }[] }) {
  const { orgId, userId } = await orgContext(Permissions.PROCUREMENT_MANAGE);
  if (!input.items.length) throw new ValidationError("Add at least one line item.");
  const poNumber = await repo.nextPoNumber(orgId);
  return repo.createPurchaseOrder({ ...input, organizationId: orgId, poNumber, createdBy: userId });
}

export async function approvePurchaseOrder(poId: string) {
  const { orgId, userId } = await orgContext(Permissions.PROCUREMENT_APPROVE);
  const po = await repo.findPurchaseOrder(poId, orgId);
  if (!po) throw new NotFoundError("Purchase order not found");
  if (po.status !== "submitted" && po.status !== "draft") throw new ValidationError("Only submitted orders can be approved.");
  await repo.updatePurchaseOrder(poId, orgId, { status: "approved", approved_by: userId, approved_at: new Date().toISOString() });
}

export async function receivePoItem(itemId: string, quantityReceived: number) {
  const { orgId, userId } = await orgContext(Permissions.PROCUREMENT_MANAGE);
  const item = await repo.findPoItem(itemId, orgId);
  if (!item) throw new NotFoundError("Order item not found");
  const po = item.purchase_orders as { status?: string; facility_id?: string; organization_id?: string };
  if (!["approved", "partially_received"].includes(po?.status ?? "")) throw new ValidationError("Receive against approved orders only.");
  const ordered = Number(item.quantity_ordered);
  const already = Number(item.quantity_received);
  if (quantityReceived <= already || quantityReceived > ordered) throw new ValidationError(`Enter a received quantity between ${already} and ${ordered}.`);
  await repo.updatePoItemReceived(itemId, quantityReceived);
  const delta = quantityReceived - already;
  if (item.inventory_item_id) {
    await repo.adjustItemQuantity(item.inventory_item_id, orgId, delta);
    await repo.insertStockMovement({ organizationId: orgId, facilityId: po.facility_id!, itemId: item.inventory_item_id, quantity: delta, notes: `PO receipt`, createdBy: userId });
  }
  const allItems = (await repo.findPurchaseOrder((item.purchase_orders as { id?: string })?.id ?? "", orgId))?.purchase_order_items ?? [];
  const fullyReceived = (allItems as { quantity_ordered: number; quantity_received: number }[]).every((row) => Number(row.quantity_received) >= Number(row.quantity_ordered));
  const anyReceived = (allItems as { quantity_received: number }[]).some((row) => Number(row.quantity_received) > 0);
  const poId = (item.purchase_orders as { id?: string })?.id;
  if (poId) await repo.updatePurchaseOrder(poId, orgId, { status: fullyReceived ? "received" : anyReceived ? "partially_received" : po?.status });
}

export async function listSuppliersOnly() {
  const { orgId } = await orgContext(Permissions.PROCUREMENT_READ);
  return repo.listSuppliers(orgId);
}

export async function createSupplier(input: { name: string; contactPerson: string | null; phone: string | null; email: string | null; address: string | null; paymentTermsDays: number }) {
  const { orgId } = await orgContext(Permissions.PROCUREMENT_MANAGE);
  if (!input.name.trim()) throw new ValidationError("Supplier name is required.");
  return repo.createSupplier({ ...input, organizationId: orgId });
}
