import { StaffPageHeader } from "@/features/staff/components/staff-content";
import { StaffAccessDenied } from "@/features/staff/components/access-denied";
import { listLabOrders } from "@/server/services/lab.service";
import { AuthorizationError } from "@/server/errors";
import Link from "next/link";
import { FlaskConical } from "lucide-react";

export const metadata = { title: "Laboratory" };

const STATUS_LABELS: Record<string, string> = { ordered: "Ordered", sample_collected: "Sample collected", processing: "Processing", completed: "Completed", cancelled: "Cancelled" };
const PRIORITY_LABELS: Record<string, string> = { routine: "Routine", urgent: "Urgent", stat: "STAT" };

export default async function LabPage() {
  let orders;
  try {
    orders = await listLabOrders();
  } catch (error) {
    if (error instanceof AuthorizationError) return <StaffAccessDenied />;
    throw error;
  }
  const active = orders.filter((o) => o.status !== "completed" && o.status !== "cancelled");
  const stat = orders.filter((o) => o.priority === "stat" && o.status !== "completed" && o.status !== "cancelled");

  return (
    <div className="staff-page">
      <div className="staff-page-heading staff-page-heading--doctor lab-order-heading">
        <div className="staff-doctor-avatar lab-order-heading__icon" aria-hidden="true"><FlaskConical size={26} /></div>
        <div className="doctor-identity-copy">
          <p className="eyebrow">Clinical · Laboratory</p>
          <h1>Laboratory</h1>
          <p>Lab orders, samples and results.</p>
        </div>
        <div className="staff-page-heading__actions" style={{ display: "flex", gap: ".5rem" }}><Link className="btn btn--secondary" href="/staff/lab/tests">Test catalog</Link><Link className="btn" href="/staff/lab/orders/new">New order</Link></div>
      </div>
      <div className="staff-kpi-grid">
        <div className="staff-kpi"><span>Active orders</span><strong>{active.length}</strong></div>
        <div className="staff-kpi"><span>STAT pending</span><strong>{stat.length}</strong></div>
        <div className="staff-kpi"><span>Total orders</span><strong>{orders.length}</strong></div>
      </div>
      <section className="staff-panel lab-list-panel">
        <div className="staff-table-wrap">
          <table className="staff-table">
            <thead><tr><th>Order</th><th>Patient</th><th>Priority</th><th>Tests</th><th>Status</th><th>Ordered</th></tr></thead>
            <tbody>
              {orders.length === 0 ? <tr><td colSpan={6} className="staff-table-empty">No lab orders yet.</td></tr> :
                orders.map((order) => {
                  const patient = order.patients as { id?: string; first_name?: string; last_name?: string; patient_number?: string } | null;
                  const items = (order.lab_order_items ?? []) as { id: string }[];
                  return (
                    <tr key={order.id}>
                      <td><Link className="staff-table-link" href={`/staff/lab/orders/${order.id}`}>{new Date(order.ordered_at).toLocaleDateString("en-UG")}</Link></td>
                      <td>{patient?.id ? <Link className="staff-table-link" href={`/staff/patients/${patient.id}`}>{patient.first_name} {patient.last_name}</Link> : patient ? `${patient.first_name} ${patient.last_name}` : "—"}</td>
                      <td><span className={`lab-order-meta__chip lab-order-meta__chip--${order.priority}`}>{PRIORITY_LABELS[order.priority] ?? order.priority}</span></td>
                      <td>{items.length}</td>
                      <td><span className={`lab-test-status lab-test-status--${order.status}`}>{STATUS_LABELS[order.status] ?? order.status}</span></td>
                      <td>{new Date(order.ordered_at).toLocaleString("en-UG", { dateStyle: "medium", timeStyle: "short" })}</td>
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
