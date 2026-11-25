import "server-only";
import { Permissions } from "@clinic/permissions";
import { NotFoundError, ValidationError } from "@/server/errors";
import { requirePermission } from "@/server/permissions/require-permission";
import * as labRepo from "@/server/repositories/lab.repository";
import * as repo from "@/server/repositories/pharmacy.repository";
import * as charges from "@/server/repositories/charge.repository";
import { createAdminClient } from "@/lib/supabase/admin";
import { logServerError } from "@/server/logging";

async function orgContext(permission: import("@clinic/permissions").Permission) {
  const staff = await requirePermission(permission);
  return { orgId: staff.membership.organization_id, userId: staff.user.id };
}

export async function listPrescriptions() {
  const { orgId } = await orgContext(Permissions.PRESCRIPTION_READ);
  return repo.listPrescriptions(orgId);
}

export async function getPrescription(id: string) {
  const { orgId } = await orgContext(Permissions.PRESCRIPTION_READ);
  const rx = await repo.findPrescription(id, orgId);
  if (!rx) throw new NotFoundError("Prescription not found");
  return rx;
}

export async function getPrescriptionForm() {
  const { orgId } = await orgContext(Permissions.PRESCRIPTION_WRITE);
  const [encounters, medications] = await Promise.all([labRepo.listOrderableEncounters(orgId), repo.listMedications(orgId)]);
  const admin = createAdminClient() as unknown as import("@supabase/supabase-js").SupabaseClient;
  const { data: stockRows } = await admin.from("inventory_items")
    .select("medication_id,on_hand_quantity")
    .eq("organization_id", orgId).eq("is_active", true).not("medication_id", "is", null);
  const stock: Record<string, number> = {};
  for (const row of stockRows ?? []) {
    const key = row.medication_id as string;
    stock[key] = (stock[key] ?? 0) + Number(row.on_hand_quantity ?? 0);
  }
  const { data: stockItems } = await admin.from("inventory_items")
    .select("id,item_name,sku,unit,on_hand_quantity,medication_id")
    .eq("organization_id", orgId).eq("is_active", true).gt("on_hand_quantity", 0)
    .order("item_name").limit(300);
  return { encounters, medications, stock, stockItems: stockItems ?? [] };
}

async function allergyWarnings(patientId: string, organizationId: string, medicationNames: string[]): Promise<string[]> {
  const admin = (await import("@/lib/supabase/admin")).createAdminClient() as unknown as import("@supabase/supabase-js").SupabaseClient;
  const { data } = await admin.from("patient_allergies").select("allergen,severity").eq("patient_id", patientId).eq("organization_id", organizationId);
  const warnings: string[] = [];
  for (const allergy of data ?? []) {
    const allergen = String((allergy as { allergen?: string }).allergen ?? "").toLowerCase();
    for (const name of medicationNames) {
      if (allergen && name.toLowerCase().includes(allergen)) warnings.push(`${allergen} (${(allergy as { severity?: string }).severity ?? "moderate"})`);
    }
  }
  return [...new Set(warnings)];
}

export async function createPrescription(input: {
  encounterId: string; notes: string | null;
  items: { medicationId: string | null; medicationName: string; dose: string | null; route: string | null; frequency: string | null; durationDays: number | null; quantity: number | null; instructions: string | null }[];
}) {
  const { orgId, userId } = await orgContext(Permissions.PRESCRIPTION_WRITE);
  if (!input.items.length) throw new ValidationError("Add at least one medication.");
  const encounter = (await labRepo.listOrderableEncounters(orgId)).find((item) => item.id === input.encounterId);
  if (!encounter) throw new NotFoundError("Encounter not found");
  if (!encounter.facility_id || !encounter.department_id) throw new ValidationError("This encounter is missing facility or department context.");
  const warnings = await allergyWarnings(encounter.patient_id, orgId, input.items.map((item) => item.medicationName));
  const id = await repo.createPrescription({
    organizationId: orgId, facilityId: encounter.facility_id, departmentId: encounter.department_id,
    encounterId: input.encounterId, patientId: encounter.patient_id, prescriberUserId: userId,
    notes: input.notes, items: input.items,
  });
  return { id, allergyWarnings: warnings };
}

async function decrementInventoryForDispense(organizationId: string, medicationId: string | null, quantity: number | null, note: string) {
  if (!medicationId || !quantity || quantity <= 0) return;
  const admin = createAdminClient() as unknown as import("@supabase/supabase-js").SupabaseClient;
  const { data: item } = await admin.from("inventory_items")
    .select("id,on_hand_quantity,facility_id")
    .eq("organization_id", organizationId).eq("medication_id", medicationId).eq("is_active", true)
    .order("on_hand_quantity", { ascending: false }).limit(1).maybeSingle();
  if (!item) return;
  const delta = -Math.abs(quantity);
  const { error: updErr } = await admin.from("inventory_items")
    .update({ on_hand_quantity: Number(item.on_hand_quantity) + delta })
    .eq("id", item.id).eq("organization_id", organizationId);
  if (updErr) return;
  await admin.from("stock_movements").insert({
    organization_id: organizationId, facility_id: item.facility_id, inventory_item_id: item.id,
    movement_type: "dispense", quantity: Math.abs(quantity), notes: note,
  });
}

export async function dispensePrescriptionItem(itemId: string, prescriptionId: string, organizationId: string) {
  await repo.updatePrescriptionItemStatus(itemId, "dispensed");
  const dispensedItem = await repo.findPrescriptionItem(itemId);
  if (dispensedItem) {
    await decrementInventoryForDispense(organizationId, dispensedItem.medication_id, Number(dispensedItem.quantity ?? 0), `Rx dispense: ${dispensedItem.medication_name ?? "item"}`).catch(() => undefined);
  }
  await chargeDispensedItem(itemId, prescriptionId, organizationId);
  const rx = await repo.findPrescription(prescriptionId, organizationId);
  if (!rx) return;
  const items = (rx.prescription_items ?? []) as { status?: string }[];
  const allDispensed = items.every((item) => item.status === "dispensed" || item.status === "cancelled");
  const anyDispensed = items.some((item) => item.status === "dispensed" || item.status === "partially_dispensed");
  await repo.updatePrescriptionStatus(prescriptionId, organizationId, allDispensed ? "dispensed" : anyDispensed ? "partially_dispensed" : rx.status);
}

export async function cancelPrescriptionItem(itemId: string, prescriptionId: string, organizationId: string) {
  await repo.updatePrescriptionItemStatus(itemId, "cancelled");
  const rx = await repo.findPrescription(prescriptionId, organizationId);
  if (!rx) return;
  const items = (rx.prescription_items ?? []) as { status?: string }[];
  const allCancelled = items.every((item) => item.status === "cancelled");
  if (allCancelled) await repo.updatePrescriptionStatus(prescriptionId, organizationId, "cancelled");
}

export async function listMedications() {
  const { orgId } = await orgContext(Permissions.PHARMACY_READ);
  return repo.listMedications(orgId);
}

export async function createMedication(input: { code: string; genericName: string; brandName: string | null; dosageForm: string | null; strength: string | null; unit: string | null }) {
  const { orgId } = await orgContext(Permissions.PHARMACY_MANAGE);
  if (!input.code.trim() || !input.genericName.trim()) throw new ValidationError("Code and generic name are required.");
  return repo.createMedication({ ...input, organizationId: orgId });
}

async function chargeDispensedItem(itemId: string, prescriptionId: string, organizationId: string) {
  try {
    const item = await repo.findPrescriptionItem(itemId);
    const rx = item ? await repo.findPrescription(prescriptionId, organizationId) : null;
    if (!item || !rx) return;
    const encounterId = rx.encounter_id as string | null;
    const patientId = rx.patient_id as string;
    if (!encounterId || !patientId) {
      logServerError("pharmacy", "rx-charge-skipped-no-encounter", { itemId, prescriptionId });
      return;
    }
    const admin = createAdminClient() as unknown as import("@supabase/supabase-js").SupabaseClient;
    // resolve sellable inventory item: by medication link, else by name match
    let stockItem: { id: string; selling_price: number | null; medication_id: string | null; facility_id: string | null } | null = null;
    if (item.medication_id) {
      const { data } = await admin.from("inventory_items")
        .select("id,selling_price,medication_id,facility_id").eq("organization_id", organizationId)
        .eq("medication_id", item.medication_id).eq("is_active", true)
        .order("selling_price", { ascending: false }).limit(1).maybeSingle();
      stockItem = data ?? null;
    }
    if (!stockItem && item.medication_name) {
      const { data } = await admin.from("inventory_items")
        .select("id,selling_price,medication_id,facility_id").eq("organization_id", organizationId)
        .eq("is_active", true).ilike("item_name", `%${String(item.medication_name).slice(0, 40)}%`)
        .order("selling_price", { ascending: false }).limit(1).maybeSingle();
      stockItem = data ?? null;
    }
    const price = Number(stockItem?.selling_price ?? 0);
    if (!price) {
      logServerError("pharmacy", "rx-charge-skipped-no-price", { itemId, medicationId: item.medication_id, medicationName: item.medication_name });
      return;
    }
    await charges.insertCharge({
      organizationId, encounterId, patientId,
      facilityId: (rx.facility_id as string | null) ?? stockItem?.facility_id ?? null,
      chargeType: "medication",
      description: `Medication: ${item.medication_name ?? "item"}`,
      quantity: Number(item.quantity ?? 1),
      unitPrice: price,
      sourceType: "prescription_item",
      sourceId: itemId,
    });
  } catch (error) {
    logServerError("pharmacy", "rx-charge-failed", error);
  }
}
