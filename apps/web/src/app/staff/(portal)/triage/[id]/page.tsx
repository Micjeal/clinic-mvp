import { notFound } from "next/navigation";
import Link from "next/link";
import { getTriageQueueEntry } from "@/server/services/reception.service";
import { StartTriageButton } from "@/features/staff/components/triage-actions";
import { TriageVitalsForm } from "@/features/staff/components/triage-vitals-form";
import { StaffPageHeader } from "@/features/staff/components/staff-content";
import { StaffAccessDenied } from "@/features/staff/components/access-denied";
import { AuthorizationError } from "@/server/errors";
import { getEncounterClinical } from "@/server/services/clinical.service";
import { createAdminClient } from "@/lib/supabase/admin";
import { EncounterVitalsForm } from "@/features/clinical/components/encounter-vitals-form";
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
  const admin = createAdminClient() as unknown as import("@supabase/supabase-js").SupabaseClient;
  const [{ data: labOrders }, { data: imagingOrders }, { data: vitalsRows }] = await Promise.all([
    admin.from("lab_orders").select("id,status,priority,clinician_notified_at,created_at").eq("encounter_id", encounterId ?? "").order("created_at", { ascending: false }),
    admin.from("imaging_orders").select("id,status,priority,clinician_notified_at,created_at").eq("encounter_id", encounterId ?? "").order("created_at", { ascending: false }),
    admin.from("vitals").select("temperature_c,pulse_bpm,respiratory_rate,systolic_bp,diastolic_bp,oxygen_saturation,weight_kg,height_cm,notes,recorded_at").eq("encounter_id", encounterId ?? "").order("recorded_at", { ascending: false }).limit(1),
  ]);
  const latestVitals = vitalsRows?.[0] ?? null;
  const investigations = [
    ...(labOrders ?? []).map((o) => ({ ...o, kind: "Lab" as const, href: `/staff/lab/orders/${o.id}` })),
    ...(imagingOrders ?? []).map((o) => ({ ...o, kind: "Imaging" as const, href: `/staff/radiology/orders/${o.id}` })),
  ];
  return <div className="staff-page">
    <div className="staff-breadcrumb"><Link href="/staff/triage">&larr; Triage</Link></div>
    <StaffPageHeader eyebrow="Triage assessment" title={`${patient.first_name} ${patient.last_name}`} description={`${patient.patient_number} · ${entry.departments?.name ?? "Department unavailable"}`} context={<div className="staff-page-heading__actions"><span className={`staff-priority staff-priority--${entry.priority}`}>{entry.priority}</span><span className="staff-stage-label">{currentStage}</span>{encounterId && entry.status !== "waiting_triage" && entry.status !== "in_triage" ? <EncounterVitalsForm encounterId={encounterId} queueId={entry.id} /> : null}</div>} />
    {encounterId ? <section className="staff-panel"><div className="staff-panel__header"><h2>Further investigations</h2><span className="staff-table-sub">Send for lab or imaging</span></div><div className="staff-form-actions"><Link className="btn btn--secondary" href={`/staff/lab/orders/new?encounter=${encounterId}`}>Order lab tests</Link><Link className="btn btn--secondary" href={`/staff/radiology/orders/new?encounter=${encounterId}`}>Order imaging</Link><Link className="btn btn--secondary" href={`/staff/pharmacy/new?encounter=${encounterId}`}>Prescribe</Link><Link className="btn btn--secondary" href={`/staff/wards/admissions/new?encounter=${encounterId}`}>Admit patient</Link></div></section> : null}
    {entry.status === "waiting_triage" ? <section className="staff-panel staff-triage-start"><div><p className="eyebrow">Next step</p><h2>Begin this assessment</h2><p>Open the triage form to record priority and vital signs for this visit.</p></div><StartTriageButton id={entry.id} priority={entry.priority as "routine" | "priority" | "urgent" | "emergency"} /></section> : entry.status === "in_triage" ? <TriageVitalsForm queueId={entry.id} defaultPriority={entry.priority}>
      <aside className="staff-panel staff-triage-context"><div className="staff-panel-heading"><div><p className="eyebrow">Visit context</p><h2>Patient details</h2></div></div><dl><div><dt>Patient number</dt><dd>{patient.patient_number}</dd></div><div><dt>Department</dt><dd>{entry.departments?.name ?? "Unavailable"}</dd></div><div><dt>Service</dt><dd>{entry.encounters.service_id ? "Assigned service" : "Not specified"}</dd></div><div><dt>Chief complaint</dt><dd>{entry.encounters.chief_complaint || "Not provided"}</dd></div><div><dt>Arrival</dt><dd>{new Date(entry.checked_in_at).toLocaleString("en-UG", { dateStyle: "medium", timeStyle: "short" })}</dd></div></dl></aside>
    </TriageVitalsForm> : latestVitals ? <section className="staff-panel"><div className="staff-panel__header"><h2>Triage vitals</h2><span className="staff-table-sub">Recorded {new Date(latestVitals.recorded_at).toLocaleString("en-UG", { dateStyle: "medium", timeStyle: "short" })}</span></div>
      <dl className="staff-detail-list">
        <div><dt>Temp</dt><dd>{latestVitals.temperature_c != null ? `${latestVitals.temperature_c} °C` : "—"}</dd></div>
        <div><dt>Pulse</dt><dd>{latestVitals.pulse_bpm != null ? `${latestVitals.pulse_bpm} bpm` : "—"}</dd></div>
        <div><dt>Resp rate</dt><dd>{latestVitals.respiratory_rate != null ? `${latestVitals.respiratory_rate} /min` : "—"}</dd></div>
        <div><dt>BP</dt><dd>{latestVitals.systolic_bp != null ? `${latestVitals.systolic_bp}/${latestVitals.diastolic_bp ?? "—"}` : "—"}</dd></div>
        <div><dt>SpO₂</dt><dd>{latestVitals.oxygen_saturation != null ? `${latestVitals.oxygen_saturation}%` : "—"}</dd></div>
        <div><dt>Weight / Height</dt><dd>{latestVitals.weight_kg != null ? `${latestVitals.weight_kg} kg` : "—"}{latestVitals.height_cm != null ? ` / ${latestVitals.height_cm} cm` : ""}</dd></div>
        {latestVitals.notes ? <div className="staff-form-grid__wide"><dt>Notes</dt><dd>{latestVitals.notes}</dd></div> : null}
      </dl>
    </section> : <section className="staff-panel"><div className="staff-panel__header"><h2>Triage vitals</h2></div><p className="staff-table-empty">No vitals recorded yet.</p></section>}
    {investigations.length ? <section className="staff-panel" style={{ marginTop: "1.25rem" }}>
      <div className="staff-panel__header"><h2>Investigations</h2><span className="staff-table-sub">{investigations.length} order{investigations.length === 1 ? "" : "s"}</span></div>
      <ul className="staff-simple-list">{investigations.map((inv) => (
        <li key={`${inv.kind}-${inv.id}`}>
          <span><strong>{inv.kind} order</strong> — {inv.status.replace("_", " ")}{inv.priority !== "routine" ? ` · ${inv.priority.toUpperCase()}` : ""}{inv.clinician_notified_at ? " · sent to doctor" : ""}</span>
          <span><Link className="staff-table-link" href={inv.href}>Open →</Link></span>
        </li>
      ))}</ul>
    </section> : null}
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
