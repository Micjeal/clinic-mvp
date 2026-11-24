import { notFound } from "next/navigation";
import { StaffPageHeader } from "@/features/staff/components/staff-content";
import { StaffAccessDenied } from "@/features/staff/components/access-denied";
import { getPrescription } from "@/server/services/pharmacy.service";
import { requirePermission } from "@/server/permissions/require-permission";
import { Permissions } from "@clinic/permissions";
import { AuthorizationError, NotFoundError } from "@/server/errors";
import { DispenseButtons } from "@/features/pharmacy/components/pharmacy-workspace";
import Link from "next/link";

export const metadata = { title: "Prescription" };

type RxItem = { id: string; medication_name: string; dose: string | null; route: string | null; frequency: string | null; duration_days: number | null; quantity: number | null; instructions: string | null; status: string };

export default async function PrescriptionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let rx;
  try {
    rx = await getPrescription(id);
  } catch (error) {
    if (error instanceof AuthorizationError) return <StaffAccessDenied />;
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
  const patient = rx.patients as { first_name?: string; last_name?: string; patient_number?: string } | null;
  const items = (rx.prescription_items ?? []) as unknown as RxItem[];
  const canDispense = await requirePermission(Permissions.PHARMACY_DISPENSE).then(() => true).catch(() => false);
  const canPrescribe = await requirePermission(Permissions.PRESCRIPTION_WRITE).then(() => true).catch(() => false);

  return (
    <div className="staff-page">
      <StaffPageHeader
        eyebrow="Clinical"
        title={`Prescription — ${patient ? `${patient.first_name} ${patient.last_name}` : "Patient"}`}
        description={`${rx.status.replace("_", " ")} • ${new Date(rx.prescribed_at).toLocaleString()}`}
        actions={<Link className="btn btn--secondary" href="/staff/pharmacy">← Back to pharmacy</Link>}
      />
      {rx.notes ? <p className="staff-table-sub" style={{ marginBottom: "1rem" }}>Notes: {rx.notes}</p> : null}
      <section className="staff-panel">
        <div className="staff-table-wrap"><table className="staff-table">
          <thead><tr><th>Medication</th><th>Dose</th><th>Route</th><th>Frequency</th><th>Duration</th><th>Qty</th><th>Instructions</th><th>Status</th><th /></tr></thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td><strong>{item.medication_name}</strong></td>
                <td>{item.dose ?? "—"}</td><td>{item.route ?? "—"}</td><td>{item.frequency ?? "—"}</td>
                <td>{item.duration_days ? `${item.duration_days}d` : "—"}</td><td>{item.quantity ?? "—"}</td>
                <td>{item.instructions ?? "—"}</td>
                <td><span className="staff-status staff-status--issued">{item.status.replace("_", " ")}</span></td>
                <td><DispenseButtons canDispense={canDispense} canPrescribe={canPrescribe} itemId={item.id} itemStatus={item.status} prescriptionId={rx.id} /></td>
              </tr>
            ))}
            {items.length === 0 ? <tr><td colSpan={9} className="staff-table-empty">No items.</td></tr> : null}
          </tbody>
        </table></div>
      </section>
    </div>
  );
}
