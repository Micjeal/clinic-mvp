"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClaimAction, createPolicyAction, createSchemeAction, processClaimAction, submitClaimAction } from "@/server/actions/insurance.actions";

type Invoice = { id: string; invoice_number: string; patient_id: string; total: number; balance: number; currency_code: string; patients?: { first_name?: string; last_name?: string; patient_number?: string } | null };
type Scheme = { id: string; name: string; scheme_type: string; coverage_percent: number };
type Patient = { id: string; first_name: string; last_name: string; patient_number: string | null };

export function ClaimForm({ invoices, schemes, patients, facilities }: { invoices: Invoice[]; schemes: Scheme[]; patients: Patient[]; facilities: { id: string; name: string }[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const invoice = invoices.find((item) => item.id === invoiceId);

  return (
    <form action={(formData) => startTransition(async () => {
      const result = await createClaimAction(null, formData);
      if (result.error) { setError(result.error); return; }
      if (result.claimId) router.push(`/staff/insurance/claims/${result.claimId}`);
    })} className="staff-editor-sections">
      <section className="staff-editor-section">
        <p className="eyebrow">Claim</p>
        <h2>New insurance claim</h2>
        <div className="staff-form-grid">
          <label>Invoice (optional)<select name="invoice_id" onChange={(e) => setInvoiceId(e.target.value)} value={invoiceId}>
            <option value="">Manual claim — no invoice</option>
            {invoices.map((item) => {
              const patient = item.patients;
              return <option key={item.id} value={item.id}>{item.invoice_number} — {patient ? `${patient.first_name} ${patient.last_name}` : "Patient"} • {Number(item.balance).toLocaleString()} due</option>;
            })}
          </select></label>
          <label>Scheme<select name="insurance_scheme_id" required>
            <option value="">Choose a scheme</option>
            {schemes.map((scheme) => <option key={scheme.id} value={scheme.id}>{scheme.name} ({scheme.scheme_type.toUpperCase()})</option>)}
          </select></label>
          <label>Patient<select name="patient_id" required>
            <option value="">Choose a patient</option>
            {patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.first_name} {patient.last_name}{patient.patient_number ? ` (${patient.patient_number})` : ""}</option>)}
          </select></label>
          <label>Facility<select name="facility_id" required>
            <option value="">Choose a facility</option>
            {facilities.map((facility) => <option key={facility.id} value={facility.id}>{facility.name}</option>)}
          </select></label>
          <label>Claimed amount<input defaultValue={invoice ? Number(invoice.balance) : ""} min="0.01" name="claimed_amount" required step="0.01" type="number" /></label>
          <label>Currency<input defaultValue={invoice?.currency_code ?? "UGX"} maxLength={3} name="currency_code" /></label>
          <label className="staff-form-grid__wide">Diagnosis summary<input name="diagnosis_summary" placeholder="e.g. Severe malaria, admitted 2 days" /></label>
          <label className="staff-form-grid__wide">Notes<textarea name="notes" rows={2} /></label>
        </div>
      </section>
      {error ? <p className="staff-form-message staff-form-message--error" role="alert">{error}</p> : null}
      <div className="staff-form-actions"><button className="btn" disabled={pending} type="submit">{pending ? "Creating…" : "Create claim"}</button></div>
    </form>
  );
}

export function ClaimActions({ claimId, status, canProcess }: { claimId: string; status: string; canProcess: boolean }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const run = (fn: () => Promise<{ error?: string }>) => startTransition(async () => {
    const result = await fn();
    setMessage(result.error ?? "");
    if (!result.error) window.location.reload();
  });
  return (
    <div>
      <div className="staff-form-actions" style={{ flexWrap: "wrap" }}>
        {status === "draft" ? <button className="btn btn--compact" disabled={pending} onClick={() => run(() => submitClaimAction(claimId))} type="button">Submit to scheme</button> : null}
        {canProcess && status === "submitted" ? <button className="btn btn--compact" disabled={pending} onClick={() => run(() => processInline(claimId, "under_review"))} type="button">Start review</button> : null}
      </div>
      {canProcess && ["under_review", "approved"].includes(status) ? <ProcessForm claimId={claimId} /> : null}
      {message ? <p className="staff-table-empty">{message}</p> : null}
    </div>
  );
}

function processInline(claimId: string, action: "under_review") {
  const formData = new FormData();
  formData.set("claim_id", claimId);
  formData.set("action", action);
  return processClaimAction(null, formData);
}

function ProcessForm({ claimId }: { claimId: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  return (
    <form action={(formData) => startTransition(async () => {
      const result = await processClaimAction(null, formData);
      setMessage(result.error ?? "Done.");
      if (!result.error) window.location.reload();
    })} className="staff-form-grid" style={{ marginTop: "1rem" }}>
      <input name="claim_id" type="hidden" value={claimId} />
      <label>Decision<select name="action"><option value="approved">Approve</option><option value="denied">Deny</option><option value="paid">Mark paid</option></select></label>
      <label>Approved amount<input min="0" name="approved_amount" step="0.01" type="number" /></label>
      <label>Paid amount<input min="0" name="paid_amount" step="0.01" type="number" /></label>
      <div className="staff-form-actions"><button className="btn btn--compact" disabled={pending} type="submit">{pending ? "Processing…" : "Apply decision"}</button>{message ? <span className="staff-table-empty">{message}</span> : null}</div>
    </form>
  );
}

export function SchemeForm() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  return (
    <form action={(formData) => startTransition(async () => {
      const result = await createSchemeAction(null, formData);
      setMessage(result.error ?? "Scheme added.");
      if (!result.error) window.location.reload();
    })} className="staff-form-grid" style={{ marginBottom: "1.25rem" }}>
      <label>Name<input name="name" placeholder="e.g. NHIF" required /></label>
      <label>Type<select name="scheme_type" defaultValue="private"><option value="nhif">NHIF</option><option value="private">Private</option><option value="employer">Employer</option><option value="community">Community</option><option value="other">Other</option></select></label>
      <label>Phone<input name="contact_phone" /></label>
      <label>Email<input name="contact_email" type="email" /></label>
      <label>Coverage %<input max="100" min="0" name="coverage_percent" step="0.01" type="number" /></label>
      <label style={{ display: "flex", alignItems: "center", gap: ".5rem" }}><input name="preauth_required" type="checkbox" value="true" /> Pre-authorisation required</label>
      <div className="staff-form-actions"><button className="btn btn--compact" disabled={pending} type="submit">{pending ? "Adding…" : "Add scheme"}</button>{message ? <span className="staff-table-empty">{message}</span> : null}</div>
    </form>
  );
}

export function PolicyForm({ patients, schemes }: { patients: Patient[]; schemes: Scheme[] }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  return (
    <form action={(formData) => startTransition(async () => {
      const result = await createPolicyAction(null, formData);
      setMessage(result.error ?? "Policy added.");
      if (!result.error) window.location.reload();
    })} className="staff-form-grid" style={{ marginBottom: "1.25rem" }}>
      <label>Patient<select name="patient_id" required><option value="">Choose…</option>{patients.map((p) => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}</select></label>
      <label>Scheme<select name="insurance_scheme_id" required><option value="">Choose…</option>{schemes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
      <label>Policy number<input name="policy_number" required /></label>
      <label>Member number<input name="member_number" /></label>
      <label>Group number<input name="group_number" /></label>
      <label>Coverage %<input max="100" min="0" name="coverage_percent" step="0.01" type="number" /></label>
      <label>Valid from<input name="valid_from" type="date" /></label>
      <label>Valid to<input name="valid_to" type="date" /></label>
      <div className="staff-form-actions"><button className="btn btn--compact" disabled={pending} type="submit">{pending ? "Adding…" : "Add policy"}</button>{message ? <span className="staff-table-empty">{message}</span> : null}</div>
    </form>
  );
}
