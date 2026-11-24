"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Permissions } from "@clinic/permissions";
import { safeServerMessage } from "@/server/errors";
import { logServerError } from "@/server/logging";
import { requirePermission } from "@/server/permissions/require-permission";
import { hasRolePermission } from "@/server/repositories/staff.repository";
import * as repo from "@/server/repositories/equipment.repository";

async function ctx(permission: import("@clinic/permissions").Permission) {
  const staff = await requirePermission(permission);
  return { orgId: staff.membership.organization_id, userId: staff.user.id, staff };
}

export async function getEquipmentData() {
  const { orgId, staff } = await ctx(Permissions.EQUIPMENT_READ);
  const items = await repo.listEquipment(orgId);
  const canManage = await hasRolePermission(staff.membership.role_id, Permissions.EQUIPMENT_MANAGE);
  return { items, canManage };
}

const equipmentSchema = z.object({
  facility_id: z.string().optional().or(z.literal("")), department_id: z.string().optional().or(z.literal("")),
  name: z.string().trim().min(1).max(200), category: z.string().trim().max(80).optional().or(z.literal("")),
  asset_tag: z.string().trim().max(60).optional().or(z.literal("")), serial_number: z.string().trim().max(80).optional().or(z.literal("")),
  purchase_date: z.string().optional().or(z.literal("")), warranty_expiry: z.string().optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export async function createEquipmentAction(_prev: unknown, formData: FormData) {
  try {
    const input = equipmentSchema.parse({
      facility_id: formData.get("facility_id") || "", department_id: formData.get("department_id") || "",
      name: formData.get("name"), category: formData.get("category") || "", asset_tag: formData.get("asset_tag") || "",
      serial_number: formData.get("serial_number") || "", purchase_date: formData.get("purchase_date") || "",
      warranty_expiry: formData.get("warranty_expiry") || "", notes: formData.get("notes") || "",
    });
    const { orgId, userId } = await ctx(Permissions.EQUIPMENT_MANAGE);
    await repo.createEquipment({
      organizationId: orgId, facilityId: input.facility_id || null, departmentId: input.department_id || null,
      name: input.name, category: input.category || null, assetTag: input.asset_tag || null,
      serialNumber: input.serial_number || null, purchaseDate: input.purchase_date || null,
      warrantyExpiry: input.warranty_expiry || null, notes: input.notes || null, createdBy: userId,
    });
    revalidatePath("/staff/equipment");
    return { success: true };
  } catch (error) {
    logServerError("equipment", "create-failed", error);
    return { error: safeServerMessage(error, "We couldn't register the equipment.") };
  }
}

const maintenanceSchema = z.object({
  equipment_id: z.string().uuid(), maintenance_type: z.enum(["scheduled", "repair", "calibration", "inspection"]),
  performed_by: z.string().trim().max(120).optional().or(z.literal("")), description: z.string().trim().min(1).max(2000),
  cost: z.coerce.number().min(0).optional().or(z.literal("")), next_due_date: z.string().optional().or(z.literal("")),
});

export async function logMaintenanceAction(_prev: unknown, formData: FormData) {
  try {
    const input = maintenanceSchema.parse({
      equipment_id: formData.get("equipment_id"), maintenance_type: formData.get("maintenance_type"),
      performed_by: formData.get("performed_by") || "", description: formData.get("description"),
      cost: formData.get("cost") || "", next_due_date: formData.get("next_due_date") || "",
    });
    const { orgId, userId } = await ctx(Permissions.EQUIPMENT_MANAGE);
    await repo.logMaintenance({
      organizationId: orgId, equipmentId: input.equipment_id, maintenanceType: input.maintenance_type,
      performedBy: input.performed_by || null, description: input.description,
      cost: input.cost === "" ? null : Number(input.cost), nextDueDate: input.next_due_date || null, createdBy: userId,
    });
    revalidatePath("/staff/equipment");
    return { success: true };
  } catch (error) {
    logServerError("equipment", "maintenance-failed", error);
    return { error: safeServerMessage(error, "We couldn't log the maintenance.") };
  }
}

export async function updateEquipmentStatusAction(_prev: unknown, formData: FormData) {
  try {
    const id = z.string().uuid().parse(formData.get("equipment_id"));
    const status = z.enum(["in_service", "under_maintenance", "out_of_service", "retired"]).parse(formData.get("status"));
    const { orgId } = await ctx(Permissions.EQUIPMENT_MANAGE);
    await repo.updateEquipmentStatus(id, orgId, status);
    revalidatePath("/staff/equipment");
    return { success: true };
  } catch (error) {
    logServerError("equipment", "status-failed", error);
    return { error: safeServerMessage(error, "We couldn't update the status.") };
  }
}
