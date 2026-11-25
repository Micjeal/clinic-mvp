"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createInvoiceFromChargesAction } from "@/server/actions/billing.actions";

type Charge = {
  id: string;
  charge_type: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  currency_code: string;
  patient_id: string;
  facility_id: string | null;
  created_at: string;
  patients?: { first_name?: string; last_name?: string; patient_number?: string } | null;
};

const TYPE_LABELS: Record<string, string> = { consultation: "Consult", laboratory: "Lab", imaging: "Imaging", medication: "Rx", procedure: "Procedure", supply: "Supply", other: "Other" };

export function UnbilledCharges({ charges, facilities }: { charges: Charge[]; facilities: { id: string; name: string }[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [facilityId, setFacilityId] = useState("");

  const toggle = (id: string) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const selectedCharges = charges.filter((charge) => selected.has(charge.id));
  const total = selectedCharges.reduce((sum, charge) => sum + Number(charge.total), 0);
  const patients = new Set(selectedCharges.map((c) => c.patient_id));
  const byPatient = charges.reduce<Record<string, { name: string; count: number; total: number; currency: string }>>((acc, c) => {
    const key = c.patient_id;
    const name = c.patients ? `${c.patients.first_name ?? ""} ${c.patients.last_name ?? ""}`.trim() : "Patient";
    const row = acc[key] ?? { name, count: 0, total: 0, currency: c.currency_code };
    row.count += 1; row.total += Number(c.total);
    acc[key] = row;
    return acc;
  }, {});
  const patientRows = Object.values(byPatient).sort((a, b) => b.total - a.total);

  return (
    <div>
      {charges.length > 0 ? (
        <div className="staff-unbilled-summary">
          {patientRows.map((row) => (
            <div className="staff-unbilled-patient" key={row.name}>
              <strong>{row.name}</strong>
              <span>{row.count} charge{row.count === 1 ? "" : "s"}</span>
              <span className="staff-unbilled-patient__total">{row.total.toLocaleString()} {row.currency}</span>
            </div>
          ))}
        </div>
      ) : null}
      {charges.length === 0 ? <p className="staff-table-empty">No unbilled charges — lab results, imaging reports and dispensed medication will appear here automatically.</p> : (
        <>
          <div className="staff-table-wrap"><table className="staff-table">
            <thead><tr><th /><th>Patient</th><th>Type</th><th>Description</th><th className="staff-col-amount">Qty</th><th className="staff-col-amount">Total</th><th>When</th></tr></thead>
            <tbody>
              {charges.map((charge) => {
                const patient = charge.patients;
                return (
                  <tr key={charge.id}>
                    <td><input checked={selected.has(charge.id)} onChange={() => toggle(charge.id)} type="checkbox" /></td>
                    <td>{patient ? `${patient.first_name} ${patient.last_name}` : "—"}</td>
                    <td><span className="staff-table-sub">{TYPE_LABELS[charge.charge_type] ?? charge.charge_type}</span></td>
                    <td>{charge.description}</td>
                    <td className="staff-col-amount">{Number(charge.quantity)}</td>
                    <td className="staff-col-amount">{Number(charge.total).toLocaleString()} {charge.currency_code}</td>
                    <td>{new Date(charge.created_at).toLocaleDateString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
          <div className="staff-form-actions" style={{ marginTop: "1rem", flexWrap: "wrap", gap: ".75rem" }}>
            <select onChange={(e) => setFacilityId(e.target.value)} value={facilityId}>
              <option value="">Choose facility for invoices…</option>
              {facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            <button
              className="btn btn--compact"
              disabled={pending || !selected.size || !facilityId}
              onClick={() => startTransition(async () => {
                const formData = new FormData();
                formData.set("charge_ids", JSON.stringify([...selected]));
                formData.set("facility_id", facilityId);
                const result = await createInvoiceFromChargesAction(null, formData);
                if (result.error) { setError(result.error); return; }
                setSelected(new Set());
                router.refresh();
              })}
              type="button"
            >
              {pending ? "Creating…" : `Invoice ${patients.size} patient${patients.size === 1 ? "" : "s"} — ${total.toLocaleString()} UGX`}
            </button>
            {error ? <span className="staff-table-empty">{error}</span> : null}
          </div>
        </>
      )}
    </div>
  );
}
