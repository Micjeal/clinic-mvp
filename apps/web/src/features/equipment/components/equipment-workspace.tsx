"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createEquipmentAction, logMaintenanceAction, updateEquipmentStatusAction } from "@/server/actions/equipment.actions";

type Equipment = { id: string; name: string; category: string | null; asset_tag: string | null; status: string; facilities?: { name?: string } | null; departments?: { name?: string } | null; equipment_maintenance?: { id: string; maintenance_type: string; performed_at: string; description: string; cost: number | null; next_due_date: string | null }[] };

const STATUS_TONE: Record<string, string> = { in_service: "staff-status--success", under_maintenance: "staff-status--warning", out_of_service: "staff-status--danger", retired: "" };

export function EquipmentWorkspace({ items, facilities, departments, canManage }: { items: Equipment[]; facilities: { id: string; name: string }[]; departments: { id: string; name: string }[]; canManage: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [maintFor, setMaintFor] = useState("");

  const run = (fn: () => Promise<{ error?: string } | undefined>) => startTransition(async () => {
    const result = await fn();
    if (result?.error) setError(result.error); else { setError(""); router.refresh(); }
  });

  return (
    <div>
      {canManage ? (
        <section className="staff-editor-section" style={{ marginBottom: "1.25rem" }}>
          <p className="eyebrow">Assets</p><h2>Register equipment</h2>
          <form action={(fd) => run(() => createEquipmentAction(null, fd))} className="staff-form-grid">
            <input name="name" placeholder="Equipment name (e.g. X-ray machine)" required />
            <input name="category" placeholder="Category (e.g. Imaging)" />
            <input name="asset_tag" placeholder="Asset tag" />
            <input name="serial_number" placeholder="Serial number" />
            <select name="facility_id"><option value="">Facility (optional)…</option>{facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select>
            <select name="department_id"><option value="">Department (optional)…</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
            <div style={{ display: "flex", gap: ".5rem" }}><input name="purchase_date" type="date" /><input name="warranty_expiry" type="date" /></div>
            <input name="notes" placeholder="Notes (optional)" />
            <div className="staff-form-actions"><button className="btn btn--compact" disabled={pending} type="submit">{pending ? "Saving…" : "Register"}</button></div>
          </form>
        </section>
      ) : null}
      {error ? <p className="staff-table-empty">{error}</p> : null}

      <section className="staff-panel">
        <div className="staff-panel__header"><h2>Equipment register</h2><span className="staff-table-sub">{items.length}</span></div>
        <div className="staff-table-wrap"><table className="staff-table">
          <thead><tr><th>Name</th><th>Location</th><th>Asset tag</th><th>Status</th><th>Last service</th><th>Next due</th>{canManage ? <th>Actions</th> : null}</tr></thead>
          <tbody>
            {items.length === 0 ? <tr><td colSpan={7} className="staff-table-empty">No equipment registered.</td></tr> : items.map((e) => {
              const maint = (e.equipment_maintenance ?? []).sort((a, b) => b.performed_at.localeCompare(a.performed_at));
              const last = maint[0];
              const nextDue = maint.find((m) => m.next_due_date);
              return (
                <tr key={e.id}>
                  <td><strong>{e.name}</strong>{e.category ? <span className="staff-table-sub"> {e.category}</span> : null}</td>
                  <td>{[e.facilities?.name, e.departments?.name].filter(Boolean).join(" · ") || "—"}</td>
                  <td>{e.asset_tag ?? "—"}</td>
                  <td><span className={`staff-status ${STATUS_TONE[e.status] ?? ""}`}>{e.status.replace("_", " ")}</span></td>
                  <td>{last ? `${last.maintenance_type} · ${new Date(last.performed_at).toLocaleDateString()}` : "—"}</td>
                  <td>{nextDue?.next_due_date ?? "—"}</td>
                  {canManage ? <td><div style={{ display: "flex", gap: ".4rem", flexWrap: "wrap" }}>
                    <button className="btn btn--secondary btn--compact" onClick={() => setMaintFor(maintFor === e.id ? "" : e.id)} type="button">Log service</button>
                    {e.status !== "retired" ? <button className="btn btn--secondary btn--compact" onClick={() => { const fd = new FormData(); fd.set("equipment_id", e.id); fd.set("status", e.status === "in_service" ? "under_maintenance" : "in_service"); run(() => updateEquipmentStatusAction(null, fd)); }} type="button">{e.status === "in_service" ? "Maintenance" : "Back in service"}</button> : null}
                  </div></td> : null}
                </tr>
              );
            })}
          </tbody>
        </table></div>
        {maintFor ? (
          <form action={(fd) => { fd.set("equipment_id", maintFor); run(() => logMaintenanceAction(null, fd)); setMaintFor(""); }} className="staff-form-grid" style={{ marginTop: "1rem", maxWidth: "36rem" }}>
            <select name="maintenance_type" required><option value="">Type…</option><option value="scheduled">Scheduled</option><option value="repair">Repair</option><option value="calibration">Calibration</option><option value="inspection">Inspection</option></select>
            <input name="performed_by" placeholder="Performed by" />
            <input name="description" placeholder="Work done" required />
            <div style={{ display: "flex", gap: ".5rem" }}><input name="cost" type="number" placeholder="Cost" /><input name="next_due_date" type="date" /></div>
            <div className="staff-form-actions"><button className="btn btn--compact" disabled={pending} type="submit">{pending ? "Saving…" : "Log service"}</button><button className="btn btn--secondary btn--compact" onClick={() => setMaintFor("")} type="button">Cancel</button></div>
          </form>
        ) : null}
      </section>
    </div>
  );
}
