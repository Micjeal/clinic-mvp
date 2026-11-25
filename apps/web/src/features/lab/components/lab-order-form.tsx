"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createLabOrderAction, requestLabTestAction } from "@/server/actions/lab.actions";

type Encounter = { id: string; patient_id: string; started_at: string | null; status: string | null; patients?: { first_name?: string; last_name?: string; patient_number?: string } | null };
type Test = { id: string; code: string; name: string; specimen_type: string | null; price: number; currency_code: string };

export function LabOrderForm({ encounters, tests, initialEncounterId = "" }: { encounters: Encounter[]; tests: Test[]; initialEncounterId?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [encQuery, setEncQuery] = useState("");
  const [encounterId, setEncounterId] = useState(initialEncounterId);

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
          <div className="staff-form-grid__wide encounter-picker">
            <span className="encounter-picker__label">Encounter</span>
            <div className="encounter-picker__search">
              <input onChange={(event) => setEncQuery(event.target.value)} placeholder="Search patient name or number…" value={encQuery} />
            </div>
            <div className="encounter-picker__list">
              {encounters.filter((encounter) => { const p = encounter.patients; return `${p?.first_name ?? ""} ${p?.last_name ?? ""} ${p?.patient_number ?? ""}`.toLowerCase().includes(encQuery.toLowerCase()); }).slice(0, 30).map((encounter) => {
                const patient = encounter.patients;
                const active = encounterId === encounter.id;
                return (
                  <button className={`encounter-picker__item${active ? " is-active" : ""}`} key={encounter.id} onClick={() => { setEncounterId(encounter.id); setEncQuery(""); }} type="button">
                    <span className="encounter-picker__avatar" aria-hidden="true">{(patient?.first_name?.[0] ?? "P")}{(patient?.last_name?.[0] ?? "")}</span>
                    <span className="encounter-picker__info">
                      <strong>{patient ? `${patient.first_name} ${patient.last_name}` : "Patient"}</strong>
                      <small>{patient?.patient_number ?? ""}{encounter.started_at ? ` · ${new Date(encounter.started_at).toLocaleDateString("en-UG")}` : ""}</small>
                    </span>
                    {active ? <span className="encounter-picker__check" aria-hidden="true">✓</span> : null}
                  </button>
                );
              })}
              {encounters.filter((encounter) => { const p = encounter.patients; return `${p?.first_name ?? ""} ${p?.last_name ?? ""} ${p?.patient_number ?? ""}`.toLowerCase().includes(encQuery.toLowerCase()); }).length === 0 ? <p className="encounter-picker__empty">No encounters match.</p> : null}
            </div>
            <input name="encounter_id" type="hidden" value={encounterId} required />
            {encounterId ? <p className="encounter-picker__selected">Selected: {(() => { const e = encounters.find((x) => x.id === encounterId); const p = e?.patients; return p ? `${p.first_name} ${p.last_name}${p.patient_number ? ` (${p.patient_number})` : ""}` : "Encounter selected"; })()}</p> : <p className="encounter-picker__selected encounter-picker__selected--hint">Choose a patient encounter above.</p>}
          </div>
          <label>Priority<select name="priority" defaultValue="routine"><option value="routine">Routine</option><option value="urgent">Urgent</option><option value="stat">STAT</option></select></label>
          <label className="staff-form-grid__wide">Clinical notes<textarea name="clinical_notes" rows={3} placeholder="Reason for testing, relevant history…" /></label>
        </div>
      </section>
      <section className="staff-editor-section">
        <p className="eyebrow">Tests</p>
        <h2>Select tests ({selected.length})</h2>
        <div style={{ display: "flex", gap: ".6rem", marginBottom: ".75rem" }}>
          <input onChange={(event) => setQuery(event.target.value)} placeholder="Search tests by name or code…" style={{ flex: 1 }} value={query} />
          <RequestTestButton />
        </div>
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


function RequestTestButton() {
  const [open, setOpen] = useState(false);
  const [reqState, setReqState] = useState<{ error?: string; success?: string } | null>(null);
  const [pending, startTransition] = useTransition();
  if (!open) return <button className="btn btn--secondary" onClick={() => setOpen(true)} type="button">Request new test</button>;
  return (
    <form action={(fd) => startTransition(async () => { const r = await requestLabTestAction(null, fd); setReqState(r); if (r?.success) setOpen(false); })} className="staff-form-grid" style={{ flex: 2 }}>
      <input name="name" placeholder="Test name" required />
      <input name="code" placeholder="Code (e.g. FBC)" required />
      <input name="price" placeholder="Price UGX" step="0.01" type="number" />
      <input name="specimen_type" placeholder="Specimen (blood, urine…)" />
      <div style={{ display: "flex", gap: ".5rem" }}>
        <button className="btn" disabled={pending} type="submit">{pending ? "Sending…" : "Request"}</button>
        <button className="btn btn--secondary" onClick={() => setOpen(false)} type="button">Cancel</button>
      </div>
      {reqState?.error ? <p className="error" role="alert">{reqState.error}</p> : null}
      {reqState?.success ? <p className="success">{reqState.success}</p> : null}
    </form>
  );
}
