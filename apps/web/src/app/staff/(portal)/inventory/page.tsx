import { StaffKpiCard } from "@/features/staff/components/staff-content";
import { InventoryStockTable } from "@/features/inventory/components/inventory-stock-table";
import { StaffAccessDenied } from "@/features/staff/components/access-denied";
import { getInventoryForm, listInventory } from "@/server/services/inventory.service";
import { requirePermission } from "@/server/permissions/require-permission";
import { Permissions } from "@clinic/permissions";
import { AuthorizationError } from "@/server/errors";
import { InventoryItemForm, EssentialCatalogLoader } from "@/features/inventory/components/inventory-forms";
import { Boxes, PackageX, ArrowLeftRight } from "lucide-react";
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
      <div className="staff-page-heading staff-page-heading--doctor lab-order-heading">
        <div className="staff-doctor-avatar lab-order-heading__icon" aria-hidden="true"><Boxes size={26} /></div>
        <div className="doctor-identity-copy">
          <p className="eyebrow">Operations</p>
          <h1>Inventory</h1>
          <p>Stock levels, movements and reordering.</p>
        </div>
      </div>
      <div className="staff-kpi-grid">
        <StaffKpiCard icon={Boxes} label="Items" tone="teal" value={items.length} />
        <StaffKpiCard icon={PackageX} label="Low stock" tone={lowStock.length > 0 ? "amber" : "green"} value={lowStock.length} />
        <StaffKpiCard icon={ArrowLeftRight} label="Recent movements" tone="blue" value={movements.length} />
      </div>
      {canAdjust ? <section className="staff-panel inventory-add-panel"><div className="staff-panel__header"><h2>Add inventory item</h2></div><InventoryItemForm facilities={formData.facilities as never} /><EssentialCatalogLoader facilities={formData.facilities as never} /></section> : null}
      <section className="staff-panel inventory-panel">
        <div className="staff-panel__header"><h2>Stock items</h2><span className="staff-table-sub">{items.length} tracked</span></div>
        <InventoryStockTable items={items as never} />
      </section>
      <section className="staff-panel">
        <div className="staff-panel__header"><h2>Recent movements</h2></div>
        {movements.length === 0 ? <p className="staff-table-empty">No stock movements recorded.</p> : (
          <ul className="inventory-movements">{movements.slice(0, 15).map((movement) => {
            const mover = movement.profiles as { full_name?: string } | null;
            const inbound = ["opening","purchase","adjustment_in","return","transfer_in"].includes(movement.movement_type);
            return <li className="inventory-movement" key={movement.id}>
              <span className={`inventory-movement__icon${inbound ? "" : " inventory-movement__icon--out"}`} aria-hidden="true">{inbound ? "↓" : "↑"}</span>
              <span className="inventory-movement__body">
                <span className="inventory-movement__top"><span className={`inventory-movement__type inventory-movement__type--${inbound ? "in" : "out"}`}>{MOVEMENT_LABELS[movement.movement_type] ?? movement.movement_type}</span><strong>{Number(movement.quantity)} x {movement.batch_number ?? "stock"}</strong></span>
                <small>{mover?.full_name ?? "System"}</small>
              </span>
              <time className="inventory-movement__time">{new Date(movement.created_at).toLocaleString("en-UG", { dateStyle: "medium", timeStyle: "short" })}</time>
            </li>;
          })}</ul>
        )}
      </section>
    </div>
  );
}
