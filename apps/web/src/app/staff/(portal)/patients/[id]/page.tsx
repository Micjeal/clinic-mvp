import { notFound } from "next/navigation";
import { StaffPageHeader } from "@/features/staff/components/staff-content";
import { StaffAccessDenied } from "@/features/staff/components/access-denied";
import { getPatientRecord } from "@/server/services/patient-records.service";
import { AuthorizationError, NotFoundError } from "@/server/errors";
import { AllergyForm } from "@/features/patients/components/allergy-form";

export const metadata = { title: "Patient record" };

export default async function PatientRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let record;
  try {
    record = await getPatientRecord(id);
  } catch (error) {
    if (error instanceof AuthorizationError) return <StaffAccessDenied />;
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
  const { patient, timeline } = record;

  return (
    <div className="staff-page">
      <StaffPageHeader
        eyebrow="Medical record"
        title={`${patient.first_name} ${patient.last_name}`}
        description={`${patient.patient_number}${patient.date_of_birth ? ` • born ${new Date(patient.date_of_birth).toLocaleDateString()}` : ""}${patient.sex ? ` • ${patient.sex}` : ""}`}
        context={<span className="staff-stage-label">{patient.is_active ? "Active" : "Inactive"}</span>}
      />
      <div className="staff-detail-grid">
        <section className="staff-panel">
          <div className="staff-panel__header"><h2>Demographics</h2></div>
          <dl className="staff-detail-list">
            <div><dt>Phone</dt><dd>{patient.phone ?? "—"}</dd></div>
            <div><dt>Email</dt><dd>{patient.email ?? "—"}</dd></div>
            <div><dt>National ID</dt><dd>{patient.national_id ?? "—"}</dd></div>
            <div><dt>Address</dt><dd>{[patient.address_line, patient.city, patient.district].filter(Boolean).join(", ") || "—"}</dd></div>
            <div><dt>Blood group</dt><dd>{patient.blood_group ?? "—"}</dd></div>
            <div><dt>Allergies</dt><dd>{patient.allergies_summary ?? "—"}</dd></div>
            <div><dt>Emergency contact</dt><dd>{patient.emergency_contact_name ?? "—"}{patient.emergency_contact_phone ? ` • ${patient.emergency_contact_phone}` : ""}</dd></div>
          </dl>
        </section>
        <section className="staff-panel">
          <div className="staff-panel__header"><h2>Billing</h2></div>
          {timeline.invoices.length === 0 ? <p className="staff-table-empty">No invoices.</p> : (
            <ul className="staff-simple-list">{timeline.invoices.slice(0, 10).map((invoice) => (
              <li key={invoice.id}><span>{invoice.invoice_number} — {invoice.status}</span><span>{Number(invoice.total).toLocaleString()} {invoice.currency_code} • {Number(invoice.balance).toLocaleString()} due</span></li>
            ))}</ul>
          )}
        </section>
      </div>
      <div className="staff-detail-grid">
        <section className="staff-panel">
          <div className="staff-panel__header"><h2>Diagnoses</h2><span className="staff-table-sub">{timeline.diagnoses.length}</span></div>
          {timeline.diagnoses.length === 0 ? <p className="staff-table-empty">None recorded.</p> : (
            <ul className="staff-simple-list">{timeline.diagnoses.map((d) => <li key={d.id}><span>{d.diagnosis_name}{d.diagnosis_code ? ` (${d.diagnosis_code})` : ""} — {d.diagnosis_type}{!d.patient_visible ? " · staff-only" : ""}</span><span>{new Date(d.created_at).toLocaleDateString()}</span></li>)}</ul>
          )}
        </section>
        <section className="staff-panel">
          <div className="staff-panel__header"><h2>Clinical notes</h2><span className="staff-table-sub">{timeline.notes.length}</span></div>
          {timeline.notes.length === 0 ? <p className="staff-table-empty">None recorded.</p> : (
            <ul className="staff-simple-list">{timeline.notes.map((n) => {
              const author = n.profiles as { full_name?: string } | null;
              return <li key={n.id}><span><strong>{n.note_type}</strong>{!n.patient_visible ? " · staff-only" : ""} — {n.content.slice(0, 160)}{n.content.length > 160 ? "…" : ""}</span><span>{author?.full_name ?? "Clinician"} • {new Date(n.created_at).toLocaleDateString()}</span></li>;
            })}</ul>
          )}
        </section>
      </div>
      <div className="staff-detail-grid">
        <section className="staff-panel">
          <div className="staff-panel__header"><h2>Lab results</h2><span className="staff-table-sub">{timeline.labResults.length}</span></div>
          {timeline.labResults.length === 0 ? <p className="staff-table-empty">None.</p> : (
            <ul className="staff-simple-list">{timeline.labResults.map((r) => {
              const test = r.lab_tests as { name?: string; code?: string } | null;
              return <li key={r.id}><span>{test?.name ?? "Test"} — {r.result_value ?? "—"}{r.result_unit ? ` ${r.result_unit}` : ""} <em>{r.abnormal_flag}</em></span><span>{new Date(r.resulted_at ?? "").toLocaleDateString()}</span></li>;
            })}</ul>
          )}
        </section>
        <section className="staff-panel">
          <div className="staff-panel__header"><h2>Imaging reports</h2><span className="staff-table-sub">{timeline.imagingReports.length}</span></div>
          {timeline.imagingReports.length === 0 ? <p className="staff-table-empty">None.</p> : (
            <ul className="staff-simple-list">{timeline.imagingReports.map((r) => {
              const order = r.imaging_orders as { imaging_tests?: { name?: string; modality?: string } | null } | null;
              return <li key={r.id}><span>{order?.imaging_tests?.name ?? "Imaging"} — {r.status}{r.impression ? `: ${r.impression.slice(0, 80)}` : ""}</span><span>{r.approved_at ? new Date(r.approved_at).toLocaleDateString() : "Pending"}</span></li>;
            })}</ul>
          )}
        </section>
      </div>
      <div className="staff-detail-grid">
        <section className="staff-panel">
          <div className="staff-panel__header"><h2>Prescriptions</h2><span className="staff-table-sub">{timeline.prescriptions.length}</span></div>
          {timeline.prescriptions.length === 0 ? <p className="staff-table-empty">None.</p> : (
            <ul className="staff-simple-list">{timeline.prescriptions.map((rx) => {
              const items = (rx.prescription_items ?? []) as { medication_name?: string; dose?: string; frequency?: string }[];
              return <li key={rx.id}><span>{rx.status} — {items.map((i) => i.medication_name).filter(Boolean).join(", ") || "Items"}</span><span>{new Date(rx.created_at).toLocaleDateString()}</span></li>;
            })}</ul>
          )}
        </section>
        <section className="staff-panel">
          <div className="staff-panel__header"><h2>Admissions</h2><span className="staff-table-sub">{timeline.admissions.length}</span></div>
          {timeline.admissions.length === 0 ? <p className="staff-table-empty">None.</p> : (
            <ul className="staff-simple-list">{timeline.admissions.map((a) => {
              const ward = a.wards as { name?: string } | null;
              return <li key={a.id}><span>{a.admission_number} — {ward?.name ?? "Ward"} • {a.status}</span><span>{new Date(a.admitted_at).toLocaleDateString()}</span></li>;
            })}</ul>
          )}
        </section>
      </div>
      <section className="staff-panel">
        <div className="staff-panel__header"><h2>Appointments & encounters</h2></div>
        <div className="staff-table-wrap"><table className="staff-table">
          <thead><tr><th>When</th><th>Type</th><th>Detail</th><th>Status</th></tr></thead>
          <tbody>
            {timeline.appointments.map((a) => {
              const dept = a.departments as { name?: string } | null;
              const svc = a.services as { name?: string } | null;
              return <tr key={`a-${a.id}`}><td>{a.scheduled_start ? new Date(a.scheduled_start).toLocaleString() : "—"}</td><td>Appointment</td><td>{svc?.name ?? dept?.name ?? a.reason ?? "—"}</td><td>{a.status}</td></tr>;
            })}
            {timeline.encounters.map((e) => {
              const dept = e.departments as { name?: string } | null;
              return <tr key={`e-${e.id}`}><td>{e.started_at ? new Date(e.started_at).toLocaleString() : "—"}</td><td>Encounter</td><td>{dept?.name ?? "—"}{e.chief_complaint ? ` — ${e.chief_complaint}` : ""}</td><td>{e.status}</td></tr>;
            })}
            {timeline.appointments.length + timeline.encounters.length === 0 ? <tr><td colSpan={4} className="staff-table-empty">No visits yet.</td></tr> : null}
          </tbody>
        </table></div>
      </section>
    </div>
  );
}
