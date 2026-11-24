"use client";

import { useState, useTransition } from "react";
import { addClinicalNoteAction, addDiagnosisAction } from "@/server/actions/clinical.actions";

export function DiagnosisForm({ encounterId, patientId }: { encounterId: string; patientId: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  return (
    <form action={(formData) => startTransition(async () => {
      const result = await addDiagnosisAction(null, formData);
      setMessage(result.error ?? "Diagnosis added.");
      if (!result.error) window.location.reload();
    })} className="staff-form-grid">
      <input name="encounter_id" type="hidden" value={encounterId} />
      <input name="patient_id" type="hidden" value={patientId} />
      <label>Diagnosis<input name="diagnosis_name" placeholder="e.g. Acute malaria" required /></label>
      <label>Type<select name="diagnosis_type" defaultValue="working"><option value="working">Working</option><option value="confirmed">Confirmed</option><option value="differential">Differential</option><option value="historical">Historical</option></select></label>
      <label>Code system<input name="code_system" placeholder="e.g. ICD-10" /></label>
      <label>Code<input name="diagnosis_code" placeholder="e.g. B54" /></label>
      <label className="staff-form-grid__wide">Notes<input name="notes" /></label>
      <label style={{ display: "flex", alignItems: "center", gap: ".5rem" }}><input defaultChecked name="patient_visible" type="checkbox" value="true" /> Visible to patient</label>
      <div className="staff-form-actions"><button className="btn btn--compact" disabled={pending} type="submit">{pending ? "Saving…" : "Add diagnosis"}</button>{message ? <span className="staff-table-empty">{message}</span> : null}</div>
    </form>
  );
}

export function ClinicalNoteForm({ encounterId, patientId }: { encounterId: string; patientId: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  return (
    <form action={(formData) => startTransition(async () => {
      const result = await addClinicalNoteAction(null, formData);
      setMessage(result.error ?? "Note saved.");
      if (!result.error) window.location.reload();
    })} className="staff-form-grid">
      <input name="encounter_id" type="hidden" value={encounterId} />
      <input name="patient_id" type="hidden" value={patientId} />
      <label>Type<select name="note_type" defaultValue="progress"><option value="progress">Progress</option><option value="admission">Admission</option><option value="discharge">Discharge</option><option value="procedure">Procedure</option><option value="consultation">Consultation</option><option value="other">Other</option></select></label>
      <label className="staff-form-grid__wide">Note<textarea name="content" placeholder="Clinical findings, assessment, plan…" required rows={5} /></label>
      <label style={{ display: "flex", alignItems: "center", gap: ".5rem" }}><input name="patient_visible" type="checkbox" value="true" /> Visible to patient</label>
      <div className="staff-form-actions"><button className="btn btn--compact" disabled={pending} type="submit">{pending ? "Saving…" : "Save note"}</button>{message ? <span className="staff-table-empty">{message}</span> : null}</div>
    </form>
  );
}
