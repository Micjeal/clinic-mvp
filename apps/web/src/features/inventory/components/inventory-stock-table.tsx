"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, PackageCheck, PackageX } from "lucide-react";
import { useTransition } from "react";
import { updateInventoryItemAction } from "@/server/actions/inventory.actions";

type Item = {
  id: string; sku: string; item_name: string; unit: string;
  on_hand_quantity: number; reorder_level: number; selling_price: number; cost_price?: number; is_active?: boolean;
  facilities: { name?: string } | null;
};

type Facility = { id: string; name: string };

export function InventoryStockTable({ items, facilities = [], canManage = false }: { items: Item[]; facilities?: Facility[]; canManage?: boolean }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [editMsg, setEditMsg] = useState("");
  const [query, setQuery] = useState("");
  const [lowOnly, setLowOnly] = useState(false);

  const filtered = useMemo(() => items.filter((item) => {
    const q = query.trim().toLowerCase();
    const matches = !q || `${item.sku} ${item.item_name} ${item.facilities?.name ?? ""}`.toLowerCase().includes(q);
    const isLow = Number(item.on_hand_quantity) <= Number(item.reorder_level);
    return matches && (!lowOnly || isLow);
  }), [items, query, lowOnly]);

  return (
    <>
      <div className="inventory-filters">
        <div className="inventory-search">
          <Search size={16} aria-hidden="true" />
          <input onChange={(e) => setQuery(e.target.value)} placeholder="Search SKU, item or facility…" value={query} />
        </div>
        <button className={`inventory-filter-pill${lowOnly ? " is-active" : ""}`} onClick={() => setLowOnly((v) => !v)} type="button">
          <PackageX size={14} aria-hidden="true" /> Low stock only
        </button>
        <span className="inventory-count">{filtered.length} of {items.length} items</span>
      </div>
      <div className="staff-table-wrap inventory-table-wrap"><table className="staff-table inventory-table">
        <thead><tr><th>SKU</th><th>Item</th><th>Facility</th><th className="staff-col-amount">On hand</th><th className="staff-col-amount">Reorder at</th><th>Status</th>{canManage ? <th /> : null}</tr></thead>
        <tbody>
          {filtered.length === 0 ? <tr><td className="staff-table-empty" colSpan={canManage ? 7 : 6}>{items.length === 0 ? "No inventory items yet." : "No items match your filters."}</td></tr> :
            filtered.map((item) => {
              const low = Number(item.on_hand_quantity) <= Number(item.reorder_level);
              if (editingId === item.id) {
                return (
                  <tr className="inventory-edit-row" key={item.id}>
                    <td colSpan={canManage ? 7 : 6}>
                      <form action={(fd) => startTransition(async () => {
                        fd.set("is_active", fd.get("is_active") ? "true" : "false");
                        const r = await updateInventoryItemAction(null, fd);
                        setEditMsg(r.error ?? "");
                        if (!r.error) { setEditingId(null); window.location.reload(); }
                      })} className="inventory-edit-form">
                        <input name="id" type="hidden" value={item.id} />
                        <div className="inventory-edit-grid">
                          <label>Facility<select defaultValue={item.facilities ? undefined : ""} name="facility_id" required>
                            {facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                          </select></label>
                          <label>SKU<input defaultValue={item.sku} name="sku" required /></label>
                          <label>Item name<input defaultValue={item.item_name} name="item_name" required /></label>
                          <label>Unit<input defaultValue={item.unit} name="unit" required /></label>
                          <label>Reorder level<input defaultValue={Number(item.reorder_level)} min="0" name="reorder_level" step="0.001" type="number" /></label>
                          <label>Cost price<input defaultValue={Number(item.cost_price ?? 0)} min="0" name="cost_price" step="0.01" type="number" /></label>
                          <label>Selling price<input defaultValue={Number(item.selling_price)} min="0" name="selling_price" step="0.01" type="number" /></label>
                          <label className="inventory-edit-active"><input defaultChecked={item.is_active !== false} name="is_active" type="checkbox" value="true" /> Active</label>
                        </div>
                        <div className="inventory-edit-actions">
                          <button className="btn btn--compact" disabled={pending} type="submit">{pending ? "Saving…" : "Save"}</button>
                          <button className="btn btn--secondary btn--compact" onClick={() => setEditingId(null)} type="button">Cancel</button>
                          {editMsg ? <span className="staff-table-empty">{editMsg}</span> : null}
                        </div>
                      </form>
                    </td>
                  </tr>
                );
              }
              return (
                <tr key={item.id}>
                  <td><span className="inventory-sku">{item.sku}</span></td>
                  <td><Link className="staff-table-link" href={`/staff/inventory/${item.id}`}>{item.item_name}</Link></td>
                  <td>{item.facilities?.name ?? "—"}</td>
                  <td className="staff-col-amount"><strong>{Number(item.on_hand_quantity).toLocaleString()}</strong> {item.unit}</td>
                  <td className="staff-col-amount">{Number(item.reorder_level).toLocaleString()}</td>
                  <td>{low
                    ? <span className="inventory-status inventory-status--low"><PackageX size={12} aria-hidden="true" /> Low stock</span>
                    : <span className="inventory-status inventory-status--ok"><PackageCheck size={12} aria-hidden="true" /> In stock</span>}</td>
                  {canManage ? <td><button className="btn btn--secondary btn--compact" onClick={() => setEditingId(item.id)} type="button">Edit</button></td> : null}
                </tr>
              );
            })}
        </tbody>
      </table></div>
    </>
  );
}
