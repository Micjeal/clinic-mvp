import { StaffPageHeader } from "@/features/staff/components/staff-content";
import { StaffAccessDenied } from "@/features/staff/components/access-denied";
import { listSchemes } from "@/server/services/insurance.service";
import { requirePermission } from "@/server/permissions/require-permission";
import { Permissions } from "@clinic/permissions";
import { AuthorizationError } from "@/server/errors";
import { SchemeForm } from "@/features/insurance/components/insurance-workspace";
import Link from "next/link";

export const metadata = { title: "Insurance schemes" };

const TYPE_LABELS: Record<string, string> = { nhif: "NHIF", private: "Private", employer: "Employer", community: "Community", other: "Other" };

export default async function SchemesPage() {
  let schemes;
  try {
    schemes = await listSchemes();
  } catch (error) {
    if (error instanceof AuthorizationError) return <StaffAccessDenied />;
    throw error;
  }
  const canManage = await requirePermission(Permissions.INSURANCE_MANAGE).then(() => true).catch(() => false);
  return (
    <div className="staff-page">
      <StaffPageHeader eyebrow="Finance" title="Insurance schemes" description="Payers and medical schemes." actions={<Link className="btn btn--secondary" href="/staff/insurance">← Back to insurance</Link>} />
      {canManage ? <section className="staff-panel"><div className="staff-panel__header"><h2>Add a scheme</h2></div><SchemeForm /></section> : null}
      <section className="staff-panel">
        <div className="staff-table-wrap"><table className="staff-table">
          <thead><tr><th>Name</th><th>Type</th><th>Coverage</th><th>Pre-auth</th><th>Contact</th></tr></thead>
          <tbody>
            {schemes.length === 0 ? <tr><td colSpan={5} className="staff-table-empty">No schemes configured yet.</td></tr> :
              schemes.map((scheme) => (
                <tr key={scheme.id}><td>{scheme.name}</td><td>{TYPE_LABELS[scheme.scheme_type] ?? scheme.scheme_type}</td><td>{Number(scheme.coverage_percent)}%</td><td>{scheme.preauth_required ? "Required" : "—"}</td><td>{scheme.contact_phone ?? scheme.contact_email ?? "—"}</td></tr>
              ))}
          </tbody>
        </table></div>
      </section>
    </div>
  );
}
