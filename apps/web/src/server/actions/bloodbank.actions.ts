"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Permissions } from "@clinic/permissions";
import { safeServerMessage, ValidationError } from "@/server/errors";
import { logServerError } from "@/server/logging";
import { requirePermission } from "@/server/permissions/require-permission";
import { hasRolePermission } from "@/server/repositories/staff.repository";
import * as repo from "@/server/repositories/bloodbank.repository";

async function ctx(permission: import("@clinic/permissions").Permission) {
  const staff = await requirePermission(permission);
  return { orgId: staff.membership.organization_id, userId: staff.user.id, staff };
}

export async function getBloodBankData() {
  const { orgId, staff } = await ctx(Permissions.BLOODBANK_READ);
  const [units, transfusions] = await Promise.all([repo.listUnits(orgId), repo.listTransfusions(orgId)]);
  const canManage = await hasRolePermission(staff.membership.role_id, Permissions.BLOODBANK_MANAGE);
  return { units, transfusions, canManage };
}

const unitSchema = z.object({
  facility_id: z.string().optional().or(z.literal("")), unit_number: z.string().trim().min(1).max(40),
  blood_group: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]),
  component: z.enum(["whole_blood", "red_cells", "platelets", "plasma", "cryoprecipitate"]).optional().or(z.literal("")),
  volume_ml: z.coerce.number().min(0).optional().or(z.literal("")), donor_name: z.string().trim().max(200).optional().or(z.literal("")),
  collection_date: z.string().optional().or(z.literal("")), expiry_date: z.string().optional().or(z.literal("")), notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export async function createBloodUnitAction(_prev: unknown, formData: FormData) {
  try {
    const input = unitSchema.parse({
      facility_id: formData.get("facility_id") || "", unit_number: formData.get("unit_number"),
      blood_group: formData.get("blood_group"), component: formData.get("component") || "whole_blood",
      volume_ml: formData.get("volume_ml") || "", donor_name: formData.get("donor_name") || "",
      collection_date: formData.get("collection_date") || "", expiry_date: formData.get("expiry_date") || "", notes: formData.get("notes") || "",
    });
    const { orgId, userId } = await ctx(Permissions.BLOODBANK_MANAGE);
    await repo.createUnit({
      organizationId: orgId, facilityId: input.facility_id || null, unitNumber: input.unit_number,
      bloodGroup: input.blood_group, component: input.component || "whole_blood",
      volumeMl: input.volume_ml === "" ? null : Number(input.volume_ml), donorName: input.donor_name || null,
      collectionDate: input.collection_date || null, expiryDate: input.expiry_date || null, notes: input.notes || null, createdBy: userId,
    });
    revalidatePath("/staff/bloodbank");
    return { success: true };
  } catch (error) {
    logServerError("bloodbank", "unit-create-failed", error);
    return { error: safeServerMessage(error, "We couldn't register the unit.") };
  }
}

export async function updateBloodUnitStatusAction(_prev: unknown, formData: FormData) {
  try {
    const id = z.string().uuid().parse(formData.get("unit_id"));
    const status = z.enum(["available", "reserved", "issued", "discarded", "expired"]).parse(formData.get("status"));
    const { orgId } = await ctx(Permissions.BLOODBANK_MANAGE);
    await repo.updateUnitStatus(id, orgId, status);
    revalidatePath("/staff/bloodbank");
    return { success: true };
  } catch (error) {
    logServerError("bloodbank", "status-failed", error);
    return { error: safeServerMessage(error, "We couldn't update the unit.") };
  }
}

export async function recordTransfusionAction(_prev: unknown, formData: FormData) {
  try {
    const input = z.object({
      blood_unit_id: z.string().uuid(), patient_id: z.string().uuid(),
      encounter_id: z.string().optional().or(z.literal("")), reaction_notes: z.string().trim().max(1000).optional().or(z.literal("")),
    }).parse({ blood_unit_id: formData.get("blood_unit_id"), patient_id: formData.get("patient_id"), encounter_id: formData.get("encounter_id") || "", reaction_notes: formData.get("reaction_notes") || "" });
    const { orgId, userId } = await ctx(Permissions.BLOODBANK_MANAGE);
    await repo.recordTransfusion({ organizationId: orgId, bloodUnitId: input.blood_unit_id, patientId: input.patient_id, encounterId: input.encounter_id || null, reactionNotes: input.reaction_notes || null, createdBy: userId });
    if (input.encounter_id) {
      const { chargeFromCatalog } = await import("@/server/services/charge-hooks");
      const admin = (await import("@/lib/supabase/admin")).createAdminClient() as unknown as import("@supabase/supabase-js").SupabaseClient;
      const { data: enc } = await admin.from("encounters").select("facility_id").eq("id", input.encounter_id).eq("organization_id", orgId).maybeSingle();
      await chargeFromCatalog({ organizationId: orgId, encounterId: input.encounter_id, patientId: input.patient_id, facilityId: enc?.facility_id ?? null, category: "procedure", nameMatch: "transfusion", quantity: 1, actorId: userId, sourceType: "transfusion", sourceId: input.blood_unit_id, description: "Blood transfusion" });
    }
    revalidatePath("/staff/bloodbank");
    return { success: true };
  } catch (error) {
    logServerError("bloodbank", "transfusion-failed", error);
    return { error: safeServerMessage(error, "We couldn't record the transfusion.") };
  }
}
