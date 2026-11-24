import { notFound } from "next/navigation";
import { StaffPageHeader } from "@/features/staff/components/staff-content";
import { StaffAccessDenied } from "@/features/staff/components/access-denied";
import { getLabOrder } from "@/server/services/lab.service";
import { requirePermission } from "@/server/permissions/require-permission";
import { Permissions } from "@clinic/permissions";
import { AuthorizationError, NotFoundError } from "@/server/errors";
import { LabItemActions, LabResultForm, ApproveResultButton } from "@/features/lab/components/lab-workspace";
import Link from "next/link";

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
      <StaffPageHeader
        eyebrow="Clinical"
        title={`Lab order — ${patient ? `${patient.first_name} ${patient.last_name}` : "Patient"}`}
        description={`${order.priority.toUpperCase()} • ${order.status.replace("_", " ")} • ${new Date(order.ordered_at).toLocaleString()}`}
        actions={<Link className="btn btn--secondary" href="/staff/lab">← Back to laboratory</Link>}
      />
      {order.clinical_notes ? <p className="staff-table-sub" style={{ marginBottom: "1rem" }}>Notes: {order.clinical_notes}</p> : null}
      <section className="staff-panel">
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
                  <td><strong>{test?.code}</strong> {test?.name}</td>
                  <td>{test?.specimen_type ?? "—"}</td>
                  <td><span className="staff-status staff-status--issued">{ITEM_STATUS[item.status] ?? item.status}</span></td>
                  <td><LabResultForm approved={approved} itemId={item.id} orderId={order.id} patientId={order.patient_id} readOnly={!canWrite || item.status === "cancelled"} referenceRange={test?.reference_range_text ?? null} result={result as never} unit={test?.default_unit ?? null} /></td>
                  <td>{result && "abnormal_flag" in result ? String(result.abnormal_flag ?? "—") : "—"}</td>
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
