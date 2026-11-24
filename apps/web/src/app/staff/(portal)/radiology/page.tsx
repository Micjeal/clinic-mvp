import { StaffPageHeader } from "@/features/staff/components/staff-content";
import { StaffAccessDenied } from "@/features/staff/components/access-denied";
import { listImagingOrders } from "@/server/services/radiology.service";
import { AuthorizationError } from "@/server/errors";
import Link from "next/link";

export const metadata = { title: "Radiology" };

const STATUS_LABELS: Record<string, string> = { ordered: "Ordered", scheduled: "Scheduled", in_progress: "In progress", completed: "Completed", cancelled: "Cancelled" };

export default async function RadiologyPage() {
  let orders;
  try {
    orders = await listImagingOrders();
  } catch (error) {
    if (error instanceof AuthorizationError) return <StaffAccessDenied />;
    throw error;
  }
  const active = orders.filter((o) => !["completed", "cancelled"].includes(o.status));
  const stat = orders.filter((o) => o.priority === "stat" && !["completed", "cancelled"].includes(o.status));

  return (
    <div className="staff-page">
      <StaffPageHeader eyebrow="Clinical" title="Radiology" description="Imaging orders and reports." actions={<div style={{ display: "flex", gap: ".5rem" }}><Link className="btn btn--secondary" href="/staff/radiology/tests">Exams</Link><Link className="btn" href="/staff/radiology/orders/new">New order</Link></div>} />
      <div className="staff-kpi-grid">
        <div className="staff-kpi"><span>Active orders</span><strong>{active.length}</strong></div>
        <div className="staff-kpi"><span>STAT pending</span><strong>{stat.length}</strong></div>
        <div className="staff-kpi"><span>Total orders</span><strong>{orders.length}</strong></div>
      </div>
      <section className="staff-panel">
        <div className="staff-table-wrap">
          <table className="staff-table">
            <thead><tr><th>Exam</th><th>Patient</th><th>Priority</th><th>Status</th><th>Ordered</th></tr></thead>
            <tbody>
              {orders.length === 0 ? <tr><td colSpan={5} className="staff-table-empty">No imaging orders yet.</td></tr> :
                orders.map((order) => {
                  const patient = order.patients as { first_name?: string; last_name?: string } | null;
                  const test = order.imaging_tests as { name?: string; modality?: string } | null;
                  return (
                    <tr key={order.id}>
                      <td><Link className="staff-table-link" href={`/staff/radiology/orders/${order.id}`}>{test?.name ?? "Imaging"}</Link><span className="staff-table-sub"> {test?.modality?.toUpperCase()}</span></td>
                      <td>{patient ? `${patient.first_name} ${patient.last_name}` : "—"}</td>
                      <td>{order.priority.toUpperCase()}</td>
                      <td><span className="staff-status staff-status--issued">{STATUS_LABELS[order.status] ?? order.status}</span></td>
                      <td>{new Date(order.created_at).toLocaleString()}</td>
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
