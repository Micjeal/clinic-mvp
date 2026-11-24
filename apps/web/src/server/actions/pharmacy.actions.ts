"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { safeServerMessage } from "@/server/errors";
import { logServerError } from "@/server/logging";
import { Permissions } from "@clinic/permissions";
import { requirePermission } from "@/server/permissions/require-permission";
import { cancelPrescriptionItem, createMedication, createPrescription, dispensePrescriptionItem } from "@/server/services/pharmacy.service";

const rxItemSchema = z.object({
  medication_id: z.string().uuid().optional().or(z.literal("")),
  medication_name: z.string().trim().min(1).max(200),
  dose: z.string().trim().max(80).optional().or(z.literal("")),
  route: z.string().trim().max(60).optional().or(z.literal("")),
  frequency: z.string().trim().max(80).optional().or(z.literal("")),
  duration_days: z.coerce.number().int().positive().max(3650).optional().or(z.literal("")),
  quantity: z.coerce.number().positive().max(99999).optional().or(z.literal("")),
  instructions: z.string().trim().max(500).optional().or(z.literal("")),
});

const rxSchema = z.object({
  encounter_id: z.string().uuid(),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  items: z.array(rxItemSchema).min(1).max(30),
});

export async function createPrescriptionAction(_prev: unknown, formData: FormData) {
  try {
    const raw = formData.get("items_json");
    let items: unknown[] = [];
    if (raw) { try { const parsed = JSON.parse(String(raw)); if (Array.isArray(parsed)) items = parsed; } catch { /* validation catches */ } }
    const input = rxSchema.parse({ encounter_id: formData.get("encounter_id"), notes: formData.get("notes") || "", items });
    const created = await createPrescription({
      encounterId: input.encounter_id, notes: input.notes || null,
      items: input.items.map((item) => ({
        medicationId: item.medication_id || null, medicationName: item.medication_name,
        dose: item.dose || null, route: item.route || null, frequency: item.frequency || null,
        durationDays: item.duration_days === "" ? null : item.duration_days ?? null,
        quantity: item.quantity === "" ? null : item.quantity ?? null, instructions: item.instructions || null,
      })),
    });
    revalidatePath("/staff/pharmacy");
    return { success: true, prescriptionId: created.id, allergyWarnings: created.allergyWarnings };
  } catch (error) {
    logServerError("pharmacy", "rx-create-failed", error);
    return { error: safeServerMessage(error, "We couldn't create the prescription.") };
  }
}

export async function dispenseItemAction(itemId: string, prescriptionId: string) {
  try {
    const staff = await requirePermission(Permissions.PHARMACY_DISPENSE);
    await dispensePrescriptionItem(itemId, prescriptionId, staff.membership.organization_id);
    revalidatePath(`/staff/pharmacy/${prescriptionId}`);
    revalidatePath("/staff/pharmacy");
    return { success: true };
  } catch (error) {
    logServerError("pharmacy", "dispense-failed", error);
    return { error: safeServerMessage(error, "We couldn't dispense this item.") };
  }
}

export async function cancelItemAction(itemId: string, prescriptionId: string) {
  try {
    const staff = await requirePermission(Permissions.PRESCRIPTION_WRITE);
    await cancelPrescriptionItem(itemId, prescriptionId, staff.membership.organization_id);
    revalidatePath(`/staff/pharmacy/${prescriptionId}`);
    revalidatePath("/staff/pharmacy");
    return { success: true };
  } catch (error) {
    logServerError("pharmacy", "rx-cancel-failed", error);
    return { error: safeServerMessage(error, "We couldn't cancel this item.") };
  }
}

const medSchema = z.object({
  code: z.string().trim().min(1).max(40),
  generic_name: z.string().trim().min(2).max(200),
  brand_name: z.string().trim().max(200).optional().or(z.literal("")),
  dosage_form: z.string().trim().max(60).optional().or(z.literal("")),
  strength: z.string().trim().max(80).optional().or(z.literal("")),
  unit: z.string().trim().max(40).optional().or(z.literal("")),
});

export async function createMedicationAction(_prev: unknown, formData: FormData) {
  try {
    const input = medSchema.parse(Object.fromEntries(formData));
    await createMedication({
      code: input.code, genericName: input.generic_name, brandName: input.brand_name || null,
      dosageForm: input.dosage_form || null, strength: input.strength || null, unit: input.unit || null,
    });
    revalidatePath("/staff/pharmacy/medications");
    return { success: true };
  } catch (error) {
    logServerError("pharmacy", "med-create-failed", error);
    return { error: safeServerMessage(error, "We couldn't add the medication.") };
  }
}
