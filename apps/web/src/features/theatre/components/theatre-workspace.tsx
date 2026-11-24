"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSessionAction, createSurgeryAction, updateSurgeryAction } from "@/server/actions/theatre.actions";

type Session = { id: string; theatre_name: string; session_date: string; status: string; facility_id: string; start_time: string | null; end_time: string | null; surgeries?: { id: string; procedure_name: string; status: string }[] };
type Surgery = { id: string; procedure_name: string; status: string; scheduled_at: string | null; patients?: { first_name?: string; last_name?: string; patient_number?: string } | null; theatre_sessions?: { theatre_name?: string; session_date?: string } | null };

const STATUS_TONE: Record<string, string> = { scheduled: "", in_progress: "staff-status--info", completed: "staff-status--success", cancelled: "staff-status--danger", postponed: "staff-status--warning" };

export function TheatreWorkspace({ sessions, surgeries, facilities, patients, canManage }: { sessions: Session[]; surgeries: Surgery[]; facilities: { id: string; name: string }[]; patients: { id: string; first_name: string; last_name: string; patient_number: string }[]; canManage: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const run = (fn: () => Promise<{ error?: string } | undefined>) => startTransition(async () => {
    const result = await fn();
    if (result?.error) setError(result.error); else { setError(""); router.refresh(); }
  });

  return (
    <div>
      {canManage ? (
        <div className="staff-editor-sections" style={{ marginBottom: "1.25rem" }}>
          <section className="staff-editor-section">
            <p className="eyebrow">Theatre</p><h2>New session</h2>
            <form action={(fd) => run(() => createSessionAction(null, fd))} className="staff-form-grid">
              <select name="facility_id" required><option value="">Facility…</option>{facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select>
              <input name="theatre_name" placeholder="Theatre name (e.g. Main OT)" required />
              <input name="session_date" type="date" required />
              <div style={{ display: "flex", gap: ".5rem" }}><input name="start_time" type="time" /><input name="end_time" type="time" /></div>
              <div className="staff-form-actions"><button className="btn btn--compact" disabled={pending} type="submit">{pending ? "Saving…" : "Create session"}</button></div>
            </form>
          </section>
          <section className="staff-editor-section">
            <p className="eyebrow">Theatre</p><h2>Book surgery</h2>
            <form action={(fd) => run(() => createSurgeryAction(null, fd))} className="staff-form-grid">
              <select name="patient_id" required><option value="">Patient…</option>{patients.map((p) => <option key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.patient_number})</option>)}</select>
              <select name="facility_id" required><option value="">Facility…</option>{facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select>
              <select name="theatre_session_id"><option value="">Session (optional)…</option>{sessions.map((s) => <option key={s.id} value={s.id}>{s.theatre_name} — {s.session_date}</option>)}</select>
              <input name="procedure_name" placeholder="Procedure (e.g. Appendectomy)" required />
              <input name="procedure_code" placeholder="Procedure code (optional)" />
              <input name="scheduled_at" type="datetime-local" />
              <div className="staff-form-actions"><button className="btn btn--compact" disabled={pending} type="submit">{pending ? "Booking…" : "Book surgery"}</button></div>
            </form>
          </section>
        </div>
      ) : null}
      {error ? <p className="staff-table-empty">{error}</p> : null}

      <section className="staff-panel">
        <div className="staff-panel__header"><h2>Surgeries</h2><span className="staff-table-sub">{surgeries.length}</span></div>
        <div className="staff-table-wrap"><table className="staff-table">
          <thead><tr><th>Patient</th><th>Procedure</th><th>Theatre / date</th><th>Scheduled</th><th>Status</th>{canManage ? <th>Actions</th> : null}</tr></thead>
          <tbody>
            {surgeries.length === 0 ? <tr><td colSpan={6} className="staff-table-empty">No surgeries booked.</td></tr> : surgeries.map((s) => {
              const p = s.patients;
              return (
                <tr key={s.id}>
                  <td>{p ? `${p.first_name} ${p.last_name}` : "—"}</td>
                  <td>{s.procedure_name}</td>
                  <td>{s.theatre_sessions ? `${s.theatre_sessions.theatre_name} · ${s.theatre_sessions.session_date}` : "—"}</td>
                  <td>{s.scheduled_at ? new Date(s.scheduled_at).toLocaleString() : "—"}</td>
                  <td><span className={`staff-status ${STATUS_TONE[s.status] ?? ""}`}>{s.status.replace("_", " ")}</span></td>
                  {canManage ? <td><SurgeryActions surgery={s} /></td> : null}
                </tr>
              );
            })}
          </tbody>
        </table></div>
      </section>

      <section className="staff-panel">
        <div className="staff-panel__header"><h2>Theatre sessions</h2><span className="staff-table-sub">{sessions.length}</span></div>
        <div className="staff-table-wrap"><table className="staff-table">
          <thead><tr><th>Theatre</th><th>Date</th><th>Time</th><th>Status</th><th>Surgeries</th></tr></thead>
          <tbody>
            {sessions.length === 0 ? <tr><td colSpan={5} className="staff-table-empty">No sessions scheduled.</td></tr> : sessions.map((s) => (
              <tr key={s.id}><td>{s.theatre_name}</td><td>{s.session_date}</td><td>{s.start_time ?? "—"}{s.end_time ? `–${s.end_time}` : ""}</td><td><span className={`staff-status ${STATUS_TONE[s.status] ?? ""}`}>{s.status}</span></td><td>{(s.surgeries ?? []).length}</td></tr>
            ))}
          </tbody>
        </table></div>
      </section>
    </div>
  );
}

function SurgeryActions({ surgery }: { surgery: Surgery }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const setStatus = (status: string) => startTransition(async () => {
    const fd = new FormData();
    fd.set("surgery_id", surgery.id);
    fd.set("status", status);
    const result = await updateSurgeryAction(null, fd);
    if (result.error) window.alert(result.error); else router.refresh();
  });
  if (!open) return <button className="btn btn--secondary btn--compact" onClick={() => setOpen(true)} type="button">Update</button>;
  return (
    <form action={(fd) => startTransition(async () => {
      fd.set("surgery_id", surgery.id);
      const result = await updateSurgeryAction(null, fd);
      if (result.error) { window.alert(result.error); return; }
      setOpen(false); router.refresh();
    })} className="staff-form-grid" style={{ minWidth: "16rem" }}>
      <select name="status" defaultValue={surgery.status}>{["scheduled", "in_progress", "completed", "postponed", "cancelled"].map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}</select>
      <textarea name="operative_note" placeholder="Operative note" rows={2} />
      <textarea name="findings" placeholder="Findings" rows={2} />
      <textarea name="procedure_performed" placeholder="Procedure performed" rows={2} />
      <input name="blood_loss_ml" type="number" placeholder="Blood loss (ml)" />
      <textarea name="complications" placeholder="Complications" rows={2} />
      <textarea name="outcome" placeholder="Outcome" rows={2} />
      <div className="staff-form-actions"><button className="btn btn--compact" disabled={pending} type="submit">{pending ? "Saving…" : "Save"}</button><button className="btn btn--secondary btn--compact" onClick={() => setOpen(false)} type="button">Close</button></div>
    </form>
  );
}
