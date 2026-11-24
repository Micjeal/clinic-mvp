import { notFound } from "next/navigation";
import { StaffPageHeader } from "@/features/staff/components/staff-content";
import { StaffAccessDenied } from "@/features/staff/components/access-denied";
import { getInventoryItem } from "@/server/services/inventory.service";
import { requirePermission } from "@/server/permissions/require-permission";
import { Permissions } from "@clinic/permissions";
import { AuthorizationError, NotFoundError } from "@/server/errors";
import { MovementForm } from "@/features/inventory/components/inventory-forms";
import Link from "next/link";

export const metadata = { title: "Inventory item" };

const MOVEMENT_LABELS: Record<string, string> = { opening: "Opening", purchase: "Purchase", adjustment_in: "Adj in", adjustment_out: "Adj out", dispense: "Dispense", return: "Return", transfer_in: "Transfer in", transfer_out: "Transfer out", waste: "Waste" };

export default async function InventoryItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let data;
  try {
    data = await getInventoryItem(id);
  } catch (error) {
    if (error instanceof AuthorizationError) return <StaffAccessDenied />;
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
  const { item, movements } = data;
  const canAdjust = await requirePermission(Permissions.INVENTORY_ADJUST).then(() => true).catch(() => false);
  const facility = item.facilities as { name?: string } | null;

  return (
    <div className="staff-page">
      <StaffPageHeader eyebrow="Operations" title={item.item_name} description={`${item.sku} • ${facility?.name ?? ""}`} actions={<Link className="btn btn--secondary" href="/staff/inventory">← Back to inventory</Link>} />
      <div className="staff-detail-grid">
        <section className="staff-panel">
          <div className="staff-panel__header"><h2>Stock movements</h2></div>
          {movements.length === 0 ? <p className="staff-table-empty">No movements yet.</p> : (
            <ul className="staff-simple-list">{movements.map((movement) => {
              const mover = movement.profiles as { full_name?: string } | null;
              return <li key={movement.id}><span>{MOVEMENT_LABELS[movement.movement_type] ?? movement.movement_type} — {Number(movement.quantity)} {item.unit}{movement.batch_number ? ` • batch ${movement.batch_number}` : ""}</span><span>{mover?.full_name ?? "System"} • {new Date(movement.created_at).toLocaleString()}</span></li>;
            })}</ul>
          )}
        </section>
        <div className="staff-detail-side">
          <section className="staff-panel">
            <div className="staff-panel__header"><h2>Details</h2></div>
            <dl className="staff-detail-list">
              <div><dt>On hand</dt><dd><strong>{Number(item.on_hand_quantity).toLocaleString()} {item.unit}</strong></dd></div>
              <div><dt>Reorder level</dt><dd>{Number(item.reorder_level).toLocaleString()}</dd></div>
              <div><dt>Cost price</dt><dd>{Number(item.cost_price).toLocaleString()}</dd></div>
              <div><dt>Selling price</dt><dd>{Number(item.selling_price).toLocaleString()}</dd></div>
            </dl>
          </section>
          {canAdjust ? <section className="staff-panel"><div className="staff-panel__header"><h2>Record movement</h2></div><MovementForm item={item as never} /></section> : null}
        </div>
      </div>
    </div>
  );
}
