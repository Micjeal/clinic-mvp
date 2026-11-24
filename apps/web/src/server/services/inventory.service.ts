import "server-only";
import { Permissions } from "@clinic/permissions";
import { NotFoundError, ValidationError } from "@/server/errors";
import { requirePermission } from "@/server/permissions/require-permission";
import * as repo from "@/server/repositories/inventory.repository";

const IN_TYPES = new Set(["opening", "purchase", "adjustment_in", "return", "transfer_in"]);
const OUT_TYPES = new Set(["adjustment_out", "dispense", "transfer_out", "waste"]);

async function orgContext(permission: import("@clinic/permissions").Permission) {
  const staff = await requirePermission(permission);
  return { orgId: staff.membership.organization_id, userId: staff.user.id };
}

export async function listInventory() {
  const { orgId } = await orgContext(Permissions.INVENTORY_READ);
  const [items, movements] = await Promise.all([repo.listInventoryItems(orgId), repo.listStockMovements(orgId)]);
  return { items, movements };
}

export async function getInventoryItem(id: string) {
  const { orgId } = await orgContext(Permissions.INVENTORY_READ);
  const [item, movements] = await Promise.all([repo.findInventoryItem(id, orgId), repo.listStockMovements(orgId, id)]);
  if (!item) throw new NotFoundError("Inventory item not found");
  return { item, movements };
}

export async function getInventoryForm() {
  const { orgId } = await orgContext(Permissions.INVENTORY_ADJUST);
  const facilities = await repo.listOrgFacilities(orgId);
  return { facilities };
}

export async function createInventoryItem(input: {
  facilityId: string; sku: string; itemName: string; unit: string;
  onHandQuantity: number; reorderLevel: number; costPrice: number; sellingPrice: number;
}) {
  const { orgId } = await orgContext(Permissions.INVENTORY_ADJUST);
  if (!input.sku.trim() || !input.itemName.trim()) throw new ValidationError("SKU and item name are required.");
  const id = await repo.createInventoryItem({ ...input, organizationId: orgId, departmentId: null, medicationId: null });
  if (input.onHandQuantity > 0) {
    await repo.insertStockMovement({ organizationId: orgId, facilityId: input.facilityId, itemId: id, movementType: "opening", quantity: input.onHandQuantity, batchNumber: null, expiryDate: null, notes: "Opening stock", createdBy: null });
  }
  return id;
}

export async function recordStockMovement(input: {
  itemId: string; movementType: string; quantity: number; batchNumber: string | null; expiryDate: string | null; notes: string | null;
}) {
  const { orgId, userId } = await orgContext(Permissions.INVENTORY_ADJUST);
  if (!IN_TYPES.has(input.movementType) && !OUT_TYPES.has(input.movementType)) throw new ValidationError("Invalid movement type.");
  if (input.quantity <= 0) throw new ValidationError("Quantity must be greater than zero.");
  const item = await repo.findInventoryItem(input.itemId, orgId);
  if (!item) throw new NotFoundError("Inventory item not found");
  const delta = IN_TYPES.has(input.movementType) ? input.quantity : -input.quantity;
  if (Number(item.on_hand_quantity) + delta < 0) throw new ValidationError("Insufficient stock for this movement.");
  await repo.adjustItemQuantity(input.itemId, orgId, delta);
  await repo.insertStockMovement({
    organizationId: orgId, facilityId: item.facility_id, itemId: input.itemId,
    movementType: input.movementType, quantity: input.quantity,
    batchNumber: input.batchNumber, expiryDate: input.expiryDate, notes: input.notes, createdBy: userId,
  });
  return input.itemId;
}
