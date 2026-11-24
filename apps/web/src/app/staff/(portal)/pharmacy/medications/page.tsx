import { StaffPageHeader } from "@/features/staff/components/staff-content";
import { StaffAccessDenied } from "@/features/staff/components/access-denied";
import { listMedications } from "@/server/services/pharmacy.service";
import { requirePermission } from "@/server/permissions/require-permission";
import { Permissions } from "@clinic/permissions";
import { AuthorizationError } from "@/server/errors";
import { MedicationForm } from "@/features/pharmacy/components/pharmacy-workspace";
import Link from "next/link";

export const metadata = { title: "Medication catalog" };

export default async function MedicationsPage() {
  let medications;
  try {
    medications = await listMedications();
  } catch (error) {
    if (error instanceof AuthorizationError) return <StaffAccessDenied />;
    throw error;
  }
  const canManage = await requirePermission(Permissions.PHARMACY_MANAGE).then(() => true).catch(() => false);
  return (
    <div className="staff-page">
      <StaffPageHeader eyebrow="Clinical" title="Medication catalog" description="Drugs available for prescribing." actions={<Link className="btn btn--secondary" href="/staff/pharmacy">← Back to pharmacy</Link>} />
      {canManage ? <section className="staff-panel"><div className="staff-panel__header"><h2>Add a medication</h2></div><MedicationForm canManage={canManage} /></section> : null}
      <section className="staff-panel">
        <div className="staff-table-wrap"><table className="staff-table">
          <thead><tr><th>Code</th><th>Generic name</th><th>Brand</th><th>Form</th><th>Strength</th><th>Unit</th></tr></thead>
          <tbody>
            {medications.length === 0 ? <tr><td colSpan={6} className="staff-table-empty">No medications configured yet.</td></tr> :
              medications.map((med) => (
                <tr key={med.id}><td>{med.code}</td><td>{med.generic_name}</td><td>{med.brand_name ?? "—"}</td><td>{med.dosage_form ?? "—"}</td><td>{med.strength ?? "—"}</td><td>{med.unit}</td></tr>
              ))}
          </tbody>
        </table></div>
      </section>
    </div>
  );
}
