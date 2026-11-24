import { notFound } from "next/navigation";
import Link from "next/link";
import { getTriageQueueEntry } from "@/server/services/reception.service";
import { StartTriageButton } from "@/features/staff/components/triage-actions";
import { TriageVitalsForm } from "@/features/staff/components/triage-vitals-form";
import { StaffPageHeader } from "@/features/staff/components/staff-content";
import { StaffAccessDenied } from "@/features/staff/components/access-denied";
import { AuthorizationError } from "@/server/errors";
import { getEncounterClinical } from "@/server/services/clinical.service";
import { requirePermission } from "@/server/permissions/require-permission";
import { Permissions } from "@clinic/permissions";
import { DiagnosisForm, ClinicalNoteForm } from "@/features/clinical/components/clinical-forms";

export const metadata = { title: "Triage detail" };

export default async function TriageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let entry;
  try { entry = await getTriageQueueEntry(id); }
  catch (error) { if (error instanceof AuthorizationError) return <StaffAccessDenied />; throw error; }
  if (!entry?.encounters?.patients) notFound();
  const patient = entry.encounters.patients;
  const encounterId = (entry.encounters as { id?: string }).id;
  const canNote = await requirePermission(Permissions.CLINICAL_NOTE_WRITE).then(() => true).catch(() => false);
  const canDiagnose = await requirePermission(Permissions.DIAGNOSIS_WRITE).then(() => true).catch(() => false);
  const clinical = encounterId && (canNote || canDiagnose) ? await getEncounterClinical(encounterId, patient.id).catch(() => null) : null;
  const currentStage = entry.status === "waiting_triage" ? "Waiting for triage" : "In triage";
  return <div className="staff-page">
    <div className="staff-breadcrumb"><Link href="/staff/triage">&larr; Triage</Link></div>
    <StaffPageHeader eyebrow="Triage assessment" title={`${patient.first_name} ${patient.last_name}`} description={`${patient.patient_number} · ${entry.departments?.name ?? "Department unavailable"}`} context={<div className="staff-page-heading__actions"><span className={`staff-priority staff-priority--${entry.priority}`}>{entry.priority}</span><span className="staff-stage-label">{currentStage}</span></div>} />
    {entry.status === "waiting_triage" ? <section className="staff-panel staff-triage-start"><div><p className="eyebrow">Next step</p><h2>Begin this assessment</h2><p>Open the triage form to record priority and vital signs for this visit.</p></div><StartTriageButton id={entry.id} priority={entry.priority as "routine" | "priority" | "urgent" | "emergency"} /></section> : <TriageVitalsForm queueId={entry.id} defaultPriority={entry.priority}>
      <aside className="staff-panel staff-triage-context"><div className="staff-panel-heading"><div><p className="eyebrow">Visit context</p><h2>Patient details</h2></div></div><dl><div><dt>Patient number</dt><dd>{patient.patient_number}</dd></div><div><dt>Department</dt><dd>{entry.departments?.name ?? "Unavailable"}</dd></div><div><dt>Service</dt><dd>{entry.encounters.service_id ? "Assigned service" : "Not specified"}</dd></div><div><dt>Chief complaint</dt><dd>{entry.encounters.chief_complaint || "Not provided"}</dd></div><div><dt>Arrival</dt><dd>{new Date(entry.checked_in_at).toLocaleString("en-UG", { dateStyle: "medium", timeStyle: "short" })}</dd></div></dl></aside>
    </TriageVitalsForm>}
    {clinical ? <div className="staff-detail-grid" style={{ marginTop: "1.25rem" }}>
      <section className="staff-panel">
        <div className="staff-panel__header"><h2>Diagnoses</h2><span className="staff-table-sub">{clinical.diagnoses.length} recorded</span></div>
        {clinical.diagnoses.length ? <ul className="staff-simple-list">{clinical.diagnoses.map((diagnosis) => {
          const author = diagnosis.profiles as { full_name?: string } | null;
          return <li key={diagnosis.id}><span><strong>{diagnosis.diagnosis_name}</strong>{diagnosis.diagnosis_code ? ` (${diagnosis.diagnosis_code})` : ""} — {diagnosis.diagnosis_type}{diagnosis.notes ? ` · ${diagnosis.notes}` : ""}</span><span>{author?.full_name ?? "Clinician"} • {new Date(diagnosis.created_at).toLocaleDateString()}</span></li>;
        })}</ul> : <p className="staff-table-empty">No diagnoses recorded for this encounter.</p>}
        {canDiagnose ? <div style={{ marginTop: "1rem" }}><DiagnosisForm encounterId={encounterId!} patientId={patient.id} /></div> : null}
      </section>
      <section className="staff-panel">
        <div className="staff-panel__header"><h2>Clinical notes</h2><span className="staff-table-sub">{clinical.notes.length} entries</span></div>
        {clinical.notes.length ? <ul className="staff-simple-list">{clinical.notes.map((note) => {
          const author = note.profiles as { full_name?: string } | null;
          return <li key={note.id}><span><strong>{note.note_type}</strong>{note.patient_visible ? " · patient-visible" : ""} — {note.content.slice(0, 140)}{note.content.length > 140 ? "…" : ""}</span><span>{author?.full_name ?? "Clinician"} • {new Date(note.created_at).toLocaleString()}</span></li>;
        })}</ul> : <p className="staff-table-empty">No notes recorded for this encounter.</p>}
        {canNote ? <div style={{ marginTop: "1rem" }}><ClinicalNoteForm encounterId={encounterId!} patientId={patient.id} /></div> : null}
      </section>
    </div> : null}
  </div>;
}
