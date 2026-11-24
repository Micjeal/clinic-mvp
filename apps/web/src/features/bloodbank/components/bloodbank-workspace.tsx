"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createBloodUnitAction, recordTransfusionAction, updateBloodUnitStatusAction } from "@/server/actions/bloodbank.actions";

type Unit = { id: string; unit_number: string; blood_group: string; component: string; volume_ml: number | null; status: string; expiry_date: string | null; facilities?: { name?: string } | null };
type Transfusion = { id: string; transfused_at: string; reaction_notes: string | null; patients?: { first_name?: string; last_name?: string; patient_number?: string } | null; blood_units?: { unit_number?: string; blood_group?: string } | null };

const STATUS_TONE: Record<string, string> = { available: "staff-status--success", reserved: "staff-status--info", issued: "", discarded: "staff-status--danger", expired: "staff-status--warning" };
const GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const COMPONENTS = [["whole_blood", "Whole blood"], ["red_cells", "Red cells"], ["platelets", "Platelets"], ["plasma", "Plasma"], ["cryoprecipitate", "Cryoprecipitate"]] as const;

export function BloodBankWorkspace({ units, transfusions, facilities, patients, canManage }: { units: Unit[]; transfusions: Transfusion[]; facilities: { id: string; name: string }[]; patients: { id: string; first_name: string; last_name: string; patient_number: string }[]; canManage: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [transfuseFor, setTransfuseFor] = useState("");
  const available = units.filter((u) => u.status === "available");
  const lowStock = GROUPS.filter((g) => available.filter((u) => u.blood_group === g).length < 3);

  const run = (fn: () => Promise<{ error?: string } | undefined>) => startTransition(async () => {
    const result = await fn();
    if (result?.error) setError(result.error); else { setError(""); router.refresh(); }
  });
  const setStatus = (id: string, status: string) => { const fd = new FormData(); fd.set("unit_id", id); fd.set("status", status); run(() => updateBloodUnitStatusAction(null, fd)); };

  return (
    <div>
      {lowStock.length ? <p className="staff-table-empty" style={{ color: "#b45309" }}>Low stock: {lowStock.join(", ")} — fewer than 3 available units.</p> : null}
      {canManage ? (
        <section className="staff-editor-section" style={{ marginBottom: "1.25rem" }}>
          <p className="eyebrow">Blood bank</p><h2>Register blood unit</h2>
          <form action={(fd) => run(() => createBloodUnitAction(null, fd))} className="staff-form-grid">
            <input name="unit_number" placeholder="Unit number" required />
            <select name="blood_group" required><option value="">Blood group…</option>{GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}</select>
            <select name="component">{COMPONENTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
            <input name="volume_ml" type="number" placeholder="Volume (ml)" />
            <input name="donor_name" placeholder="Donor name" />
            <select name="facility_id"><option value="">Facility (optional)…</option>{facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select>
            <div style={{ display: "flex", gap: ".5rem" }}><input name="collection_date" type="date" /><input name="expiry_date" type="date" /></div>
            <input name="notes" placeholder="Notes (optional)" />
            <div className="staff-form-actions"><button className="btn btn--compact" disabled={pending} type="submit">{pending ? "Saving…" : "Register unit"}</button></div>
          </form>
        </section>
      ) : null}
      {error ? <p className="staff-table-empty">{error}</p> : null}

      <section className="staff-panel">
        <div className="staff-panel__header"><h2>Blood units</h2><span className="staff-table-sub">{available.length} available / {units.length} total</span></div>
        <div className="staff-table-wrap"><table className="staff-table">
          <thead><tr><th>Unit</th><th>Group</th><th>Component</th><th>Facility</th><th>Expiry</th><th>Status</th>{canManage ? <th>Actions</th> : null}</tr></thead>
          <tbody>
            {units.length === 0 ? <tr><td colSpan={7} className="staff-table-empty">No units registered.</td></tr> : units.map((u) => (
              <tr key={u.id}>
                <td><strong>{u.unit_number}</strong></td>
                <td>{u.blood_group}</td>
                <td>{u.component.replace("_", " ")}</td>
                <td>{u.facilities?.name ?? "—"}</td>
                <td>{u.expiry_date ?? "—"}</td>
                <td><span className={`staff-status ${STATUS_TONE[u.status] ?? ""}`}>{u.status}</span></td>
                {canManage ? <td><div style={{ display: "flex", gap: ".4rem", flexWrap: "wrap" }}>
                  {u.status === "available" ? <button className="btn btn--secondary btn--compact" onClick={() => setTransfuseFor(transfuseFor === u.id ? "" : u.id)} type="button">Transfuse</button> : null}
                  {u.status === "available" ? <button className="btn btn--secondary btn--compact" onClick={() => setStatus(u.id, "reserved")} type="button">Reserve</button> : null}
                  {u.status === "reserved" ? <button className="btn btn--secondary btn--compact" onClick={() => setStatus(u.id, "available")} type="button">Release</button> : null}
                  {u.status !== "issued" && u.status !== "discarded" ? <button className="btn btn--secondary btn--compact" onClick={() => setStatus(u.id, "discarded")} type="button">Discard</button> : null}
                </div></td> : null}
              </tr>
            ))}
          </tbody>
        </table></div>
        {transfuseFor ? (
          <form action={(fd) => { fd.set("blood_unit_id", transfuseFor); run(() => recordTransfusionAction(null, fd)); setTransfuseFor(""); }} className="staff-form-grid" style={{ marginTop: "1rem", maxWidth: "32rem" }}>
            <select name="patient_id" required><option value="">Patient…</option>{patients.map((p) => <option key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.patient_number})</option>)}</select>
            <input name="reaction_notes" placeholder="Reaction notes (optional)" />
            <div className="staff-form-actions"><button className="btn btn--compact" disabled={pending} type="submit">{pending ? "Recording…" : "Record transfusion"}</button><button className="btn btn--secondary btn--compact" onClick={() => setTransfuseFor("")} type="button">Cancel</button></div>
          </form>
        ) : null}
      </section>

      <section className="staff-panel">
        <div className="staff-panel__header"><h2>Transfusion log</h2><span className="staff-table-sub">{transfusions.length}</span></div>
        <div className="staff-table-wrap"><table className="staff-table">
          <thead><tr><th>When</th><th>Patient</th><th>Unit</th><th>Group</th><th>Notes</th></tr></thead>
          <tbody>
            {transfusions.length === 0 ? <tr><td colSpan={5} className="staff-table-empty">No transfusions recorded.</td></tr> : transfusions.map((t) => {
              const p = t.patients;
              return <tr key={t.id}><td>{new Date(t.transfused_at).toLocaleString()}</td><td>{p ? `${p.first_name} ${p.last_name}` : "—"}</td><td>{t.blood_units?.unit_number ?? "—"}</td><td>{t.blood_units?.blood_group ?? "—"}</td><td>{t.reaction_notes ?? "—"}</td></tr>;
            })}
          </tbody>
        </table></div>
      </section>
    </div>
  );
}
