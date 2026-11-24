import { notFound } from "next/navigation";
import { StaffPageHeader } from "@/features/staff/components/staff-content";
import { StaffAccessDenied } from "@/features/staff/components/access-denied";
import { getPurchaseOrder } from "@/server/services/procurement.service";
import { requirePermission } from "@/server/permissions/require-permission";
import { Permissions } from "@clinic/permissions";
import { AuthorizationError, NotFoundError } from "@/server/errors";
import { ApproveButton, ReceiveForm } from "@/features/procurement/components/procurement-workspace";
import Link from "next/link";

export const metadata = { title: "Purchase order" };

type PoItem = { id: string; description: string; quantity_ordered: number; quantity_received: number; unit_cost: number; inventory_item_id: string | null; inventory_items?: { sku?: string; item_name?: string; unit?: string } | null };

export default async function PoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let po;
  try {
    po = await getPurchaseOrder(id);
  } catch (error) {
    if (error instanceof AuthorizationError) return <StaffAccessDenied />;
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
  const supplier = po.suppliers as { name?: string; contact_person?: string; phone?: string; payment_terms_days?: number } | null;
  const facility = po.facilities as { name?: string } | null;
  const items = (po.purchase_order_items ?? []) as unknown as PoItem[];
  const canApprove = await requirePermission(Permissions.PROCUREMENT_APPROVE).then(() => true).catch(() => false);
  const canReceive = await requirePermission(Permissions.PROCUREMENT_MANAGE).then(() => true).catch(() => false);
  const receivable = ["approved", "partially_received"].includes(po.status);

  return (
    <div className="staff-page">
      <StaffPageHeader
        eyebrow="Operations"
        title={`PO ${po.po_number}`}
        description={`${supplier?.name ?? "Supplier"} • ${facility?.name ?? ""} • ${po.status.replace("_", " ")}`}
        actions={<Link className="btn btn--secondary" href="/staff/procurement">← Back to procurement</Link>}
      />
      <div className="staff-detail-grid">
        <section className="staff-panel">
          <div className="staff-panel__header"><h2>Line items</h2>{canApprove ? <ApproveButton poId={po.id} status={po.status} /> : null}</div>
          <div className="staff-table-wrap"><table className="staff-table">
            <thead><tr><th>Item</th><th>Qty ordered</th><th>Qty received</th><th className="staff-col-amount">Unit cost</th><th className="staff-col-amount">Line total</th>{receivable && canReceive ? <th>Receive</th> : null}</tr></thead>
            <tbody>
              {items.map((item) => {
                const remaining = Number(item.quantity_ordered) - Number(item.quantity_received);
                const linked = item.inventory_items as { item_name?: string; sku?: string } | null;
                return (
                  <tr key={item.id}>
                    <td>{item.description}{linked ? <span className="staff-table-sub"> → {linked.item_name} ({linked.sku})</span> : null}</td>
                    <td>{Number(item.quantity_ordered)}</td>
                    <td>{Number(item.quantity_received)}</td>
                    <td className="staff-col-amount">{Number(item.unit_cost).toLocaleString()}</td>
                    <td className="staff-col-amount">{(Number(item.quantity_ordered) * Number(item.unit_cost)).toLocaleString()}</td>
                    {receivable && canReceive ? <td>{remaining > 0 && item.inventory_item_id ? <ReceiveForm itemId={item.id} itemName={item.description.slice(0, 20)} remaining={remaining} /> : remaining > 0 ? <span className="staff-table-sub">No stock link</span> : <span className="staff-status staff-status--paid">Done</span>}</td> : null}
                  </tr>
                );
              })}
              {items.length === 0 ? <tr><td colSpan={6} className="staff-table-empty">No items.</td></tr> : null}
            </tbody>
          </table></div>
        </section>
        <section className="staff-panel">
          <div className="staff-panel__header"><h2>Details</h2></div>
          <dl className="staff-detail-list">
            <div><dt>Supplier</dt><dd>{supplier?.name}</dd></div>
            <div><dt>Contact</dt><dd>{supplier?.contact_person ?? "—"}{supplier?.phone ? ` • ${supplier.phone}` : ""}</dd></div>
            <div><dt>Terms</dt><dd>{supplier?.payment_terms_days ?? 30} days</dd></div>
            <div><dt>Expected</dt><dd>{po.expected_at ?? "—"}</dd></div>
            <div><dt>Notes</dt><dd>{po.notes || "—"}</dd></div>
          </dl>
        </section>
      </div>
    </div>
  );
}
