import "server-only";
import { Permissions } from "@clinic/permissions";
import { NotFoundError, ValidationError } from "@/server/errors";
import { requirePermission } from "@/server/permissions/require-permission";
import * as repo from "@/server/repositories/lab.repository";
import * as charges from "@/server/repositories/charge.repository";

async function orgContext(permission: import("@clinic/permissions").Permission) {
  const staff = await requirePermission(permission);
  return { orgId: staff.membership.organization_id, userId: staff.user.id };
}

export async function listLabOrders() {
  const { orgId } = await orgContext(Permissions.LAB_READ);
  return repo.listLabOrders(orgId);
}

export async function getLabOrder(id: string) {
  const { orgId } = await orgContext(Permissions.LAB_READ);
  const order = await repo.findLabOrder(id, orgId);
  if (!order) throw new NotFoundError("Lab order not found");
  return order;
}

export async function getLabTests() {
  const { orgId } = await orgContext(Permissions.LAB_READ);
  return repo.listLabTests(orgId);
}

export async function getLabOrderForm() {
  const { orgId } = await orgContext(Permissions.LAB_ORDER);
  const [encounters, tests, departments] = await Promise.all([repo.listOrderableEncounters(orgId), repo.listLabTests(orgId), repo.listLabDepartments(orgId)]);
  return { encounters, tests, departments };
}

export async function createLabOrder(input: { encounterId: string; priority: string; clinicalNotes: string | null; testIds: string[] }) {
  const { orgId, userId } = await orgContext(Permissions.LAB_ORDER);
  if (!input.testIds.length) throw new ValidationError("Select at least one test.");
  const encounter = (await repo.listOrderableEncounters(orgId)).find((item) => item.id === input.encounterId);
  if (!encounter) throw new NotFoundError("Encounter not found");
  if (!encounter.facility_id || !encounter.department_id) throw new ValidationError("This encounter is missing facility or department context.");
  return repo.createLabOrder({
    organizationId: orgId, facilityId: encounter.facility_id, departmentId: encounter.department_id,
    encounterId: input.encounterId, patientId: encounter.patient_id, orderedBy: userId,
    priority: input.priority, clinicalNotes: input.clinicalNotes, testIds: input.testIds,
  });
}

export async function collectLabSample(itemId: string) {
  const { userId } = await orgContext(Permissions.LAB_RESULT_WRITE);
  await repo.updateLabOrderItemStatus(itemId, { status: "sample_collected", collected_by: userId, collected_at: new Date().toISOString() });
}

export async function setLabItemProcessing(itemId: string) {
  await orgContext(Permissions.LAB_RESULT_WRITE);
  await repo.updateLabOrderItemStatus(itemId, { status: "processing" });
}

export async function saveLabResult(input: { itemId: string; orderId: string; patientId: string; resultValue: string | null; unit: string | null; referenceRange: string | null; abnormalFlag: string | null; resultText: string | null }) {
  const { orgId, userId } = await orgContext(Permissions.LAB_RESULT_WRITE);
  await repo.upsertLabResult({ organizationId: orgId, labOrderItemId: input.itemId, patientId: input.patientId, resultValue: input.resultValue, unit: input.unit, referenceRange: input.referenceRange, abnormalFlag: input.abnormalFlag, resultText: input.resultText, resultedBy: userId });
  await repo.updateLabOrderItemStatus(input.itemId, { status: "completed", completed_at: new Date().toISOString() });
  await maybeCompleteOrder(input.orderId, orgId);
}

async function maybeCompleteOrder(orderId: string, orgId: string) {
  const order = await repo.findLabOrder(orderId, orgId);
  if (!order) return;
  const items = (order.lab_order_items ?? []) as { status?: string }[];
  if (items.length && items.every((item) => item.status === "completed" || item.status === "cancelled")) {
    await repo.updateLabOrderStatus(orderId, orgId, { status: "completed", completed_at: new Date().toISOString() });
    await chargeCompletedLabOrder(order);
  } else {
    const anyProcessing = items.some((item) => ["sample_collected", "processing", "completed"].includes(item.status ?? ""));
    if (anyProcessing && order.status === "ordered") await repo.updateLabOrderStatus(orderId, orgId, { status: "processing" });
  }
}

export async function approveLabResultAction(resultId: string, orderId: string) {
  const { orgId, userId } = await orgContext(Permissions.LAB_RESULT_APPROVE);
  await repo.approveLabResult(resultId, orgId, userId);
  await maybeCompleteOrder(orderId, orgId);
}

export async function createLabTest(input: { code: string; name: string; description: string | null; specimenType: string | null; defaultUnit: string | null; referenceRangeText: string | null; price: number; departmentId: string | null }) {
  const staff = await requirePermission(Permissions.DEPARTMENT_MANAGE);
  const orgId = staff.membership.organization_id;
  if (!input.code.trim() || !input.name.trim()) throw new ValidationError("Code and name are required.");
  return repo.createLabTest({ ...input, organizationId: orgId });
}

async function chargeCompletedLabOrder(order: Record<string, unknown> | null) {
  if (!order) return;
  const orgId = order.organization_id as string;
  const encounterId = order.encounter_id as string;
  const patientId = order.patient_id as string;
  const facilityId = (order.facility_id as string | null) ?? null;
  const items = (order.lab_order_items ?? []) as { id?: string; status?: string; lab_tests?: { name?: string; code?: string; price?: number; currency_code?: string } | null }[];
  for (const item of items) {
    const test = item.lab_tests;
    if (!item.id || !test || Number(test.price ?? 0) <= 0) continue;
    try {
      await charges.insertCharge({
        organizationId: orgId, encounterId, patientId, facilityId,
        chargeType: "laboratory", description: `Lab: ${test.name ?? test.code ?? "test"}`,
        quantity: 1, unitPrice: Number(test.price), currencyCode: test.currency_code ?? "UGX",
        sourceType: "lab_order_item", sourceId: item.id,
      });
    } catch {
      // Charge capture must never break the lab workflow.
    }
  }
}
