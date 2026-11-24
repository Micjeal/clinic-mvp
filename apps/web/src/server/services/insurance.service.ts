import "server-only";
import { Permissions } from "@clinic/permissions";
import { NotFoundError, ValidationError } from "@/server/errors";
import { requirePermission } from "@/server/permissions/require-permission";
import * as repo from "@/server/repositories/insurance.repository";

async function orgContext(permission: import("@clinic/permissions").Permission) {
  const staff = await requirePermission(permission);
  return { orgId: staff.membership.organization_id, userId: staff.user.id };
}

export async function listInsuranceClaims() {
  const { orgId } = await orgContext(Permissions.INSURANCE_READ);
  return repo.listClaims(orgId);
}

export async function getInsuranceClaim(id: string) {
  const { orgId } = await orgContext(Permissions.INSURANCE_READ);
  const claim = await repo.findClaim(id, orgId);
  if (!claim) throw new NotFoundError("Claim not found");
  return claim;
}

export async function getClaimFormData() {
  const { orgId } = await orgContext(Permissions.INSURANCE_CLAIM_CREATE);
  const [invoices, schemes, patients] = await Promise.all([repo.listIssuedInvoices(orgId), repo.listSchemes(orgId), repo.listPatients(orgId)]);
  return { invoices, schemes, patients };
}

export async function createInsuranceClaim(input: { invoiceId: string | null; insuranceSchemeId: string; policyId: string | null; patientId: string; facilityId: string; claimedAmount: number; currencyCode: string; diagnosisSummary: string | null; notes: string | null }) {
  const { orgId, userId } = await orgContext(Permissions.INSURANCE_CLAIM_CREATE);
  if (input.claimedAmount <= 0) throw new ValidationError("Claimed amount must be greater than zero.");
  const claimNumber = await repo.nextClaimNumber(orgId);
  const id = await repo.createClaim({
    organizationId: orgId, facilityId: input.facilityId, patientId: input.patientId,
    invoiceId: input.invoiceId, insuranceSchemeId: input.insuranceSchemeId, policyId: input.policyId,
    claimNumber, claimedAmount: input.claimedAmount, currencyCode: input.currencyCode,
    diagnosisSummary: input.diagnosisSummary, notes: input.notes, createdBy: userId,
  });
  if (input.invoiceId) {
    await repo.updateClaim(id, orgId, { status: "submitted", submitted_at: new Date().toISOString() });
  }
  return id;
}

export async function submitInsuranceClaim(claimId: string) {
  const { orgId } = await orgContext(Permissions.INSURANCE_CLAIM_CREATE);
  const claim = await repo.findClaim(claimId, orgId);
  if (!claim) throw new NotFoundError("Claim not found");
  if (claim.status !== "draft") throw new ValidationError("Only draft claims can be submitted.");
  await repo.updateClaim(claimId, orgId, { status: "submitted", submitted_at: new Date().toISOString() });
}

export async function processInsuranceClaim(claimId: string, action: "under_review" | "approved" | "denied" | "paid", approvedAmount?: number, paidAmount?: number) {
  const { orgId } = await orgContext(Permissions.INSURANCE_CLAIM_PROCESS);
  const claim = await repo.findClaim(claimId, orgId);
  if (!claim) throw new NotFoundError("Claim not found");
  const patch: Record<string, unknown> = { status: action, processed_at: new Date().toISOString() };
  if (approvedAmount != null) patch.approved_amount = approvedAmount;
  if (paidAmount != null) patch.paid_amount = paidAmount;
  if (action === "paid" && paidAmount == null) patch.paid_amount = claim.claimed_amount;
  await repo.updateClaim(claimId, orgId, patch);
}

export async function listSchemes() {
  const { orgId } = await orgContext(Permissions.INSURANCE_READ);
  return repo.listSchemes(orgId);
}

export async function listPolicies() {
  const { orgId } = await orgContext(Permissions.INSURANCE_READ);
  return repo.listPatientPolicies(orgId);
}

export async function getPolicyFormData() {
  const { orgId } = await orgContext(Permissions.INSURANCE_MANAGE);
  const [patients, schemes] = await Promise.all([repo.listPatients(orgId), repo.listSchemes(orgId)]);
  return { patients, schemes };
}

export async function createInsuranceScheme(input: { name: string; schemeType: string; contactPhone: string | null; contactEmail: string | null; preauthRequired: boolean; coveragePercent: number }) {
  const { orgId } = await orgContext(Permissions.INSURANCE_MANAGE);
  if (!input.name.trim()) throw new ValidationError("Scheme name is required.");
  return repo.createScheme({ ...input, organizationId: orgId });
}

export async function createPatientPolicy(input: { patientId: string; insuranceSchemeId: string; policyNumber: string; memberNumber: string | null; groupNumber: string | null; coveragePercent: number | null; validFrom: string | null; validTo: string | null }) {
  const { orgId } = await orgContext(Permissions.INSURANCE_MANAGE);
  if (!input.policyNumber.trim()) throw new ValidationError("Policy number is required.");
  return repo.createPolicy({ ...input, organizationId: orgId });
}
