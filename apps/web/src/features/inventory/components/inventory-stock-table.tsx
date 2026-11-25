"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, PackageCheck, PackageX } from "lucide-react";

type Item = {
  id: string; sku: string; item_name: string; unit: string;
  on_hand_quantity: number; reorder_level: number; selling_price: number;
  facilities: { name?: string } | null;
};

export function InventoryStockTable({ items }: { items: Item[] }) {
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
        <thead><tr><th>SKU</th><th>Item</th><th>Facility</th><th className="staff-col-amount">On hand</th><th className="staff-col-amount">Reorder at</th><th>Status</th></tr></thead>
        <tbody>
          {filtered.length === 0 ? <tr><td className="staff-table-empty" colSpan={6}>{items.length === 0 ? "No inventory items yet." : "No items match your filters."}</td></tr> :
            filtered.map((item) => {
              const low = Number(item.on_hand_quantity) <= Number(item.reorder_level);
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
                </tr>
              );
            })}
        </tbody>
      </table></div>
    </>
  );
}
