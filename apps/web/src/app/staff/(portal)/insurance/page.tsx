import { StaffPageHeader } from "@/features/staff/components/staff-content";
import { StaffAccessDenied } from "@/features/staff/components/access-denied";
import { listInsuranceClaims } from "@/server/services/insurance.service";
import { AuthorizationError } from "@/server/errors";
import Link from "next/link";

export const metadata = { title: "Insurance" };

const STATUS_LABELS: Record<string, string> = { draft: "Draft", submitted: "Submitted", under_review: "Under review", approved: "Approved", partially_paid: "Part paid", paid: "Paid", denied: "Denied", appealed: "Appealed" };

export default async function InsurancePage() {
  let claims;
  try {
    claims = await listInsuranceClaims();
  } catch (error) {
    if (error instanceof AuthorizationError) return <StaffAccessDenied />;
    throw error;
  }
  const outstanding = claims.filter((c) => ["submitted", "under_review", "approved"].includes(c.status)).reduce((s, c) => s + Number(c.claimed_amount) - Number(c.paid_amount ?? 0), 0);

  return (
    <div className="staff-page">
      <StaffPageHeader eyebrow="Finance" title="Insurance & claims" description="Medical schemes, patient policies and insurance claims." actions={<div style={{ display: "flex", gap: ".5rem" }}><Link className="btn btn--secondary" href="/staff/insurance/schemes">Schemes</Link><Link className="btn btn--secondary" href="/staff/insurance/policies">Policies</Link><Link className="btn" href="/staff/insurance/claims/new">New claim</Link></div>} />
      <div className="staff-kpi-grid">
        <div className="staff-kpi"><span>Open claims</span><strong>{claims.filter((c) => !["paid", "denied"].includes(c.status)).length}</strong></div>
        <div className="staff-kpi"><span>Awaiting payout</span><strong>{outstanding.toLocaleString()} UGX</strong></div>
        <div className="staff-kpi"><span>Total claims</span><strong>{claims.length}</strong></div>
      </div>
      <section className="staff-panel">
        <div className="staff-table-wrap">
          <table className="staff-table">
            <thead><tr><th>Claim</th><th>Patient</th><th>Scheme</th><th className="staff-col-amount">Claimed</th><th className="staff-col-amount">Paid</th><th>Status</th></tr></thead>
            <tbody>
              {claims.length === 0 ? <tr><td colSpan={6} className="staff-table-empty">No claims yet.</td></tr> :
                claims.map((claim) => {
                  const patient = claim.patients as { first_name?: string; last_name?: string } | null;
                  const scheme = claim.insurance_schemes as { name?: string } | null;
                  return (
                    <tr key={claim.id}>
                      <td><Link className="staff-table-link" href={`/staff/insurance/claims/${claim.id}`}>{claim.claim_number}</Link></td>
                      <td>{patient ? `${patient.first_name} ${patient.last_name}` : "—"}</td>
                      <td>{scheme?.name ?? "—"}</td>
                      <td className="staff-col-amount">{Number(claim.claimed_amount).toLocaleString()} {claim.currency_code}</td>
                      <td className="staff-col-amount">{Number(claim.paid_amount ?? 0).toLocaleString()}</td>
                      <td><span className="staff-status staff-status--issued">{STATUS_LABELS[claim.status] ?? claim.status}</span></td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
