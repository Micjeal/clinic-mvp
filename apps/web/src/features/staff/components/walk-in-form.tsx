"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { createWalkInAction } from "@/server/actions/reception.actions";

const SEX_OPTIONS = [
  { value: "", label: "Prefer not to say" },
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "intersex", label: "Intersex" },
  { value: "unknown", label: "Unknown" },
];

export function WalkInForm({ facilities, departments, services }: {
  facilities: { id: string; name: string }[];
  departments: { id: string; name: string }[];
  services: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(createWalkInAction, null);
  const [hasPatientNumber, setHasPatientNumber] = useState(false);
  return <form action={action} className="staff-editor-sections">
    <section className="staff-editor-section">
      <p className="eyebrow">Step 1</p>
      <h2>Patient</h2>
      <div className="staff-form-grid">
        <label className="staff-form-grid__wide">Patient number<input name="patient_number" onChange={(event) => setHasPatientNumber(event.target.value.trim().length > 0)} placeholder="e.g. PAT-0001" type="search" /><small className="staff-field-hint">For a returning patient, enter their number — name fields become optional.</small></label>
        <label>First name<input name="first_name" required={!hasPatientNumber} /></label>
        <label>Last name<input name="last_name" required={!hasPatientNumber} /></label>
        <label>Phone<input name="phone" type="tel" /></label>
        <label>Date of birth<input name="date_of_birth" type="date" /></label>
        <label>Sex<select name="sex" defaultValue="">{SEX_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      </div>
    </section>
    <section className="staff-editor-section">
      <p className="eyebrow">Step 2</p>
      <h2>Visit details</h2>
      <div className="staff-form-grid">
        <label>Facility<select name="facility_id" required><option value="">Select facility</option>{facilities.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>Department<select name="department_id" required><option value="">Select department</option>{departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>Service<select name="service_id"><option value="">General consultation</option>{services.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="staff-form-grid__wide">Reason for visit<textarea name="chief_complaint" placeholder="Brief description of why the patient is here" rows={3} /></label>
      </div>
    </section>
    {state?.error ? <p className="form-error" role="alert">{state.error}</p> : null}
    {state && "success" in state ? <p className="form-success" role="status">{state.success}</p> : null}
    <div className="staff-form-actions">
      <Link className="btn btn-secondary" href="/staff/reception">Cancel</Link>
      <button className="btn btn-primary" disabled={pending} type="submit">{pending ? "Checking in…" : "Check in walk-in"}</button>
    </div>
  </form>;
}
