import "server-only";
import { Permissions } from "@clinic/permissions";
import { NotFoundError, ValidationError } from "@/server/errors";
import { requirePermission } from "@/server/permissions/require-permission";
import * as labRepo from "@/server/repositories/lab.repository";
import * as repo from "@/server/repositories/pharmacy.repository";
import * as charges from "@/server/repositories/charge.repository";

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
  return { encounters, medications };
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

export async function dispensePrescriptionItem(itemId: string, prescriptionId: string, organizationId: string) {
  await repo.updatePrescriptionItemStatus(itemId, "dispensed");
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
    if (!item || !rx || !item.medication_id) return;
    const price = await repo.findMedicationSellingPrice(organizationId, item.medication_id);
    if (!price) return;
    const encounterId = rx.encounter_id as string | null;
    const patientId = rx.patient_id as string;
    if (!encounterId) return;
    await charges.insertCharge({
      organizationId, encounterId, patientId,
      facilityId: (rx.facility_id as string | null) ?? null,
      chargeType: "medication",
      description: `Medication: ${item.medication_name ?? "item"}`,
      quantity: Number(item.quantity ?? 1),
      unitPrice: price,
      sourceType: "prescription_item",
      sourceId: itemId,
    });
  } catch {
    // Charge capture must never break dispensing.
  }
}
