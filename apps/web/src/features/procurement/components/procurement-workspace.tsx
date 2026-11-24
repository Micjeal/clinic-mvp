"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approvePoAction, createPurchaseOrderAction, createSupplierAction, receivePoItemAction } from "@/server/actions/procurement.actions";

type Supplier = { id: string; name: string };
type Item = { id: string; sku: string; item_name: string; unit: string };
type Facility = { id: string; name: string };
type PoLine = { inventory_item_id: string; description: string; quantity_ordered: string; unit_cost: string };

const EMPTY_LINE: PoLine = { inventory_item_id: "", description: "", quantity_ordered: "", unit_cost: "" };

export function PoForm({ suppliers, items, facilities }: { suppliers: Supplier[]; items: Item[]; facilities: Facility[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [lines, setLines] = useState<PoLine[]>([{ ...EMPTY_LINE }]);

  const setLine = (index: number, patch: Partial<PoLine>) => setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  const pickItem = (index: number, itemId: string) => {
    const item = items.find((row) => row.id === itemId);
    setLine(index, { inventory_item_id: itemId, description: item ? `${item.item_name} (${item.sku})` : "" });
  };

  return (
    <form action={(formData) => startTransition(async () => {
      formData.set("items_json", JSON.stringify(lines.filter((line) => line.description.trim())));
      const result = await createPurchaseOrderAction(null, formData);
      if (result.error) { setError(result.error); return; }
      if (result.poId) router.push(`/staff/procurement/${result.poId}`);
    })} className="staff-editor-sections">
      <section className="staff-editor-section">
        <p className="eyebrow">Purchase order</p>
        <h2>New PO</h2>
        <div className="staff-form-grid">
          <label>Supplier<select name="supplier_id" required>
            <option value="">Choose a supplier</option>
            {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
          </select></label>
          <label>Facility<select name="facility_id" required>
            <option value="">Choose a facility</option>
            {facilities.map((facility) => <option key={facility.id} value={facility.id}>{facility.name}</option>)}
          </select></label>
          <label>Expected at<input name="expected_at" type="date" /></label>
          <label className="staff-form-grid__wide">Notes<textarea name="notes" rows={2} /></label>
        </div>
      </section>
      <section className="staff-editor-section">
        <p className="eyebrow">Items</p>
        <h2>Order lines</h2>
        <div className="staff-table-wrap"><table className="staff-table">
          <thead><tr><th>Item</th><th>Description</th><th>Qty</th><th>Unit cost</th><th /></tr></thead>
          <tbody>
            {lines.map((line, index) => (
              <tr key={index}>
                <td><select onChange={(e) => pickItem(index, e.target.value)} value={line.inventory_item_id}>
                  <option value="">Custom / other</option>
                  {items.map((item) => <option key={item.id} value={item.id}>{item.item_name} ({item.sku})</option>)}
                </select></td>
                <td><input onChange={(e) => setLine(index, { description: e.target.value })} placeholder="Item description" value={line.description} /></td>
                <td><input onChange={(e) => setLine(index, { quantity_ordered: e.target.value })} style={{ width: "5rem" }} type="number" min="0.001" step="0.001" value={line.quantity_ordered} /></td>
                <td><input onChange={(e) => setLine(index, { unit_cost: e.target.value })} style={{ width: "7rem" }} type="number" min="0" step="0.01" value={line.unit_cost} /></td>
                <td>{lines.length > 1 ? <button className="btn btn--secondary btn--compact" onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))} type="button">✕</button> : null}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
        <div className="staff-form-actions"><button className="btn btn--secondary btn--compact" onClick={() => setLines((prev) => [...prev, { ...EMPTY_LINE }])} type="button">+ Add line</button></div>
      </section>
      {error ? <p className="staff-form-message staff-form-message--error" role="alert">{error}</p> : null}
      <div className="staff-form-actions"><button className="btn" disabled={pending} type="submit">{pending ? "Creating…" : "Create purchase order"}</button></div>
    </form>
  );
}

export function ApproveButton({ poId, status }: { poId: string; status: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  if (!["draft", "submitted"].includes(status)) return null;
  return (
    <span style={{ display: "inline-flex", gap: ".4rem", alignItems: "center" }}>
      <button className="btn btn--compact" disabled={pending} onClick={() => startTransition(async () => {
        const result = await approvePoAction(poId);
        setMessage(result.error ?? "");
        if (!result.error) window.location.reload();
      })} type="button">{pending ? "Approving…" : "Approve"}</button>
      {message ? <span className="staff-table-empty">{message}</span> : null}
    </span>
  );
}

export function ReceiveForm({ itemId, remaining, itemName }: { itemId: string; remaining: number; itemName: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  return (
    <form action={(formData) => startTransition(async () => {
      const result = await receivePoItemAction(null, formData);
      setMessage(result.error ?? "Received — stock updated.");
      if (!result.error) window.location.reload();
    })} className="staff-form-grid" style={{ minWidth: "14rem" }}>
      <input name="item_id" type="hidden" value={itemId} />
      <label>Qty received<input defaultValue={remaining} max={remaining} min="0.001" name="quantity_received" step="0.001" type="number" /></label>
      <div className="staff-form-actions"><button className="btn btn--compact" disabled={pending} type="submit">{pending ? "Receiving…" : `Receive ${itemName}`}</button>{message ? <span className="staff-table-empty">{message}</span> : null}</div>
    </form>
  );
}

export function SupplierForm() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  return (
    <form action={(formData) => startTransition(async () => {
      const result = await createSupplierAction(null, formData);
      setMessage(result.error ?? "Supplier added.");
      if (!result.error) window.location.reload();
    })} className="staff-form-grid" style={{ marginBottom: "1.25rem" }}>
      <label>Name<input name="name" required /></label>
      <label>Contact person<input name="contact_person" /></label>
      <label>Phone<input name="phone" /></label>
      <label>Email<input name="email" type="email" /></label>
      <label>Payment terms (days)<input defaultValue="30" min="0" name="payment_terms_days" type="number" /></label>
      <label className="staff-form-grid__wide">Address<input name="address" /></label>
      <div className="staff-form-actions"><button className="btn btn--compact" disabled={pending} type="submit">{pending ? "Adding…" : "Add supplier"}</button>{message ? <span className="staff-table-empty">{message}</span> : null}</div>
    </form>
  );
}
