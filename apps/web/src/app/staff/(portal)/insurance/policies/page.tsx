import { StaffPageHeader } from "@/features/staff/components/staff-content";
import { StaffAccessDenied } from "@/features/staff/components/access-denied";
import { getPolicyFormData, listPolicies } from "@/server/services/insurance.service";
import { requirePermission } from "@/server/permissions/require-permission";
import { Permissions } from "@clinic/permissions";
import { AuthorizationError } from "@/server/errors";
import { PolicyForm } from "@/features/insurance/components/insurance-workspace";
import Link from "next/link";

export const metadata = { title: "Insurance policies" };

export default async function PoliciesPage() {
  let policies;
  try {
    policies = await listPolicies();
  } catch (error) {
    if (error instanceof AuthorizationError) return <StaffAccessDenied />;
    throw error;
  }
  const canManage = await requirePermission(Permissions.INSURANCE_MANAGE).then(() => true).catch(() => false);
  const formData = canManage ? await getPolicyFormData().catch(() => ({ patients: [], schemes: [] })) : { patients: [], schemes: [] };
  return (
    <div className="staff-page">
      <StaffPageHeader eyebrow="Finance" title="Patient insurance policies" description="Coverage linked to patients." actions={<Link className="btn btn--secondary" href="/staff/insurance">← Back to insurance</Link>} />
      {canManage ? <section className="staff-panel"><div className="staff-panel__header"><h2>Add a policy</h2></div><PolicyForm patients={formData.patients as never} schemes={formData.schemes as never} /></section> : null}
      <section className="staff-panel">
        <div className="staff-table-wrap"><table className="staff-table">
          <thead><tr><th>Policy</th><th>Scheme</th><th>Member</th><th>Coverage</th><th>Valid</th></tr></thead>
          <tbody>
            {policies.length === 0 ? <tr><td colSpan={5} className="staff-table-empty">No active policies.</td></tr> :
              policies.map((policy) => {
                const scheme = policy.insurance_schemes as { name?: string } | null;
                return <tr key={policy.id}><td>{policy.policy_number}</td><td>{scheme?.name ?? "—"}</td><td>{policy.member_number ?? "—"}</td><td>{policy.coverage_percent != null ? `${policy.coverage_percent}%` : "Scheme default"}</td><td>{policy.valid_from ? `${policy.valid_from} → ${policy.valid_to ?? "open"}` : "—"}</td></tr>;
              })}
          </tbody>
        </table></div>
      </section>
    </div>
  );
}
