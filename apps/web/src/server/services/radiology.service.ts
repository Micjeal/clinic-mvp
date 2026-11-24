import "server-only";
import { Permissions } from "@clinic/permissions";
import { NotFoundError, ValidationError } from "@/server/errors";
import { requirePermission } from "@/server/permissions/require-permission";
import * as labRepo from "@/server/repositories/lab.repository";
import * as repo from "@/server/repositories/radiology.repository";
import * as charges from "@/server/repositories/charge.repository";

async function orgContext(permission: import("@clinic/permissions").Permission) {
  const staff = await requirePermission(permission);
  return { orgId: staff.membership.organization_id, userId: staff.user.id };
}

export async function listImagingOrders() {
  const { orgId } = await orgContext(Permissions.RADIOLOGY_READ);
  return repo.listImagingOrders(orgId);
}

export async function getImagingOrder(id: string) {
  const { orgId } = await orgContext(Permissions.RADIOLOGY_READ);
  const order = await repo.findImagingOrder(id, orgId);
  if (!order) throw new NotFoundError("Imaging order not found");
  return order;
}

export async function getImagingOrderForm() {
  const { orgId } = await orgContext(Permissions.RADIOLOGY_ORDER);
  const [encounters, tests] = await Promise.all([labRepo.listOrderableEncounters(orgId), repo.listImagingTests(orgId)]);
  return { encounters, tests };
}

export async function createImagingOrder(input: { encounterId: string; imagingTestId: string; priority: string; clinicalIndication: string | null; scheduledAt: string | null }) {
  const { orgId, userId } = await orgContext(Permissions.RADIOLOGY_ORDER);
  const encounter = (await labRepo.listOrderableEncounters(orgId)).find((item) => item.id === input.encounterId);
  if (!encounter) throw new NotFoundError("Encounter not found");
  if (!encounter.facility_id) throw new ValidationError("This encounter is missing facility context.");
  return repo.createImagingOrder({ organizationId: orgId, facilityId: encounter.facility_id, encounterId: input.encounterId, patientId: encounter.patient_id, imagingTestId: input.imagingTestId, orderedBy: userId, priority: input.priority, clinicalIndication: input.clinicalIndication, scheduledAt: input.scheduledAt });
}

export async function setImagingStatus(orderId: string, status: string) {
  const { orgId } = await orgContext(Permissions.RADIOLOGY_ORDER);
  const order = await repo.findImagingOrder(orderId, orgId) as { status?: string } | null;
  if (!order) throw new NotFoundError("Imaging order not found");
  await repo.updateImagingOrder(orderId, orgId, { status, completed_at: status === "completed" ? new Date().toISOString() : null });
}

export async function saveImagingReport(input: { orderId: string; findings: string | null; impression: string | null; recommendations: string | null }) {
  const { orgId, userId } = await orgContext(Permissions.RADIOLOGY_REPORT_WRITE);
  const order = await repo.findImagingOrder(input.orderId, orgId) as { patient_id: string; status?: string } | null;
  if (!order) throw new NotFoundError("Imaging order not found");
  await repo.upsertImagingReport({ organizationId: orgId, imagingOrderId: input.orderId, patientId: order.patient_id, findings: input.findings, impression: input.impression, recommendations: input.recommendations, reportedBy: userId });
  if (order.status === "ordered" || order.status === "scheduled") await repo.updateImagingOrder(input.orderId, orgId, { status: "completed", completed_at: new Date().toISOString() });
}

export async function approveImagingReport(orderId: string) {
  const { orgId, userId } = await orgContext(Permissions.RADIOLOGY_REPORT_APPROVE);
  const order = await repo.findImagingOrder(orderId, orgId) as Record<string, any> | null;
  const report = (order?.imaging_reports ?? null) as { id?: string } | { id?: string }[] | null;
  const reportId = Array.isArray(report) ? report[0]?.id : report?.id;
  if (!order || !reportId) throw new NotFoundError("Report not found");
  await repo.finalizeImagingReport(reportId, orgId, userId);
  try {
    const test = order.imaging_tests as { name?: string; price?: number; currency_code?: string } | null;
    if (test && Number(test.price ?? 0) > 0) {
      await charges.insertCharge({
        organizationId: orgId,
        encounterId: order.encounter_id as string,
        patientId: order.patient_id as string,
        facilityId: (order.facility_id as string | null) ?? null,
        chargeType: "imaging",
        description: `Imaging: ${test.name ?? "study"}`,
        quantity: 1,
        unitPrice: Number(test.price),
        currencyCode: test.currency_code ?? "UGX",
        sourceType: "imaging_order",
        sourceId: orderId,
        createdBy: userId,
      });
    }
  } catch {
    // Charge capture must never break report approval.
  }
}

export async function listImagingTests() {
  const { orgId } = await orgContext(Permissions.RADIOLOGY_READ);
  return repo.listImagingTests(orgId);
}

export async function createImagingTest(input: { code: string; name: string; modality: string; bodyPart: string | null; description: string | null; price: number }) {
  const staff = await requirePermission(Permissions.DEPARTMENT_MANAGE);
  const orgId = staff.membership.organization_id;
  if (!input.code.trim() || !input.name.trim()) throw new ValidationError("Code and name are required.");
  return repo.createImagingTest({ ...input, organizationId: orgId });
}
