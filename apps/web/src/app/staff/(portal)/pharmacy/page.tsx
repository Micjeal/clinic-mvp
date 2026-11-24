import { StaffPageHeader } from "@/features/staff/components/staff-content";
import { StaffAccessDenied } from "@/features/staff/components/access-denied";
import { listPrescriptions } from "@/server/services/pharmacy.service";
import { AuthorizationError } from "@/server/errors";
import Link from "next/link";

export const metadata = { title: "Pharmacy" };

const STATUS_LABELS: Record<string, string> = { draft: "Draft", active: "Active", partially_dispensed: "Part dispensed", dispensed: "Dispensed", cancelled: "Cancelled", expired: "Expired" };

export default async function PharmacyPage() {
  let prescriptions;
  try {
    prescriptions = await listPrescriptions();
  } catch (error) {
    if (error instanceof AuthorizationError) return <StaffAccessDenied />;
    throw error;
  }
  const pending = prescriptions.filter((rx) => ["active", "partially_dispensed"].includes(rx.status));

  return (
    <div className="staff-page">
      <StaffPageHeader eyebrow="Clinical" title="Pharmacy" description="Prescriptions and dispensing." actions={<div style={{ display: "flex", gap: ".5rem" }}><Link className="btn btn--secondary" href="/staff/pharmacy/medications">Medications</Link><Link className="btn" href="/staff/pharmacy/new">New prescription</Link></div>} />
      <div className="staff-kpi-grid">
        <div className="staff-kpi"><span>Awaiting dispense</span><strong>{pending.length}</strong></div>
        <div className="staff-kpi"><span>Total prescriptions</span><strong>{prescriptions.length}</strong></div>
      </div>
      <section className="staff-panel">
        <div className="staff-table-wrap">
          <table className="staff-table">
            <thead><tr><th>Patient</th><th>Items</th><th>Status</th><th>Prescribed</th></tr></thead>
            <tbody>
              {prescriptions.length === 0 ? <tr><td colSpan={4} className="staff-table-empty">No prescriptions yet.</td></tr> :
                prescriptions.map((rx) => {
                  const patient = rx.patients as { first_name?: string; last_name?: string } | null;
                  const items = (rx.prescription_items ?? []) as { id: string }[];
                  return (
                    <tr key={rx.id}>
                      <td><Link className="staff-table-link" href={`/staff/pharmacy/${rx.id}`}>{patient ? `${patient.first_name} ${patient.last_name}` : "Patient"}</Link></td>
                      <td>{items.length}</td>
                      <td><span className="staff-status staff-status--issued">{STATUS_LABELS[rx.status] ?? rx.status}</span></td>
                      <td>{new Date(rx.prescribed_at).toLocaleString()}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
