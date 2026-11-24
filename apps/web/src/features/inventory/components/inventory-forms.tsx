"use client";

import { useState, useTransition } from "react";
import { createInventoryItemAction, recordMovementAction } from "@/server/actions/inventory.actions";

type Facility = { id: string; name: string };
type Item = { id: string; sku: string; item_name: string; unit: string; on_hand_quantity: number };

export function InventoryItemForm({ facilities }: { facilities: Facility[] }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  return (
    <form action={(formData) => startTransition(async () => {
      const result = await createInventoryItemAction(null, formData);
      setMessage(result.error ?? "Item added.");
      if (!result.error) window.location.reload();
    })} className="staff-form-grid" style={{ marginBottom: "1.25rem" }}>
      <label>Facility<select name="facility_id" required><option value="">Choose…</option>{facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></label>
      <label>SKU<input name="sku" placeholder="e.g. MED-AMX-500" required /></label>
      <label>Item name<input name="item_name" placeholder="Amoxicillin 500mg tablets" required /></label>
      <label>Unit<input name="unit" defaultValue="unit" /></label>
      <label>Opening qty<input min="0" name="on_hand_quantity" step="0.001" type="number" /></label>
      <label>Reorder level<input min="0" name="reorder_level" step="0.001" type="number" /></label>
      <label>Cost price<input min="0" name="cost_price" step="0.01" type="number" /></label>
      <label>Selling price<input min="0" name="selling_price" step="0.01" type="number" /></label>
      <div className="staff-form-actions"><button className="btn btn--compact" disabled={pending} type="submit">{pending ? "Adding…" : "Add item"}</button>{message ? <span className="staff-table-empty">{message}</span> : null}</div>
    </form>
  );
}

export function MovementForm({ item }: { item: Item }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  return (
    <form action={(formData) => startTransition(async () => {
      formData.set("item_id", item.id);
      const result = await recordMovementAction(null, formData);
      setMessage(result.error ?? "Movement recorded.");
      if (!result.error) window.location.reload();
    })} className="staff-form-grid">
      <input name="item_id" type="hidden" value={item.id} />
      <label>Type<select name="movement_type" required>
        <option value="purchase">Purchase (in)</option><option value="adjustment_in">Adjustment in</option>
        <option value="return">Return (in)</option><option value="transfer_in">Transfer in</option>
        <option value="dispense">Dispense (out)</option><option value="adjustment_out">Adjustment out</option>
        <option value="waste">Waste (out)</option><option value="transfer_out">Transfer out</option>
      </select></label>
      <label>Quantity<input min="0.001" name="quantity" required step="0.001" type="number" /></label>
      <label>Batch<input name="batch_number" /></label>
      <label>Expiry<input name="expiry_date" type="date" /></label>
      <label className="staff-form-grid__wide">Notes<input name="notes" /></label>
      <div className="staff-form-actions"><button className="btn btn--compact" disabled={pending} type="submit">{pending ? "Recording…" : "Record movement"}</button>{message ? <span className="staff-table-empty">{message}</span> : null}</div>
    </form>
  );
}
