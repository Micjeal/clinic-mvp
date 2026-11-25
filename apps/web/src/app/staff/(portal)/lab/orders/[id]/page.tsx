import { notFound } from "next/navigation";
import { StaffPageHeader } from "@/features/staff/components/staff-content";
import { StaffAccessDenied } from "@/features/staff/components/access-denied";
import { getLabOrder } from "@/server/services/lab.service";
import { requirePermission } from "@/server/permissions/require-permission";
import { Permissions } from "@clinic/permissions";
import { AuthorizationError, NotFoundError } from "@/server/errors";
import { LabItemActions, LabResultForm, ApproveResultButton } from "@/features/lab/components/lab-workspace";
import { NotifyDoctorButton } from "@/features/lab/components/notify-doctor-button";
import Link from "next/link";
import { FlaskConical, UserRound, CalendarClock, StickyNote } from "lucide-react";

export const metadata = { title: "Lab order" };

const ITEM_STATUS: Record<string, string> = { ordered: "Ordered", sample_collected: "Sample collected", processing: "Processing", completed: "Completed", cancelled: "Cancelled" };

type OrderItem = {
  id: string; status: string; specimen_id: string | null;
  lab_tests: { id: string; code: string; name: string; specimen_type: string | null; default_unit: string | null; reference_range_text: string | null } | null;
  lab_results: { id: string; result_value: string | null; unit: string | null; reference_range: string | null; abnormal_flag: string | null; result_text: string | null; resulted_at: string | null; approved_at: string | null; patient_visible: boolean }[] | { id: string }[] | null;
};

export default async function LabOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let order;
  try {
    order = await getLabOrder(id);
  } catch (error) {
    if (error instanceof AuthorizationError) return <StaffAccessDenied />;
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
  const patient = order.patients as { first_name?: string; last_name?: string; patient_number?: string } | null;
  const items = (order.lab_order_items ?? []) as unknown as OrderItem[];
  const canWrite = await requirePermission(Permissions.LAB_RESULT_WRITE).then(() => true).catch(() => false);
  const canApprove = await requirePermission(Permissions.LAB_RESULT_APPROVE).then(() => true).catch(() => false);

  return (
    <div className="staff-page">
      <div className="staff-page-heading staff-page-heading--doctor lab-order-heading">
        <div className="staff-doctor-avatar lab-order-heading__icon" aria-hidden="true"><FlaskConical size={26} /></div>
        <div className="doctor-identity-copy">
          <p className="eyebrow">Clinical · Laboratory · Order</p>
          <h1>{patient ? `${patient.first_name} ${patient.last_name}` : "Lab order"}</h1>
          <div className="doctor-identity-meta lab-order-meta">
            <span className="lab-order-meta__chip">{patient?.patient_number ?? "—"}</span>
            <span className={`lab-order-meta__chip lab-order-meta__chip--${order.priority}`}>{order.priority.toUpperCase()}</span>
            <span className="lab-order-meta__chip">{order.status.replace("_", " ")}</span>
            <span className="lab-order-meta__chip"><CalendarClock size={12} aria-hidden="true" /> {new Date(order.ordered_at).toLocaleString("en-UG")}</span>
          </div>
        </div>
        <div className="staff-page-heading__actions"><div style={{ display: "flex", gap: ".5rem" }}><NotifyDoctorButton kind="lab" notified={Boolean((order as { clinician_notified_at?: string }).clinician_notified_at)} orderId={order.id} /><Link className="btn btn--secondary" href="/staff/lab">← Back</Link></div></div>
      </div>
      {order.clinical_notes ? <div className="lab-order-notes"><StickyNote size={15} aria-hidden="true" /><p>{order.clinical_notes}</p></div> : null}
      <section className="staff-panel lab-order-panel">
        <div className="staff-panel__header"><h2>Ordered tests</h2><span className="staff-table-sub">{items.length} item{items.length === 1 ? "" : "s"}</span></div>
        <div className="staff-table-wrap"><table className="staff-table">
          <thead><tr><th>Test</th><th>Specimen</th><th>Status</th><th>Result</th><th>Flag</th><th /></tr></thead>
          <tbody>
            {items.map((item) => {
              const test = item.lab_tests;
              const resultRows = Array.isArray(item.lab_results) ? item.lab_results : [];
              const result = resultRows[0] as OrderItem["lab_results"] extends (infer R)[] | null | undefined ? R : never;
              const approved = Boolean(result && "approved_at" in result && result.approved_at);
              return (
                <tr key={item.id}>
                  <td><strong>{test?.code}</strong> {test?.name}
                        <div className="lab-test-detail">{[test?.specimen_type, test?.default_unit, test?.reference_range_text ? `Ref: ${test.reference_range_text}` : null].filter(Boolean).join(" · ")}</div>
                      </td>
                  <td>{test?.specimen_type ?? "—"}</td>
                  <td><span className={`lab-test-status lab-test-status--${item.status}`}>{ITEM_STATUS[item.status] ?? item.status}</span></td>
                  <td><LabResultForm approved={approved} itemId={item.id} orderId={order.id} patientId={order.patient_id} readOnly={!canWrite || item.status === "cancelled"} referenceRange={test?.reference_range_text ?? null} result={result as never} unit={test?.default_unit ?? null} /></td>
                  <td>{result && "abnormal_flag" in result && result.abnormal_flag ? <span className={`lab-flag lab-flag--${String(result.abnormal_flag).toLowerCase()}`}>{String(result.abnormal_flag)}</span> : <span className="lab-flag lab-flag--normal">Normal</span>}</td>
                  <td>
                    <LabItemActions canWrite={canWrite} itemId={item.id} itemStatus={item.status} orderId={order.id} />
                    {canApprove && result && "id" in result && !approved ? <ApproveResultButton orderId={order.id} resultId={String(result.id)} /> : null}
                  </td>
                </tr>
              );
            })}
            {items.length === 0 ? <tr><td colSpan={6} className="staff-table-empty">No tests on this order.</td></tr> : null}
          </tbody>
        </table></div>
      </section>
    </div>
  );
}
