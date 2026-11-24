"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createLabOrderAction } from "@/server/actions/lab.actions";

type Encounter = { id: string; patient_id: string; started_at: string | null; status: string | null; patients?: { first_name?: string; last_name?: string; patient_number?: string } | null };
type Test = { id: string; code: string; name: string; specimen_type: string | null; price: number; currency_code: string };

export function LabOrderForm({ encounters, tests }: { encounters: Encounter[]; tests: Test[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");

  const filteredTests = tests.filter((test) => `${test.code} ${test.name}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <form action={(formData) => startTransition(async () => {
      selected.forEach((id) => formData.append("test_ids", id));
      const result = await createLabOrderAction(null, formData);
      if (result.error) { setError(result.error); return; }
      if (result.orderId) router.push(`/staff/lab/orders/${result.orderId}`);
    })} className="staff-editor-sections">
      <section className="staff-editor-section">
        <p className="eyebrow">Order</p>
        <h2>New lab order</h2>
        <div className="staff-form-grid">
          <label>Encounter<select name="encounter_id" required>
            <option value="">Choose the encounter this order is for</option>
            {encounters.map((encounter) => {
              const patient = encounter.patients;
              return <option key={encounter.id} value={encounter.id}>{patient ? `${patient.first_name} ${patient.last_name}` : "Patient"}{patient?.patient_number ? ` • ${patient.patient_number}` : ""} — {encounter.started_at ? new Date(encounter.started_at).toLocaleDateString() : ""}</option>;
            })}
          </select></label>
          <label>Priority<select name="priority" defaultValue="routine"><option value="routine">Routine</option><option value="urgent">Urgent</option><option value="stat">STAT</option></select></label>
          <label className="staff-form-grid__wide">Clinical notes<textarea name="clinical_notes" rows={3} placeholder="Reason for testing, relevant history…" /></label>
        </div>
      </section>
      <section className="staff-editor-section">
        <p className="eyebrow">Tests</p>
        <h2>Select tests ({selected.length})</h2>
        <input onChange={(event) => setQuery(event.target.value)} placeholder="Filter tests…" style={{ marginBottom: "0.75rem", width: "100%" }} value={query} />
        <div className="staff-table-wrap" style={{ maxHeight: "22rem", overflowY: "auto" }}><table className="staff-table">
          <thead><tr><th /><th>Code</th><th>Test</th><th>Specimen</th><th className="staff-col-amount">Price</th></tr></thead>
          <tbody>
            {filteredTests.map((test) => (
              <tr key={test.id}>
                <td><input checked={selected.includes(test.id)} onChange={(event) => setSelected((prev) => event.target.checked ? [...prev, test.id] : prev.filter((id) => id !== test.id))} type="checkbox" /></td>
                <td>{test.code}</td><td>{test.name}</td><td>{test.specimen_type ?? "—"}</td>
                <td className="staff-col-amount">{Number(test.price).toLocaleString()} {test.currency_code}</td>
              </tr>
            ))}
            {filteredTests.length === 0 ? <tr><td colSpan={5} className="staff-table-empty">No tests match.</td></tr> : null}
          </tbody>
        </table></div>
      </section>
      {error ? <p className="staff-form-message staff-form-message--error" role="alert">{error}</p> : null}
      <div className="staff-form-actions"><button className="btn" disabled={pending || selected.length === 0} type="submit">{pending ? "Creating…" : "Create lab order"}</button></div>
    </form>
  );
}
