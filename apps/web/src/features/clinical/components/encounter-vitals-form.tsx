"use client";

import { useState, useTransition } from "react";
import { recordEncounterVitalsAction } from "@/server/actions/clinical.actions";

export function EncounterVitalsForm({ encounterId, queueId }: { encounterId: string; queueId: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);
  if (!open) return <button className="btn btn--secondary btn--compact" onClick={() => setOpen(true)} type="button">+ Record vitals</button>;
  return (
    <form action={(fd) => startTransition(async () => {
      fd.set("encounter_id", encounterId); fd.set("queue_id", queueId);
      const result = await recordEncounterVitalsAction(null, fd);
      setMessage(result.error ?? "Vitals recorded.");
      if (!result.error) setOpen(false);
    })} className="staff-form-grid">
      <input name="encounter_id" type="hidden" value={encounterId} />
      <input name="queue_id" type="hidden" value={queueId} />
      <label>Temp (°C)<input max="45" min="30" name="temperature_c" step="0.1" type="number" /></label>
      <label>Pulse (bpm)<input max="250" min="20" name="pulse_bpm" type="number" /></label>
      <label>RR (/min)<input max="60" min="5" name="respiratory_rate" type="number" /></label>
      <label>Systolic<input max="250" min="40" name="systolic_bp" type="number" /></label>
      <label>Diastolic<input max="150" min="20" name="diastolic_bp" type="number" /></label>
      <label>SpO₂ (%)<input max="100" min="50" name="oxygen_saturation" type="number" /></label>
      <label>Weight (kg)<input max="300" min="1" name="weight_kg" step="0.1" type="number" /></label>
      <label>Height (cm)<input max="250" min="30" name="height_cm" type="number" /></label>
      <label className="staff-form-grid__wide">Notes<input name="notes" placeholder="Observation note" /></label>
      <div className="staff-form-actions"><button className="btn btn--compact" disabled={pending} type="submit">{pending ? "Saving…" : "Save vitals"}</button><button className="btn btn--secondary btn--compact" onClick={() => setOpen(false)} type="button">Cancel</button>{message ? <span className="staff-table-empty">{message}</span> : null}</div>
    </form>
  );
}
