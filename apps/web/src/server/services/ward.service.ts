import "server-only";
import { Permissions } from "@clinic/permissions";
import { NotFoundError, ValidationError } from "@/server/errors";
import { requirePermission } from "@/server/permissions/require-permission";
import * as repo from "@/server/repositories/ward.repository";

async function orgContext(permission: import("@clinic/permissions").Permission) {
  const staff = await requirePermission(permission);
  return { orgId: staff.membership.organization_id, userId: staff.user.id };
}

export async function listWardBoard() {
  const { orgId } = await orgContext(Permissions.WARD_READ);
  const [wards, admissions] = await Promise.all([repo.listWards(orgId), repo.listAdmissions(orgId)]);
  return { wards, admissions };
}

export async function getAdmission(id: string) {
  const { orgId } = await orgContext(Permissions.WARD_READ);
  const admission = await repo.findAdmission(id, orgId);
  if (!admission) throw new NotFoundError("Admission not found");
  return admission;
}

export async function getAdmissionForm() {
  const { orgId } = await orgContext(Permissions.ADMISSION_MANAGE);
  const [wards, patients, facilities] = await Promise.all([repo.listWards(orgId), repo.listPatients(orgId), repo.listFacilities(orgId)]);
  return { wards, patients, facilities };
}

export async function admitPatient(input: { patientId: string; wardId: string; bedId: string | null; facilityId: string; encounterId: string | null; reasonForAdmission: string | null; diagnosisOnAdmission: string | null }) {
  const { orgId, userId } = await orgContext(Permissions.ADMISSION_MANAGE);
  const ward = (await repo.listWards(orgId)).find((item) => item.id === input.wardId);
  if (!ward) throw new NotFoundError("Ward not found");
  const beds = (ward.beds ?? []) as { id: string; status: string }[];
  let bedId = input.bedId;
  if (!bedId) {
    const free = beds.find((bed) => bed.status === "available");
    if (!free) throw new ValidationError("No available beds in this ward.");
    bedId = free.id;
  } else {
    const bed = beds.find((item) => item.id === bedId);
    if (!bed || bed.status !== "available") throw new ValidationError("That bed is not available.");
  }
  const admissionNumber = await repo.nextAdmissionNumber(orgId);
  const id = await repo.createAdmission({
    organizationId: orgId, facilityId: input.facilityId, patientId: input.patientId, wardId: input.wardId,
    bedId, encounterId: input.encounterId, admittedBy: userId, admissionNumber,
    reasonForAdmission: input.reasonForAdmission, diagnosisOnAdmission: input.diagnosisOnAdmission,
  });
  await repo.setBedStatus(bedId, orgId, "occupied");
  return id;
}

export async function dischargeAdmission(admissionId: string, dischargeSummary: string | null) {
  const { orgId } = await orgContext(Permissions.ADMISSION_MANAGE);
  const admission = await repo.findAdmission(admissionId, orgId);
  if (!admission) throw new NotFoundError("Admission not found");
  if (admission.status !== "admitted" && admission.status !== "on_leave") throw new ValidationError("This admission cannot be discharged.");
  await repo.updateAdmission(admissionId, orgId, { status: "discharged", discharged_at: new Date().toISOString(), discharge_summary: dischargeSummary });
  if (admission.bed_id) await repo.setBedStatus(admission.bed_id, orgId, "available");
}

export async function getWardFormData() {
  const { orgId } = await orgContext(Permissions.WARD_MANAGE);
  const facilities = await repo.listFacilities(orgId);
  return { facilities };
}

export async function createWard(input: { facilityId: string; name: string; wardType: string; departmentId: string | null }) {
  const { orgId } = await orgContext(Permissions.WARD_MANAGE);
  if (!input.name.trim()) throw new ValidationError("Ward name is required.");
  return repo.createWard({ organizationId: orgId, facilityId: input.facilityId, name: input.name.trim(), wardType: input.wardType, departmentId: input.departmentId });
}

export async function addBed(input: { wardId: string; bedNumber: string }) {
  const { orgId } = await orgContext(Permissions.WARD_MANAGE);
  if (!input.bedNumber.trim()) throw new ValidationError("Bed number is required.");
  return repo.createBed({ organizationId: orgId, wardId: input.wardId, bedNumber: input.bedNumber.trim() });
}
