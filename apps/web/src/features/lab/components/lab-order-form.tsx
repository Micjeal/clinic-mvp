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
  const [encOpen, setEncOpen] = useState(false);
  const [priority, setPriority] = useState("routine");

  const filteredTests = tests.filter((test) => `${test.code} ${test.name}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <form action={(formData) => startTransition(async () => {
      selected.forEach((id) => formData.append("test_ids", id));
      const result = await createLabOrderAction(null, formData);
      if (result.error) { setError(result.error); return; }
      if (result.orderId) router.push(`/staff/lab/orders/${result.orderId}`);
    })} className="staff-editor-sections lab-order-form">
      <section className="staff-editor-section">
        <p className="eyebrow">Order</p>
        <h2>New lab order</h2>
        <div className="staff-form-grid">
          <div className="staff-form-grid__wide encounter-picker" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setEncOpen(false); }}>
            <span className="encounter-picker__label">Encounter</span>
            <button aria-expanded={encOpen} className="encounter-picker__toggle" onClick={() => setEncOpen((v) => !v)} type="button">
              {encounterId ? (() => { const e = encounters.find((x) => x.id === encounterId); const p = e?.patients; return p ? `${p.first_name} ${p.last_name}${p.patient_number ? ` (${p.patient_number})` : ""}` : "Encounter selected"; })() : "Choose a patient encounter…"}
              <span className="encounter-picker__chevron" aria-hidden="true">▾</span>
            </button>
            {encOpen ? <>
              <div className="encounter-picker__search">
                <input autoFocus onChange={(event) => setEncQuery(event.target.value)} placeholder="Search patient name or number…" value={encQuery} />
              </div>
              {(() => { const filtered = encounters.filter((encounter) => { const p = encounter.patients; return `${p?.first_name ?? ""} ${p?.last_name ?? ""} ${p?.patient_number ?? ""}`.toLowerCase().includes(encQuery.toLowerCase()); }); return <p className="encounter-picker__count">{filtered.length} encounter{filtered.length === 1 ? "" : "s"}{filtered.length > 30 ? ` — showing first 30, refine your search` : ""}</p>; })()}
              <div className="encounter-picker__list">
                {encounters.filter((encounter) => { const p = encounter.patients; return `${p?.first_name ?? ""} ${p?.last_name ?? ""} ${p?.patient_number ?? ""}`.toLowerCase().includes(encQuery.toLowerCase()); }).slice(0, 30).map((encounter) => {
                  const patient = encounter.patients;
                  const active = encounterId === encounter.id;
                  return (
                    <button className={`encounter-picker__item${active ? " is-active" : ""}`} key={encounter.id} onClick={() => { setEncounterId(encounter.id); setEncQuery(""); setEncOpen(false); }} type="button">
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
            </> : null}
            <input name="encounter_id" type="hidden" value={encounterId} required />
          </div>
          <div className="staff-form-grid__wide priority-picker">
            <span className="encounter-picker__label">Priority</span>
            <div className="priority-picker__options">
              {([["routine","Routine"],["urgent","Urgent"],["stat","STAT"]] as const).map(([value,label]) => (
                <button className={`priority-picker__option${priority === value ? " is-active" : ""}${value === "stat" ? " priority-picker__option--stat" : value === "urgent" ? " priority-picker__option--urgent" : ""}`} key={value} onClick={() => setPriority(value)} type="button">{label}</button>
              ))}
            </div>
            <input name="priority" type="hidden" value={priority} />
          </div>
          <label className="staff-form-grid__wide">Clinical notes<textarea name="clinical_notes" rows={3} placeholder="Reason for testing, relevant history…" /></label>
        </div>
      </section>
      <section className="staff-editor-section">
        <p className="eyebrow">Tests</p>
        <h2>Select tests <span className="lab-order-count">{selected.length} selected</span></h2>
        <div className="lab-order-tests-toolbar">
          <div className="lab-order-search lab-order-search--grow"><input onChange={(event) => setQuery(event.target.value)} placeholder="Search tests by name or code…" value={query} /></div>
          <RequestTestButton />
        </div>
        <p className="lab-order-tests-count">{filteredTests.length} test{filteredTests.length === 1 ? "" : "s"} available</p>
        <div className="staff-table-wrap lab-order-tests-table"><table className="staff-table">
          <thead><tr><th /><th>Code</th><th>Test</th><th>Specimen</th><th className="staff-col-amount">Price</th></tr></thead>
          <tbody>
            {filteredTests.map((test) => {
              const isSelected = selected.includes(test.id);
              return (
                <tr className={isSelected ? "is-selected" : ""} key={test.id}>
                  <td><input checked={isSelected} onChange={(event) => setSelected((prev) => event.target.checked ? [...prev, test.id] : prev.filter((id) => id !== test.id))} type="checkbox" /></td>
                  <td><span className="lab-order-code">{test.code}</span></td><td>{test.name}</td><td>{test.specimen_type ?? "—"}</td>
                  <td className="staff-col-amount">{Number(test.price).toLocaleString()} {test.currency_code}</td>
                </tr>
              );
            })}
            {filteredTests.length === 0 ? <tr><td colSpan={5} className="staff-table-empty">No tests match — try another search or request a new test.</td></tr> : null}
          </tbody>
        </table></div>
      </section>
      {error ? <p className="staff-form-message staff-form-message--error" role="alert">{error}</p> : null}
      <div className="staff-form-actions lab-order-actions"><span className="lab-order-actions__hint">{selected.length === 0 ? "Select at least one test to continue" : `${selected.length} test${selected.length === 1 ? "" : "s"} ready to order`}</span><button className="btn" disabled={pending || selected.length === 0} type="submit">{pending ? "Creating…" : "Create lab order"}</button></div>
    </form>
  );
}


function RequestTestButton() {
  const [open, setOpen] = useState(false);
  const [reqState, setReqState] = useState<{ error?: string; success?: string } | null>(null);
  const [pending, startTransition] = useTransition();
  if (!open) return <button className="btn lab-order-request-btn" onClick={() => setOpen(true)} type="button">+ Request new test</button>;
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
