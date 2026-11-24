"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createMortuaryEntryAction, releaseMortuaryEntryAction } from "@/server/actions/mortuary.actions";

type Entry = { id: string; deceased_name: string; age: string | null; sex: string | null; date_of_death: string; time_of_death: string | null; cause_of_death: string | null; status: string; released_to: string | null; patients?: { first_name?: string; last_name?: string; patient_number?: string } | null; facilities?: { name?: string } | null };

const STATUS_TONE: Record<string, string> = { in_mortuary: "staff-status--warning", released: "", transferred: "staff-status--info" };

export function MortuaryWorkspace({ entries, facilities, patients, canManage }: { entries: Entry[]; facilities: { id: string; name: string }[]; patients: { id: string; first_name: string; last_name: string; patient_number: string }[]; canManage: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [releaseId, setReleaseId] = useState("");

  const run = (fn: () => Promise<{ error?: string } | undefined>) => startTransition(async () => {
    const result = await fn();
    if (result?.error) setError(result.error); else { setError(""); router.refresh(); }
  });

  return (
    <div>
      {canManage ? (
        <section className="staff-editor-section" style={{ marginBottom: "1.25rem" }}>
          <p className="eyebrow">Mortuary</p><h2>Register deceased</h2>
          <form action={(fd) => run(() => createMortuaryEntryAction(null, fd))} className="staff-form-grid">
            <select name="facility_id" required><option value="">Facility…</option>{facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select>
            <select name="patient_id"><option value="">Link patient (optional)…</option>{patients.map((p) => <option key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.patient_number})</option>)}</select>
            <input name="deceased_name" placeholder="Full name" required />
            <div style={{ display: "flex", gap: ".5rem" }}><input name="age" placeholder="Age" /><select name="sex" defaultValue=""><option value="">Sex…</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select></div>
            <div style={{ display: "flex", gap: ".5rem" }}><input name="date_of_death" type="date" required /><input name="time_of_death" type="time" /></div>
            <input name="cause_of_death" placeholder="Cause of death" />
            <input name="notes" placeholder="Notes (optional)" />
            <div className="staff-form-actions"><button className="btn btn--compact" disabled={pending} type="submit">{pending ? "Saving…" : "Register"}</button></div>
          </form>
        </section>
      ) : null}
      {error ? <p className="staff-table-empty">{error}</p> : null}

      <section className="staff-panel">
        <div className="staff-panel__header"><h2>Mortuary register</h2><span className="staff-table-sub">{entries.length}</span></div>
        <div className="staff-table-wrap"><table className="staff-table">
          <thead><tr><th>Name</th><th>Facility</th><th>DOD</th><th>Cause</th><th>Status</th><th>Released to</th>{canManage ? <th /> : null}</tr></thead>
          <tbody>
            {entries.length === 0 ? <tr><td colSpan={7} className="staff-table-empty">No entries.</td></tr> : entries.map((e) => (
              <tr key={e.id}>
                <td><strong>{e.deceased_name}</strong>{e.patients ? <span className="staff-table-sub"> {e.patients.first_name} {e.patients.last_name}</span> : null}</td>
                <td>{e.facilities?.name ?? "—"}</td>
                <td>{new Date(e.date_of_death).toLocaleDateString()}{e.time_of_death ? ` ${e.time_of_death}` : ""}</td>
                <td>{e.cause_of_death ?? "—"}</td>
                <td><span className={`staff-status ${STATUS_TONE[e.status] ?? ""}`}>{e.status.replace("_", " ")}</span></td>
                <td>{e.released_to ?? "—"}</td>
                {canManage ? <td>{e.status === "in_mortuary" ? <button className="btn btn--secondary btn--compact" onClick={() => setReleaseId(e.id)} type="button">Release</button> : null}</td> : null}
              </tr>
            ))}
          </tbody>
        </table></div>
        {releaseId ? (
          <form action={(fd) => { fd.set("entry_id", releaseId); run(() => releaseMortuaryEntryAction(null, fd)); setReleaseId(""); }} className="staff-form-grid" style={{ marginTop: "1rem", maxWidth: "28rem" }}>
            <input name="released_to" placeholder="Released to (family member / funeral home)" required />
            <div className="staff-form-actions"><button className="btn btn--compact" disabled={pending} type="submit">{pending ? "Releasing…" : "Confirm release"}</button><button className="btn btn--secondary btn--compact" onClick={() => setReleaseId("")} type="button">Cancel</button></div>
          </form>
        ) : null}
      </section>
    </div>
  );
}
