"use client";

import { useState, useTransition } from "react";
import { recordWardVitalsAction } from "@/server/actions/ward.actions";

export function WardVitalsForm({ admissionId }: { admissionId: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  return (
    <form action={(fd) => startTransition(async () => {
      fd.set("admission_id", admissionId);
      const result = await recordWardVitalsAction(null, fd);
      setMessage(result.error ?? "Vitals recorded.");
      if (!result.error) (document.getElementById("ward-vitals-form") as HTMLFormElement | null)?.reset();
    })} className="staff-form-grid" id="ward-vitals-form">
      <input name="admission_id" type="hidden" value={admissionId} />
      <label>Temp (°C)<input max="45" min="30" name="temperature_c" step="0.1" type="number" /></label>
      <label>Pulse (bpm)<input max="250" min="20" name="pulse_bpm" type="number" /></label>
      <label>RR (/min)<input max="60" min="5" name="respiratory_rate" type="number" /></label>
      <label>Systolic<input max="250" min="40" name="systolic_bp" type="number" /></label>
      <label>Diastolic<input max="150" min="20" name="diastolic_bp" type="number" /></label>
      <label>SpO₂ (%)<input max="100" min="50" name="oxygen_saturation" type="number" /></label>
      <label>Weight (kg)<input max="300" min="1" name="weight_kg" step="0.1" type="number" /></label>
      <label>Height (cm)<input max="250" min="30" name="height_cm" type="number" /></label>
      <label className="staff-form-grid__wide">Notes<input name="notes" placeholder="Optional observation note" /></label>
      <div className="staff-form-actions"><button className="btn btn--compact" disabled={pending} type="submit">{pending ? "Saving…" : "Record vitals"}</button>{message ? <span className="staff-table-empty">{message}</span> : null}</div>
    </form>
  );
}
