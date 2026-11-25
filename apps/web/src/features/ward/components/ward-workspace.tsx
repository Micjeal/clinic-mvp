"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addBedAction, admitPatientAction, createWardAction, dischargeAdmissionAction } from "@/server/actions/ward.actions";

type Patient = { id: string; first_name: string; last_name: string; patient_number: string | null };
type Ward = { id: string; name: string; ward_type: string; beds?: { id: string; bed_number: string; status: string }[] };
type Facility = { id: string; name: string };

export function AdmitForm({ wards, patients, facilities, initialPatientId = "", encounterId = "" }: { wards: Ward[]; patients: Patient[]; facilities: Facility[]; initialPatientId?: string; encounterId?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [wardId, setWardId] = useState("");
  const [patientId, setPatientId] = useState(initialPatientId);
  const ward = wards.find((item) => item.id === wardId);
  const freeBeds = (ward?.beds ?? []).filter((bed) => bed.status === "available");

  return (
    <form action={(formData) => startTransition(async () => {
      const result = await admitPatientAction(null, formData);
      if (result.error) { setError(result.error); return; }
      if (result.admissionId) router.push(`/staff/wards/admissions/${result.admissionId}`);
    })} className="staff-editor-sections">
      <section className="staff-editor-section">
        <p className="eyebrow">Admission</p>
        <h2>Admit a patient</h2>
        <div className="staff-form-grid">
          {encounterId ? <input name="encounter_id" type="hidden" value={encounterId} /> : null}
          <label>Patient<select name="patient_id" onChange={(e) => setPatientId(e.target.value)} required value={patientId}>
            <option value="">Choose a patient</option>
            {patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.first_name} {patient.last_name}{patient.patient_number ? ` (${patient.patient_number})` : ""}</option>)}
          </select></label>
          <label>Facility<select name="facility_id" required>
            <option value="">Choose a facility</option>
            {facilities.map((facility) => <option key={facility.id} value={facility.id}>{facility.name}</option>)}
          </select></label>
          <label>Ward<select name="ward_id" onChange={(e) => setWardId(e.target.value)} required value={wardId}>
            <option value="">Choose a ward</option>
            {wards.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.ward_type.replace("_", " ")})</option>)}
          </select></label>
          <label>Bed<select name="bed_id" defaultValue="">
            <option value="">Auto-assign first available</option>
            {freeBeds.map((bed) => <option key={bed.id} value={bed.id}>{bed.bed_number}</option>)}
          </select></label>
          <label className="staff-form-grid__wide">Reason for admission<textarea name="reason_for_admission" rows={2} placeholder="e.g. Severe malaria, IV antibiotics" /></label>
          <label className="staff-form-grid__wide">Diagnosis on admission<input name="diagnosis_on_admission" placeholder="e.g. Plasmodium falciparum malaria" /></label>
        </div>
      </section>
      {error ? <p className="staff-form-message staff-form-message--error" role="alert">{error}</p> : null}
      <div className="staff-form-actions"><button className="btn" disabled={pending} type="submit">{pending ? "Admitting…" : "Admit patient"}</button></div>
    </form>
  );
}

export function DischargeForm({ admissionId }: { admissionId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  return (
    <form action={(formData) => startTransition(async () => {
      if (!window.confirm("Discharge this patient? The bed will be freed.")) return;
      const result = await dischargeAdmissionAction(null, formData);
      setMessage(result.error ?? "Discharged — refresh to see updates.");
      if (!result.error) router.push("/staff/wards");
    })} className="staff-form-grid">
      <input name="admission_id" type="hidden" value={admissionId} />
      <label className="staff-form-grid__wide">Discharge summary<textarea name="discharge_summary" placeholder="Condition on discharge, medications, follow-up…" rows={4} /></label>
      <div className="staff-form-actions"><button className="btn" disabled={pending} type="submit">{pending ? "Discharging…" : "Discharge patient"}</button>{message ? <span className="staff-table-empty">{message}</span> : null}</div>
    </form>
  );
}

export function WardForm({ facilities }: { facilities: Facility[] }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  return (
    <form action={(formData) => startTransition(async () => {
      const result = await createWardAction(null, formData);
      setMessage(result.error ?? "Ward created.");
      if (!result.error) window.location.reload();
    })} className="staff-form-grid" style={{ marginBottom: "1.25rem" }}>
      <label>Facility<select name="facility_id" required><option value="">Choose…</option>{facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></label>
      <label>Name<input name="name" placeholder="e.g. Ward 3A" required /></label>
      <label>Type<select name="ward_type" defaultValue="general"><option value="general">General</option><option value="maternity">Maternity</option><option value="pediatric">Pediatric</option><option value="icu">ICU</option><option value="high_dependency">High dependency</option><option value="isolation">Isolation</option><option value="private">Private</option></select></label>
      <div className="staff-form-actions"><button className="btn btn--compact" disabled={pending} type="submit">{pending ? "Creating…" : "Create ward"}</button>{message ? <span className="staff-table-empty">{message}</span> : null}</div>
    </form>
  );
}

export function BedForm({ wards }: { wards: Ward[] }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  return (
    <form action={(formData) => startTransition(async () => {
      const result = await addBedAction(null, formData);
      setMessage(result.error ?? "Bed added.");
      if (!result.error) window.location.reload();
    })} className="staff-form-grid" style={{ marginBottom: "1.25rem" }}>
      <label>Ward<select name="ward_id" required><option value="">Choose…</option>{wards.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select></label>
      <label>Bed number<input name="bed_number" placeholder="e.g. A-12" required /></label>
      <div className="staff-form-actions"><button className="btn btn--compact" disabled={pending} type="submit">{pending ? "Adding…" : "Add bed"}</button>{message ? <span className="staff-table-empty">{message}</span> : null}</div>
    </form>
  );
}
