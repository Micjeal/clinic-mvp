"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveImagingReportAction, createImagingOrderAction, createImagingTestAction, saveImagingReportAction, setImagingStatusAction } from "@/server/actions/radiology.actions";

type Encounter = { id: string; started_at: string | null; patients?: { first_name?: string; last_name?: string; patient_number?: string } | null };
type Test = { id: string; code: string; name: string; modality: string; body_part: string | null; price: number; currency_code: string };

export function ImagingOrderForm({ encounters, tests, initialEncounterId = "" }: { encounters: Encounter[]; tests: Test[]; initialEncounterId?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [testId, setTestId] = useState("");
  const [encQuery, setEncQuery] = useState("");
  const [encounterId, setEncounterId] = useState(initialEncounterId);
  const [encOpen, setEncOpen] = useState(false);

  return (
    <form action={(formData) => startTransition(async () => {
      const result = await createImagingOrderAction(null, formData);
      if (result.error) { setError(result.error); return; }
      if (result.orderId) router.push(`/staff/radiology/orders/${result.orderId}`);
    })} className="staff-editor-sections">
      <section className="staff-editor-section">
        <p className="eyebrow">Order</p>
        <h2>New imaging order</h2>
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
          <label>Exam<select name="imaging_test_id" onChange={(e) => setTestId(e.target.value)} required value={testId}>
            <option value="">Choose the exam</option>
            {tests.map((test) => <option key={test.id} value={test.id}>{test.name} ({test.modality.toUpperCase()}){test.body_part ? ` — ${test.body_part}` : ""}</option>)}
          </select></label>
          <label>Priority<select name="priority" defaultValue="routine"><option value="routine">Routine</option><option value="urgent">Urgent</option><option value="stat">STAT</option></select></label>
          <label>Scheduled at<input name="scheduled_at" type="datetime-local" /></label>
          <label className="staff-form-grid__wide">Clinical indication<textarea name="clinical_indication" placeholder="Why this study is needed…" rows={3} /></label>
        </div>
      </section>
      {error ? <p className="staff-form-message staff-form-message--error" role="alert">{error}</p> : null}
      <div className="staff-form-actions"><button className="btn" disabled={pending || !testId} type="submit">{pending ? "Creating…" : "Create imaging order"}</button></div>
    </form>
  );
}

export function ImagingStatusButtons({ orderId, status }: { orderId: string; status: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const run = (next: string) => startTransition(async () => {
    const result = await setImagingStatusAction(orderId, next);
    setMessage(result.error ?? "");
    if (!result.error) window.location.reload();
  });
  const next = status === "ordered" ? "scheduled" : status === "scheduled" ? "in_progress" : status === "in_progress" ? "completed" : null;
  const labels: Record<string, string> = { scheduled: "Mark scheduled", in_progress: "Start exam", completed: "Complete" };
  if (!next || status === "cancelled" || status === "completed") return message ? <span className="staff-table-empty">{message}</span> : null;
  return (
    <span style={{ display: "inline-flex", gap: ".4rem", alignItems: "center" }}>
      <button className="btn btn--compact" disabled={pending} onClick={() => run(next)} type="button">{labels[next]}</button>
      {message ? <span className="staff-table-empty">{message}</span> : null}
    </span>
  );
}

export function ImagingReportForm({ orderId, report }: { orderId: string; report: { findings: string | null; impression: string | null; recommendations: string | null; status: string } | null }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [approveMessage, setApproveMessage] = useState("");
  const [approving, startApprove] = useTransition();
  const locked = report?.status === "final";
  return (
    <div>
      <form action={(formData) => startTransition(async () => {
        const result = await saveImagingReportAction(null, formData);
        setMessage(result.error ?? "Report saved.");
        if (!result.error) window.location.reload();
      })} className="staff-form-grid">
        <input name="order_id" type="hidden" value={orderId} />
        <label className="staff-form-grid__wide">Findings<textarea defaultValue={report?.findings ?? ""} name="findings" readOnly={locked} rows={4} /></label>
        <label className="staff-form-grid__wide">Impression<textarea defaultValue={report?.impression ?? ""} name="impression" readOnly={locked} rows={3} /></label>
        <label className="staff-form-grid__wide">Recommendations<textarea defaultValue={report?.recommendations ?? ""} name="recommendations" readOnly={locked} rows={2} /></label>
        {!locked ? <div className="staff-form-actions"><button className="btn btn--compact" disabled={pending} type="submit">{pending ? "Saving…" : "Save report"}</button>{message ? <span className="staff-table-empty">{message}</span> : null}</div> : null}
      </form>
      {locked ? <p className="staff-status staff-status--paid" style={{ marginTop: ".75rem" }}>Final report</p> : null}
      {report && !locked ? (
        <div className="staff-form-actions" style={{ marginTop: ".75rem" }}>
          <button className="btn btn--compact" disabled={approving} onClick={() => startApprove(async () => {
            const result = await approveImagingReportAction(orderId);
            setApproveMessage(result.error ?? "");
            if (!result.error) window.location.reload();
          })} type="button">{approving ? "Approving…" : "Approve & finalize"}</button>
          {approveMessage ? <span className="staff-table-empty">{approveMessage}</span> : null}
        </div>
      ) : null}
    </div>
  );
}

export function ImagingTestForm({ canManage }: { canManage: boolean }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  if (!canManage) return null;
  return (
    <form action={(formData) => startTransition(async () => {
      const result = await createImagingTestAction(null, formData);
      setMessage(result.error ?? "Exam added.");
      if (!result.error) window.location.reload();
    })} className="staff-form-grid" style={{ marginBottom: "1.25rem" }}>
      <label>Code<input name="code" placeholder="e.g. CXR-PA" required /></label>
      <label>Name<input name="name" placeholder="Chest X-ray PA" required /></label>
      <label>Modality<select name="modality" defaultValue="xray"><option value="xray">X-ray</option><option value="ultrasound">Ultrasound</option><option value="ct">CT</option><option value="mri">MRI</option><option value="mammography">Mammography</option><option value="fluoroscopy">Fluoroscopy</option><option value="other">Other</option></select></label>
      <label>Body part<input name="body_part" placeholder="e.g. Chest" /></label>
      <label>Price<input min="0" name="price" step="0.01" type="number" required /></label>
      <div className="staff-form-actions"><button className="btn btn--compact" disabled={pending} type="submit">{pending ? "Adding…" : "Add exam"}</button>{message ? <span className="staff-table-empty">{message}</span> : null}</div>
    </form>
  );
}
