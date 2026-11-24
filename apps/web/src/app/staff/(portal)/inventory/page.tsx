import { StaffPageHeader } from "@/features/staff/components/staff-content";
import { StaffAccessDenied } from "@/features/staff/components/access-denied";
import { getInventoryForm, listInventory } from "@/server/services/inventory.service";
import { requirePermission } from "@/server/permissions/require-permission";
import { Permissions } from "@clinic/permissions";
import { AuthorizationError } from "@/server/errors";
import { InventoryItemForm } from "@/features/inventory/components/inventory-forms";
import Link from "next/link";

export const metadata = { title: "Inventory" };

const MOVEMENT_LABELS: Record<string, string> = { opening: "Opening", purchase: "Purchase", adjustment_in: "Adj in", adjustment_out: "Adj out", dispense: "Dispense", return: "Return", transfer_in: "Transfer in", transfer_out: "Transfer out", waste: "Waste" };

export default async function InventoryPage() {
  let data;
  try {
    data = await listInventory();
  } catch (error) {
    if (error instanceof AuthorizationError) return <StaffAccessDenied />;
    throw error;
  }
  const canAdjust = await requirePermission(Permissions.INVENTORY_ADJUST).then(() => true).catch(() => false);
  const formData = canAdjust ? await getInventoryForm().catch(() => ({ facilities: [] })) : { facilities: [] };
  const { items, movements } = data;
  const lowStock = items.filter((item) => Number(item.on_hand_quantity) <= Number(item.reorder_level));

  return (
    <div className="staff-page">
      <StaffPageHeader eyebrow="Operations" title="Inventory" description="Stock levels, movements and reordering." />
      <div className="staff-kpi-grid">
        <div className="staff-kpi"><span>Items</span><strong>{items.length}</strong></div>
        <div className="staff-kpi"><span>Low stock</span><strong>{lowStock.length}</strong></div>
        <div className="staff-kpi"><span>Recent movements</span><strong>{movements.length}</strong></div>
      </div>
      {canAdjust ? <section className="staff-panel"><div className="staff-panel__header"><h2>Add inventory item</h2></div><InventoryItemForm facilities={formData.facilities as never} /></section> : null}
      <section className="staff-panel">
        <div className="staff-panel__header"><h2>Stock items</h2></div>
        <div className="staff-table-wrap"><table className="staff-table">
          <thead><tr><th>SKU</th><th>Item</th><th>Facility</th><th className="staff-col-amount">On hand</th><th className="staff-col-amount">Reorder at</th><th>Price</th></tr></thead>
          <tbody>
            {items.length === 0 ? <tr><td colSpan={6} className="staff-table-empty">No inventory items yet.</td></tr> :
              items.map((item) => {
                const facility = item.facilities as { name?: string } | null;
                const low = Number(item.on_hand_quantity) <= Number(item.reorder_level);
                return (
                  <tr key={item.id}>
                    <td>{item.sku}</td>
                    <td><Link className="staff-table-link" href={`/staff/inventory/${item.id}`}>{item.item_name}</Link>{low ? <span className="staff-status staff-status--issued" style={{ marginLeft: ".4rem" }}>Low</span> : null}</td>
                    <td>{facility?.name ?? "—"}</td>
                    <td className="staff-col-amount">{Number(item.on_hand_quantity).toLocaleString()} {item.unit}</td>
                    <td className="staff-col-amount">{Number(item.reorder_level).toLocaleString()}</td>
                    <td>{Number(item.selling_price).toLocaleString()}</td>
                  </tr>
                );
              })}
          </tbody>
        </table></div>
      </section>
      <section className="staff-panel">
        <div className="staff-panel__header"><h2>Recent movements</h2></div>
        {movements.length === 0 ? <p className="staff-table-empty">No stock movements recorded.</p> : (
          <ul className="staff-simple-list">{movements.slice(0, 15).map((movement) => {
            const mover = movement.profiles as { full_name?: string } | null;
            return <li key={movement.id}><span>{MOVEMENT_LABELS[movement.movement_type] ?? movement.movement_type} — {Number(movement.quantity)} × {movement.batch_number ?? ""}</span><span>{mover?.full_name ?? "System"} • {new Date(movement.created_at).toLocaleString()}</span></li>;
          })}</ul>
        )}
      </section>
    </div>
  );
}
