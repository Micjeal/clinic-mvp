import { StaffPageHeader } from "@/features/staff/components/staff-content";
import { StaffAccessDenied } from "@/features/staff/components/access-denied";
import { listPatients } from "@/server/services/patient-records.service";
import { AuthorizationError } from "@/server/errors";
import Link from "next/link";

export const metadata = { title: "Patients" };

export default async function PatientsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  let patients;
  try {
    patients = await listPatients(q);
  } catch (error) {
    if (error instanceof AuthorizationError) return <StaffAccessDenied />;
    throw error;
  }
  return (
    <div className="staff-page">
      <StaffPageHeader eyebrow="Records" title="Patients" description="Search the patient register and open a full medical record." />
      <form className="staff-panel" method="get" style={{ padding: "1rem", marginBottom: "1rem" }}>
        <div style={{ display: "flex", gap: ".75rem", alignItems: "center" }}>
          <input defaultValue={q ?? ""} name="q" placeholder="Name, patient number or phone…" style={{ flex: 1 }} />
          <button className="btn btn--compact" type="submit">Search</button>
        </div>
      </form>
      <section className="staff-panel">
        <div className="staff-table-wrap">
          <table className="staff-table">
            <thead><tr><th>Patient</th><th>Number</th><th>Phone</th><th>DOB</th><th>Sex</th></tr></thead>
            <tbody>
              {patients.length === 0 ? <tr><td colSpan={5} className="staff-table-empty">{q ? "No patients match that search." : "No patients yet."}</td></tr> :
                patients.map((patient) => (
                  <tr key={patient.id}>
                    <td><Link className="staff-table-link" href={`/staff/patients/${patient.id}`}>{patient.first_name} {patient.last_name}</Link></td>
                    <td>{patient.patient_number}</td>
                    <td>{patient.phone ?? "—"}</td>
                    <td>{patient.date_of_birth ?? "—"}</td>
                    <td>{patient.sex ?? "—"}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
