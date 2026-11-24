"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createInvoiceAction } from "@/server/actions/billing.actions";

type Patient = { id: string; first_name: string; last_name: string; patient_number: string | null };
type Facility = { id: string; name: string };
type Line = { description: string; quantity: string; unit_price: string };

export function InvoiceCreateForm({ patients, facilities }: { patients: Patient[]; facilities: Facility[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [lines, setLines] = useState<Line[]>([{ description: "", quantity: "1", unit_price: "" }]);
  const total = lines.reduce((sum, line) => sum + (Number(line.quantity) || 0) * (Number(line.unit_price) || 0), 0);

  const setLine = (index: number, patch: Partial<Line>) => setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));

  return (
    <form
      action={(formData) => startTransition(async () => {
        const result = await createInvoiceAction(null, formData);
        if (result.error) { setError(result.error); return; }
        if (result.invoiceId) router.push(`/staff/billing/${result.invoiceId}`);
      })}
      className="staff-editor-sections"
    >
      <section className="staff-editor-section">
        <p className="eyebrow">Patient &amp; facility</p>
        <h2>Who is being billed</h2>
        <div className="staff-form-grid">
          <label>Patient<select name="patient_id" required>
            <option value="">Choose a patient</option>
            {patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.first_name} {patient.last_name}{patient.patient_number ? ` (${patient.patient_number})` : ""}</option>)}
          </select></label>
          <label>Facility<select name="facility_id" required>
            <option value="">Choose a facility</option>
            {facilities.map((facility) => <option key={facility.id} value={facility.id}>{facility.name}</option>)}
          </select></label>
          <label>Currency<input defaultValue="UGX" maxLength={3} name="currency_code" /></label>
        </div>
      </section>
      <section className="staff-editor-section">
        <p className="eyebrow">Charges</p>
        <h2>Line items</h2>
        <div className="staff-table-wrap"><table className="staff-table">
          <thead><tr><th>Description</th><th>Qty</th><th>Unit price</th><th className="staff-col-amount">Amount</th><th /></tr></thead>
          <tbody>
            {lines.map((line, index) => (
              <tr key={index}>
                <td><input name={`description_${index}`} onChange={(e) => setLine(index, { description: e.target.value })} placeholder="e.g. Consultation" required value={line.description} /></td>
                <td><input name={`quantity_${index}`} onChange={(e) => setLine(index, { quantity: e.target.value })} style={{ width: "5rem" }} type="number" min="0.001" step="0.001" required value={line.quantity} /></td>
                <td><input name={`unit_price_${index}`} onChange={(e) => setLine(index, { unit_price: e.target.value })} style={{ width: "8rem" }} type="number" min="0" step="0.01" required value={line.unit_price} /></td>
                <td className="staff-col-amount">{((Number(line.quantity) || 0) * (Number(line.unit_price) || 0)).toLocaleString()}</td>
                <td>{lines.length > 1 ? <button className="btn btn--secondary btn--compact" onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))} type="button">Remove</button> : null}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
        <input name="items_json" type="hidden" value={JSON.stringify(lines.map((line) => ({ description: line.description, quantity: Number(line.quantity), unit_price: Number(line.unit_price) })))} />
        <div className="staff-form-actions" style={{ justifyContent: "space-between" }}>
          <button className="btn btn--secondary btn--compact" onClick={() => setLines((prev) => [...prev, { description: "", quantity: "1", unit_price: "" }])} type="button">+ Add line</button>
          <strong>Total: {total.toLocaleString()} UGX</strong>
        </div>
      </section>
      {error ? <p className="staff-form-message staff-form-message--error" role="alert">{error}</p> : null}
      <div className="staff-form-actions"><button className="btn" disabled={pending} type="submit">{pending ? "Creating…" : "Create draft invoice"}</button></div>
    </form>
  );
}
