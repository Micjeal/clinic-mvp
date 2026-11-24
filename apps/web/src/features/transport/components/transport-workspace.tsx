"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTransportRequestAction, updateTransportRequestAction } from "@/server/actions/transport.actions";

type Request = { id: string; request_type: string; pickup_location: string; destination: string | null; scheduled_at: string | null; priority: string; vehicle: string | null; driver_name: string | null; status: string; notes: string | null; patients?: { first_name?: string; last_name?: string; patient_number?: string } | null; facilities?: { name?: string } | null };

const STATUS_TONE: Record<string, string> = { requested: "staff-status--warning", assigned: "staff-status--info", en_route: "staff-status--info", completed: "staff-status--success", cancelled: "staff-status--danger" };
const PRIORITY_TONE: Record<string, string> = { routine: "", urgent: "staff-status--warning", emergency: "staff-status--danger" };

export function TransportWorkspace({ requests, facilities, patients, canManage }: { requests: Request[]; facilities: { id: string; name: string }[]; patients: { id: string; first_name: string; last_name: string; patient_number: string }[]; canManage: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [dispatchId, setDispatchId] = useState("");

  const run = (fn: () => Promise<{ error?: string } | undefined>) => startTransition(async () => {
    const result = await fn();
    if (result?.error) setError(result.error); else { setError(""); router.refresh(); }
  });

  return (
    <div>
      {canManage ? (
        <section className="staff-editor-section" style={{ marginBottom: "1.25rem" }}>
          <p className="eyebrow">Transport</p><h2>New transport request</h2>
          <form action={(fd) => run(() => createTransportRequestAction(null, fd))} className="staff-form-grid">
            <select name="request_type" required><option value="pickup">Patient pickup</option><option value="dropoff">Drop-off</option><option value="transfer">Transfer</option><option value="emergency">Emergency</option></select>
            <select name="patient_id"><option value="">Patient (optional)…</option>{patients.map((p) => <option key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.patient_number})</option>)}</select>
            <select name="facility_id"><option value="">Facility (optional)…</option>{facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select>
            <select name="priority" defaultValue="routine"><option value="routine">Routine</option><option value="urgent">Urgent</option><option value="emergency">Emergency</option></select>
            <input name="pickup_location" placeholder="Pickup location" required />
            <input name="destination" placeholder="Destination" />
            <div style={{ display: "flex", gap: ".5rem" }}><input name="scheduled_at" type="datetime-local" /><input name="vehicle" placeholder="Vehicle" /></div>
            <input name="notes" placeholder="Notes (optional)" />
            <div className="staff-form-actions"><button className="btn btn--compact" disabled={pending} type="submit">{pending ? "Saving…" : "Create request"}</button></div>
          </form>
        </section>
      ) : null}
      {error ? <p className="staff-table-empty">{error}</p> : null}

      <section className="staff-panel">
        <div className="staff-panel__header"><h2>Transport requests</h2><span className="staff-table-sub">{requests.length}</span></div>
        <div className="staff-table-wrap"><table className="staff-table">
          <thead><tr><th>Type</th><th>Patient</th><th>Route</th><th>When</th><th>Priority</th><th>Status</th>{canManage ? <th>Actions</th> : null}</tr></thead>
          <tbody>
            {requests.length === 0 ? <tr><td colSpan={7} className="staff-table-empty">No transport requests.</td></tr> : requests.map((r) => {
              const p = r.patients;
              return (
                <tr key={r.id}>
                  <td>{r.request_type}</td>
                  <td>{p ? `${p.first_name} ${p.last_name}` : "—"}</td>
                  <td>{r.pickup_location}{r.destination ? ` → ${r.destination}` : ""}</td>
                  <td>{r.scheduled_at ? new Date(r.scheduled_at).toLocaleString() : "—"}</td>
                  <td><span className={`staff-status ${PRIORITY_TONE[r.priority] ?? ""}`}>{r.priority}</span></td>
                  <td><span className={`staff-status ${STATUS_TONE[r.status] ?? ""}`}>{r.status.replace("_", " ")}</span>{r.vehicle ? <span className="staff-table-sub"> {r.vehicle}</span> : null}{r.driver_name ? <span className="staff-table-sub"> · {r.driver_name}</span> : null}</td>
                  {canManage ? <td>{r.status === "requested" || r.status === "assigned" ? <button className="btn btn--secondary btn--compact" onClick={() => setDispatchId(dispatchId === r.id ? "" : r.id)} type="button">Dispatch</button> : null}</td> : null}
                </tr>
              );
            })}
          </tbody>
        </table></div>
        {dispatchId ? (
          <form action={(fd) => { fd.set("request_id", dispatchId); run(() => updateTransportRequestAction(null, fd)); setDispatchId(""); }} className="staff-form-grid" style={{ marginTop: "1rem", maxWidth: "30rem" }}>
            <select name="status" defaultValue="assigned"><option value="assigned">Assigned</option><option value="en_route">En route</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select>
            <input name="vehicle" placeholder="Vehicle" />
            <input name="driver_name" placeholder="Driver" />
            <div className="staff-form-actions"><button className="btn btn--compact" disabled={pending} type="submit">{pending ? "Updating…" : "Update"}</button><button className="btn btn--secondary btn--compact" onClick={() => setDispatchId("")} type="button">Cancel</button></div>
          </form>
        ) : null}
      </section>
    </div>
  );
}
