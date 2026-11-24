import { notFound } from "next/navigation";
import { StaffPageHeader } from "@/features/staff/components/staff-content";
import { StaffAccessDenied } from "@/features/staff/components/access-denied";
import { getInsuranceClaim } from "@/server/services/insurance.service";
import { requirePermission } from "@/server/permissions/require-permission";
import { Permissions } from "@clinic/permissions";
import { AuthorizationError, NotFoundError } from "@/server/errors";
import { ClaimActions } from "@/features/insurance/components/insurance-workspace";
import Link from "next/link";

export const metadata = { title: "Insurance claim" };

export default async function ClaimPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let claim;
  try {
    claim = await getInsuranceClaim(id);
  } catch (error) {
    if (error instanceof AuthorizationError) return <StaffAccessDenied />;
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
  const patient = claim.patients as { first_name?: string; last_name?: string; patient_number?: string } | null;
  const scheme = claim.insurance_schemes as { name?: string; scheme_type?: string; coverage_percent?: number } | null;
  const invoice = claim.invoices as { invoice_number?: string; total?: number; currency_code?: string; status?: string } | null;
  const canProcess = await requirePermission(Permissions.INSURANCE_CLAIM_PROCESS).then(() => true).catch(() => false);

  return (
    <div className="staff-page">
      <StaffPageHeader
        eyebrow="Finance"
        title={`Claim ${claim.claim_number}`}
        description={`${patient ? `${patient.first_name} ${patient.last_name}` : "Patient"} • ${scheme?.name ?? "Scheme"}`}
        actions={<Link className="btn btn--secondary" href="/staff/insurance">← Back to insurance</Link>}
      />
      <div className="staff-detail-grid">
        <section className="staff-panel">
          <div className="staff-panel__header"><h2>Claim details</h2><span className="staff-status staff-status--issued">{claim.status.replace("_", " ")}</span></div>
          <dl className="staff-detail-list">
            <div><dt>Patient</dt><dd>{patient ? `${patient.first_name} ${patient.last_name}` : "—"}{patient?.patient_number ? ` (${patient.patient_number})` : ""}</dd></div>
            <div><dt>Scheme</dt><dd>{scheme?.name}{scheme?.coverage_percent != null ? ` — ${scheme.coverage_percent}% cover` : ""}</dd></div>
            <div><dt>Invoice</dt><dd>{invoice ? `${invoice.invoice_number} (${Number(invoice.total).toLocaleString()} ${invoice.currency_code})` : "Manual claim"}</dd></div>
            <div><dt>Claimed</dt><dd><strong>{Number(claim.claimed_amount).toLocaleString()} {claim.currency_code}</strong></dd></div>
            <div><dt>Approved</dt><dd>{claim.approved_amount != null ? `${Number(claim.approved_amount).toLocaleString()} ${claim.currency_code}` : "—"}</dd></div>
            <div><dt>Paid</dt><dd>{Number(claim.paid_amount ?? 0).toLocaleString()} {claim.currency_code}</dd></div>
            <div><dt>Diagnosis</dt><dd>{claim.diagnosis_summary || "—"}</dd></div>
            <div><dt>Notes</dt><dd>{claim.notes || "—"}</dd></div>
            <div><dt>Submitted</dt><dd>{claim.submitted_at ? new Date(claim.submitted_at).toLocaleString() : "—"}</dd></div>
          </dl>
        </section>
        <section className="staff-panel">
          <div className="staff-panel__header"><h2>Actions</h2></div>
          <ClaimActions canProcess={canProcess} claimId={claim.id} status={claim.status} />
        </section>
      </div>
    </div>
  );
}
