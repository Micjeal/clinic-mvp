import { notFound } from "next/navigation";
import { StaffPageHeader } from "@/features/staff/components/staff-content";
import { StaffAccessDenied } from "@/features/staff/components/access-denied";
import { getAdmission } from "@/server/services/ward.service";
import { requirePermission } from "@/server/permissions/require-permission";
import { Permissions } from "@clinic/permissions";
import { AuthorizationError, NotFoundError } from "@/server/errors";
import { DischargeForm } from "@/features/ward/components/ward-workspace";
import Link from "next/link";
import { WardVitalsForm } from "@/features/ward/components/ward-vitals-form";

export const metadata = { title: "Admission" };

export default async function AdmissionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let admission;
  try {
    admission = await getAdmission(id);
  } catch (error) {
    if (error instanceof AuthorizationError) return <StaffAccessDenied />;
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
  const patient = admission.patients as { first_name?: string; last_name?: string; patient_number?: string; date_of_birth?: string; sex?: string } | null;
  const ward = admission.wards as { name?: string; ward_type?: string } | null;
  const bed = admission.beds as { bed_number?: string } | null;
  const facility = admission.facilities as { name?: string } | null;
  const canDischarge = await requirePermission(Permissions.ADMISSION_MANAGE).then(() => true).catch(() => false);
  const active = ["admitted", "on_leave"].includes(admission.status);

  return (
    <div className="staff-page">
      <StaffPageHeader
        eyebrow="Inpatient"
        title={`${admission.admission_number} — ${patient ? `${patient.first_name} ${patient.last_name}` : "Patient"}`}
        description={`${ward?.name ?? "Ward"}${bed?.bed_number ? ` • Bed ${bed.bed_number}` : ""} • ${admission.status}`}
        actions={<Link className="btn btn--secondary" href="/staff/wards">← Back to wards</Link>}
      />
      <div className="staff-detail-grid">
        <section className="staff-panel">
          <div className="staff-panel__header"><h2>Admission details</h2></div>
          <dl className="staff-detail-list">
            <div><dt>Patient</dt><dd>{patient ? `${patient.first_name} ${patient.last_name}` : "—"}{patient?.patient_number ? ` (${patient.patient_number})` : ""}</dd></div>
            <div><dt>Ward</dt><dd>{ward?.name} ({ward?.ward_type?.replace("_", " ")})</dd></div>
            <div><dt>Bed</dt><dd>{bed?.bed_number ?? "—"}</dd></div>
            <div><dt>Facility</dt><dd>{facility?.name ?? "—"}</dd></div>
            <div><dt>Reason</dt><dd>{admission.reason_for_admission || "—"}</dd></div>
            <div><dt>Diagnosis on admission</dt><dd>{admission.diagnosis_on_admission || "—"}</dd></div>
            <div><dt>Admitted</dt><dd>{new Date(admission.admitted_at).toLocaleString()}</dd></div>
            <div><dt>Discharged</dt><dd>{admission.discharged_at ? new Date(admission.discharged_at).toLocaleString() : "—"}</dd></div>
          </dl>
          {admission.discharge_summary ? <p className="staff-table-sub" style={{ marginTop: "1rem" }}>Discharge summary: {admission.discharge_summary}</p> : null}
        </section>
        {canDischarge && active ? (
          <section className="staff-panel">
            <div className="staff-panel__header"><h2>Discharge</h2></div>
            <DischargeForm admissionId={admission.id} />
          </section>
        ) : null}
      </div>
    </div>
  );
}
