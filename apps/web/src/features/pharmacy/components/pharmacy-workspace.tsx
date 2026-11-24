"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelItemAction, createMedicationAction, createPrescriptionAction, dispenseItemAction } from "@/server/actions/pharmacy.actions";

type Encounter = { id: string; started_at: string | null; patients?: { first_name?: string; last_name?: string; patient_number?: string } | null };
type Medication = { id: string; code: string; generic_name: string; brand_name: string | null; strength: string | null; dosage_form: string | null; unit: string | null };
type RxLine = { medication_id: string; medication_name: string; dose: string; frequency: string; duration_days: string; quantity: string; instructions: string };

const EMPTY_LINE: RxLine = { medication_id: "", medication_name: "", dose: "", frequency: "", duration_days: "", quantity: "", instructions: "" };

export function PrescriptionForm({ encounters, medications }: { encounters: Encounter[]; medications: Medication[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [lines, setLines] = useState<RxLine[]>([{ ...EMPTY_LINE }]);

  const setLine = (index: number, patch: Partial<RxLine>) => setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  const pickMedication = (index: number, medicationId: string) => {
    const med = medications.find((item) => item.id === medicationId);
    setLine(index, { medication_id: medicationId, medication_name: med ? `${med.generic_name}${med.strength ? ` ${med.strength}` : ""}` : "" });
  };

  return (
    <form action={(formData) => startTransition(async () => {
      formData.set("items_json", JSON.stringify(lines.filter((line) => line.medication_name.trim())));
      const result = await createPrescriptionAction(null, formData);
      if (result.error) { setError(result.error); return; }
      if (result.prescriptionId) {
        if (result.allergyWarnings?.length) window.alert(`Allergy warning: this patient has recorded allergies matching — ${result.allergyWarnings.join(", ")}`);
        router.push(`/staff/pharmacy/${result.prescriptionId}`);
      }
    })} className="staff-editor-sections">
      <section className="staff-editor-section">
        <p className="eyebrow">Prescription</p>
        <h2>New prescription</h2>
        <div className="staff-form-grid">
          <label>Encounter<select name="encounter_id" required>
            <option value="">Choose the encounter</option>
            {encounters.map((encounter) => {
              const patient = encounter.patients;
              return <option key={encounter.id} value={encounter.id}>{patient ? `${patient.first_name} ${patient.last_name}` : "Patient"}{patient?.patient_number ? ` • ${patient.patient_number}` : ""} — {encounter.started_at ? new Date(encounter.started_at).toLocaleDateString() : ""}</option>;
            })}
          </select></label>
          <label className="staff-form-grid__wide">Notes<textarea name="notes" rows={2} placeholder="Optional clinical note for the pharmacist" /></label>
        </div>
      </section>
      <section className="staff-editor-section">
        <p className="eyebrow">Items</p>
        <h2>Medications ({lines.filter((l) => l.medication_name.trim()).length})</h2>
        <div className="staff-table-wrap"><table className="staff-table">
          <thead><tr><th>Medication</th><th>Dose</th><th>Frequency</th><th>Days</th><th>Qty</th><th>Instructions</th><th /></tr></thead>
          <tbody>
            {lines.map((line, index) => (
              <tr key={index}>
                <td>
                  <select onChange={(e) => pickMedication(index, e.target.value)} value={line.medication_id}>
                    <option value="">Custom / choose…</option>
                    {medications.map((med) => <option key={med.id} value={med.id}>{med.generic_name}{med.strength ? ` ${med.strength}` : ""}{med.dosage_form ? ` (${med.dosage_form})` : ""}</option>)}
                  </select>
                  {!line.medication_id ? <input onChange={(e) => setLine(index, { medication_name: e.target.value })} placeholder="Medication name" value={line.medication_name} /> : null}
                </td>
                <td><input onChange={(e) => setLine(index, { dose: e.target.value })} placeholder="e.g. 500mg" style={{ width: "6rem" }} value={line.dose} /></td>
                <td><input onChange={(e) => setLine(index, { frequency: e.target.value })} placeholder="e.g. BD" style={{ width: "6rem" }} value={line.frequency} /></td>
                <td><input onChange={(e) => setLine(index, { duration_days: e.target.value })} style={{ width: "4.5rem" }} type="number" min="1" value={line.duration_days} /></td>
                <td><input onChange={(e) => setLine(index, { quantity: e.target.value })} style={{ width: "5rem" }} type="number" min="0" step="0.5" value={line.quantity} /></td>
                <td><input onChange={(e) => setLine(index, { instructions: e.target.value })} placeholder="e.g. after meals" style={{ width: "10rem" }} value={line.instructions} /></td>
                <td>{lines.length > 1 ? <button className="btn btn--secondary btn--compact" onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))} type="button">✕</button> : null}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
        <div className="staff-form-actions"><button className="btn btn--secondary btn--compact" onClick={() => setLines((prev) => [...prev, { ...EMPTY_LINE }])} type="button">+ Add medication</button></div>
      </section>
      {error ? <p className="staff-form-message staff-form-message--error" role="alert">{error}</p> : null}
      <div className="staff-form-actions"><button className="btn" disabled={pending} type="submit">{pending ? "Creating…" : "Create prescription"}</button></div>
    </form>
  );
}

export function DispenseButtons({ itemId, prescriptionId, itemStatus, canDispense, canPrescribe }: { itemId: string; prescriptionId: string; itemStatus: string; canDispense: boolean; canPrescribe: boolean }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const run = (fn: () => Promise<{ error?: string }>) => startTransition(async () => {
    const result = await fn();
    setMessage(result.error ?? "");
    if (!result.error) window.location.reload();
  });
  if (itemStatus === "cancelled" || itemStatus === "dispensed") return null;
  return (
    <span style={{ display: "inline-flex", gap: ".4rem", flexWrap: "wrap" }}>
      {canDispense ? <button className="btn btn--compact" disabled={pending} onClick={() => run(() => dispenseItemAction(itemId, prescriptionId))} type="button">Dispense</button> : null}
      {canPrescribe ? <button className="btn btn--secondary btn--compact" disabled={pending} onClick={() => { if (window.confirm("Cancel this item?")) run(() => cancelItemAction(itemId, prescriptionId)); }} type="button">Cancel</button> : null}
      {message ? <span className="staff-table-empty">{message}</span> : null}
    </span>
  );
}

export function MedicationForm({ canManage }: { canManage: boolean }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  if (!canManage) return null;
  return (
    <form action={(formData) => startTransition(async () => {
      const result = await createMedicationAction(null, formData);
      setMessage(result.error ?? "Medication added.");
      if (!result.error) window.location.reload();
    })} className="staff-form-grid" style={{ marginBottom: "1.25rem" }}>
      <label>Code<input name="code" placeholder="e.g. AMX-500" required /></label>
      <label>Generic name<input name="generic_name" placeholder="Amoxicillin" required /></label>
      <label>Brand name<input name="brand_name" /></label>
      <label>Dosage form<input name="dosage_form" placeholder="Tablet" /></label>
      <label>Strength<input name="strength" placeholder="500mg" /></label>
      <label>Unit<input name="unit" placeholder="tablet" /></label>
      <div className="staff-form-actions"><button className="btn btn--compact" disabled={pending} type="submit">{pending ? "Adding…" : "Add medication"}</button>{message ? <span className="staff-table-empty">{message}</span> : null}</div>
    </form>
  );
}
