import { notFound } from "next/navigation";
import { StaffPageHeader } from "@/features/staff/components/staff-content";
import { StaffAccessDenied } from "@/features/staff/components/access-denied";
import { getImagingOrder } from "@/server/services/radiology.service";
import { requirePermission } from "@/server/permissions/require-permission";
import { Permissions } from "@clinic/permissions";
import { AuthorizationError, NotFoundError } from "@/server/errors";
import { ImagingReportForm, ImagingStatusButtons } from "@/features/radiology/components/radiology-workspace";
import Link from "next/link";

export const metadata = { title: "Imaging order" };

type Report = { id: string; findings: string | null; impression: string | null; recommendations: string | null; status: string; reported_at: string | null; approved_at: string | null } | null;

export default async function ImagingOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let order;
  try {
    order = await getImagingOrder(id);
  } catch (error) {
    if (error instanceof AuthorizationError) return <StaffAccessDenied />;
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
  const patient = order.patients as { first_name?: string; last_name?: string; patient_number?: string } | null;
  const test = order.imaging_tests as { code?: string; name?: string; modality?: string; body_part?: string | null; price?: number; currency_code?: string } | null;
  const facility = order.facilities as { name?: string } | null;
  const reportRows = (order.imaging_reports ?? []) as unknown as Report[];
  const report = reportRows[0] ?? null;
  const canReport = await requirePermission(Permissions.RADIOLOGY_REPORT_WRITE).then(() => true).catch(() => false);
  const canApprove = await requirePermission(Permissions.RADIOLOGY_REPORT_APPROVE).then(() => true).catch(() => false);

  return (
    <div className="staff-page">
      <StaffPageHeader
        eyebrow="Clinical"
        title={`${test?.name ?? "Imaging order"} — ${patient ? `${patient.first_name} ${patient.last_name}` : "Patient"}`}
        description={`${test?.modality?.toUpperCase() ?? ""}${test?.body_part ? ` • ${test.body_part}` : ""} • ${order.priority.toUpperCase()} • ${order.status.replace("_", " ")}`}
        actions={<Link className="btn btn--secondary" href="/staff/radiology">← Back to radiology</Link>}
      />
      <div className="staff-detail-grid">
        <section className="staff-panel">
          <div className="staff-panel__header"><h2>Order details</h2><ImagingStatusButtons orderId={order.id} status={order.status} /></div>
          <dl className="staff-detail-list">
            <div><dt>Patient</dt><dd>{patient ? `${patient.first_name} ${patient.last_name}` : "—"}{patient?.patient_number ? ` (${patient.patient_number})` : ""}</dd></div>
            <div><dt>Facility</dt><dd>{facility?.name ?? "—"}</dd></div>
            <div><dt>Exam</dt><dd>{test?.name} ({test?.code})</dd></div>
            <div><dt>Price</dt><dd>{Number(test?.price ?? 0).toLocaleString()} {test?.currency_code ?? "UGX"}</dd></div>
            <div><dt>Clinical indication</dt><dd>{order.clinical_indication || "Not provided"}</dd></div>
            <div><dt>Scheduled</dt><dd>{order.scheduled_at ? new Date(order.scheduled_at).toLocaleString() : "—"}</dd></div>
            <div><dt>Ordered</dt><dd>{new Date(order.created_at).toLocaleString()}</dd></div>
          </dl>
        </section>
        <section className="staff-panel">
          <div className="staff-panel__header"><h2>Report</h2>{report ? <span className={`staff-status ${report.status === "final" ? "staff-status--paid" : "staff-status--issued"}`}>{report.status}</span> : null}</div>
          {canReport || report ? (
            canReport ? <ImagingReportForm orderId={order.id} report={report} /> : (
              <dl className="staff-detail-list">
                <div><dt>Findings</dt><dd>{report?.findings || "—"}</dd></div>
                <div><dt>Impression</dt><dd>{report?.impression || "—"}</dd></div>
                <div><dt>Recommendations</dt><dd>{report?.recommendations || "—"}</dd></div>
              </dl>
            )
          ) : <p className="staff-table-empty">No report yet.</p>}
          {canApprove && report && report.status !== "final" ? (
            <p className="staff-table-sub" style={{ marginTop: ".75rem" }}>You have approval rights — ask a report writer to save, then approve here once visible.</p>
          ) : null}
        </section>
      </div>
    </div>
  );
}
