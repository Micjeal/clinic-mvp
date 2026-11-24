import { StaffPageHeader } from "@/features/staff/components/staff-content";
import { StaffAccessDenied } from "@/features/staff/components/access-denied";
import { getClaimFormData, listSchemes } from "@/server/services/insurance.service";
import { listOrgFacilities } from "@/server/repositories/billing.repository";
import { AuthorizationError } from "@/server/errors";
import { ClaimForm } from "@/features/insurance/components/insurance-workspace";
import { requirePermission } from "@/server/permissions/require-permission";
import { Permissions } from "@clinic/permissions";
import Link from "next/link";

export const metadata = { title: "New insurance claim" };

export default async function NewClaimPage() {
  let data;
  try {
    data = await getClaimFormData();
  } catch (error) {
    if (error instanceof AuthorizationError) return <StaffAccessDenied />;
    throw error;
  }
  const staff = await requirePermission(Permissions.INSURANCE_CLAIM_CREATE).catch(() => null);
  const facilities = staff?.membership.organization_id ? await listOrgFacilities(staff.membership.organization_id).catch(() => []) : [];
  return (
    <div className="staff-page">
      <StaffPageHeader eyebrow="Finance" title="New insurance claim" description="Claim against a patient invoice or manually." actions={<Link className="btn btn--secondary" href="/staff/insurance">← Back to insurance</Link>} />
      <ClaimForm facilities={facilities as never} invoices={data.invoices as never} patients={data.patients as never} schemes={data.schemes as never} />
    </div>
  );
}
