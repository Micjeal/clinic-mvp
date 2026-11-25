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
  try {
    const { chargeFromCatalog } = await import("@/server/services/charge-hooks");
    const encounterId = order.encounter_id as string; const patientId = order.patient_id as string; const facilityId = (order.facility_id as string | null) ?? null;
    if (encounterId && patientId) {
      await chargeFromCatalog({ organizationId: orgId, encounterId, patientId, facilityId, category: "procedure", nameMatch: "report", quantity: 1, actorId: userId, sourceType: "imaging_report", sourceId: orderId, description: "Radiologist reporting fee" });
      if (/contrast/i.test(String(order.clinical_indication ?? ""))) {
        await chargeFromCatalog({ organizationId: orgId, encounterId, patientId, facilityId, category: "procedure", nameMatch: "contrast", quantity: 1, actorId: userId, sourceType: "contrast", sourceId: orderId, description: "Contrast media" });
      }
    }
  } catch { /* fees must never break approval */ }
  try {
    const patientId = order.patient_id as string;
    const admin = (await import("@/lib/supabase/admin")).createAdminClient() as unknown as import("@supabase/supabase-js").SupabaseClient;
    const { data: patient } = await admin.from("patients").select("first_name,last_name,phone").eq("id", patientId).maybeSingle();
    if (patient) {
      const { sendNotification } = await import("@/server/services/notification.service");
      const name = `${patient.first_name ?? ""} ${patient.last_name ?? ""}`.trim();
      const base = { type: "result_ready" as const, recipientPatientId: patientId, recipientPhone: patient.phone ?? null, recipientName: name, subject: "Imaging result ready", message: `Hello ${name}, your imaging report is ready. Please visit the hospital or check your patient portal.`, metadata: { orderId } };
      await sendNotification({ ...base, channel: "in_app" });
      if (patient.phone) await sendNotification({ ...base, channel: "sms" });
    }
  } catch { /* notification must never break approval */ }
}

export async function listImagingTests() {
  const { orgId } = await orgContext(Permissions.RADIOLOGY_READ);
  return repo.listImagingTests(orgId);
}

async function nextImagingTestCode(orgId: string, modality: string, name: string) {
  const prefix = (modality || "img").slice(0, 3).toUpperCase();
  const slug = name.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) || "EXAM";
  const base = `${prefix}-${slug}`;
  const admin = (await import("@/lib/supabase/admin")).createAdminClient() as unknown as import("@supabase/supabase-js").SupabaseClient;
  for (let i = 1; i <= 50; i++) {
    const code = i === 1 ? base : `${base}-${i}`;
    const { data } = await admin.from("imaging_tests").select("id").eq("organization_id", orgId).eq("code", code).maybeSingle();
    if (!data) return code;
  }
  return `${base}-${Date.now().toString(36).toUpperCase()}`;
}

export async function createImagingTest(input: { code: string; name: string; modality: string; bodyPart: string | null; description: string | null; price: number | null }) {
  const staff = await requirePermission(Permissions.DEPARTMENT_MANAGE);
  const orgId = staff.membership.organization_id;
  if (!input.name.trim()) throw new ValidationError("Name is required.");
  const code = input.code.trim() || await nextImagingTestCode(orgId, input.modality, input.name);
  let price = input.price;
  if (price == null || price <= 0) {
    const { findStandardCharge } = await import("@/server/repositories/charge.repository");
    const catalog = await findStandardCharge(orgId, "procedure", input.name).catch(() => null)
      ?? await findStandardCharge(orgId, "other", input.modality).catch(() => null);
    price = Number(catalog?.price ?? 0);
  }
  return repo.createImagingTest({ ...input, code, price: price ?? 0, organizationId: orgId });
}
