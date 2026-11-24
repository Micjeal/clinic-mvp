import { StaffPageHeader } from "@/features/staff/components/staff-content";
import { StaffAccessDenied } from "@/features/staff/components/access-denied";
import { listProcurement } from "@/server/services/procurement.service";
import { AuthorizationError } from "@/server/errors";
import Link from "next/link";

export const metadata = { title: "Procurement" };

const STATUS_LABELS: Record<string, string> = { draft: "Draft", submitted: "Submitted", approved: "Approved", partially_received: "Part received", received: "Received", cancelled: "Cancelled" };

export default async function ProcurementPage() {
  let data;
  try {
    data = await listProcurement();
  } catch (error) {
    if (error instanceof AuthorizationError) return <StaffAccessDenied />;
    throw error;
  }
  const { pos, suppliers } = data;
  const open = pos.filter((po) => !["received", "cancelled"].includes(po.status));
  const pendingApproval = pos.filter((po) => ["draft", "submitted"].includes(po.status));

  return (
    <div className="staff-page">
      <StaffPageHeader eyebrow="Operations" title="Procurement" description="Suppliers, purchase orders and receiving." actions={<div style={{ display: "flex", gap: ".5rem" }}><Link className="btn btn--secondary" href="/staff/procurement/suppliers">Suppliers</Link><Link className="btn" href="/staff/procurement/new">New PO</Link></div>} />
      <div className="staff-kpi-grid">
        <div className="staff-kpi"><span>Open POs</span><strong>{open.length}</strong></div>
        <div className="staff-kpi"><span>Awaiting approval</span><strong>{pendingApproval.length}</strong></div>
        <div className="staff-kpi"><span>Suppliers</span><strong>{suppliers.length}</strong></div>
      </div>
      <section className="staff-panel">
        <div className="staff-table-wrap">
          <table className="staff-table">
            <thead><tr><th>PO</th><th>Supplier</th><th>Items</th><th>Status</th><th>Expected</th><th>Created</th></tr></thead>
            <tbody>
              {pos.length === 0 ? <tr><td colSpan={6} className="staff-table-empty">No purchase orders yet.</td></tr> :
                pos.map((po) => {
                  const supplier = po.suppliers as { name?: string } | null;
                  const items = (po.purchase_order_items ?? []) as { id: string }[];
                  return (
                    <tr key={po.id}>
                      <td><Link className="staff-table-link" href={`/staff/procurement/${po.id}`}>{po.po_number}</Link></td>
                      <td>{supplier?.name ?? "—"}</td>
                      <td>{items.length}</td>
                      <td><span className="staff-status staff-status--issued">{STATUS_LABELS[po.status] ?? po.status}</span></td>
                      <td>{po.expected_at ?? "—"}</td>
                      <td>{new Date(po.created_at).toLocaleDateString()}</td>
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
