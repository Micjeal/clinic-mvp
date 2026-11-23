import { notFound } from "next/navigation";
import Link from "next/link";
import { getTriageQueueEntry } from "@/server/services/reception.service";
import { recordTriageAction } from "@/server/actions/reception.actions";
import { StartTriageButton } from "@/features/staff/components/triage-actions";
import { StaffPageHeader } from "@/features/staff/components/staff-content";
import { StaffAccessDenied } from "@/features/staff/components/access-denied";
import { AuthorizationError } from "@/server/errors";

export const metadata = { title: "Triage detail" };

export default async function TriageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let entry;
  try { entry = await getTriageQueueEntry(id); }
  catch (error) { if (error instanceof AuthorizationError) return <StaffAccessDenied />; throw error; }
  if (!entry?.encounters?.patients) notFound();
  const patient = entry.encounters.patients;
  const currentStage = entry.status === "waiting_triage" ? "Waiting for triage" : "In triage";
  return <div className="staff-page">
    <div className="staff-breadcrumb"><Link href="/staff/triage">&larr; Triage</Link></div>
    <StaffPageHeader eyebrow="Triage assessment" title={`${patient.first_name} ${patient.last_name}`} description={`${patient.patient_number} · ${entry.departments?.name ?? "Department unavailable"}`} context={<div className="staff-page-heading__actions"><span className={`staff-priority staff-priority--${entry.priority}`}>{entry.priority}</span><span className="staff-stage-label">{currentStage}</span></div>} />
    {entry.status === "waiting_triage" ? <section className="staff-panel staff-triage-start"><div><p className="eyebrow">Next step</p><h2>Begin this assessment</h2><p>Open the triage form to record priority and vital signs for this visit.</p></div><StartTriageButton id={entry.id} priority={entry.priority as "routine" | "priority" | "urgent" | "emergency"} /></section> : <form action={async (formData) => { await recordTriageAction(null, formData); }} className="staff-triage-detail-form">
      <input name="queue_id" type="hidden" value={entry.id} />
      <section className="staff-panel"><div className="staff-panel-heading"><div><p className="eyebrow">Clinical intake</p><h2>Vitals and priority</h2><p className="staff-section-description">Record the patient’s measured observations. Priority remains a clinical staff decision.</p></div></div><fieldset className="staff-priority-fieldset"><legend>Priority</legend><div className="staff-priority-options">{[["routine", "Routine"], ["priority", "Priority"], ["urgent", "Urgent"], ["emergency", "Emergency"]].map(([value, label]) => <label key={value} className={`staff-priority-option staff-priority-option--${value}`}><input defaultChecked={entry.priority === value} name="priority" type="radio" value={value} /><span>{label}</span></label>)}</div></fieldset><fieldset><legend>Vital signs</legend><div className="staff-vitals-grid"><label>Temperature<input min="0" name="temperature_c" step="any" type="number" /><span>°C</span></label><label>Pulse<input min="0" name="pulse_bpm" step="1" type="number" /><span>bpm</span></label><label>Respiratory rate<input min="0" name="respiratory_rate" step="1" type="number" /><span>breaths/min</span></label><label>Oxygen saturation<input min="0" max="100" name="oxygen_saturation" step="any" type="number" /><span>%</span></label><label>Blood pressure<input min="0" name="systolic_bp" step="1" type="number" placeholder="Systolic" /><span>mmHg</span></label><label>Blood pressure<input min="0" name="diastolic_bp" step="1" type="number" placeholder="Diastolic" /><span>mmHg</span></label><label>Weight<input min="0" name="weight_kg" step="any" type="number" /><span>kg</span></label><label>Height<input min="0" name="height_cm" step="any" type="number" /><span>cm</span></label></div><label className="staff-vitals-notes">Notes<textarea name="notes" rows={4} /></label></fieldset><div className="staff-form-actions staff-triage-form-actions"><button className="btn btn-primary" type="submit">Complete triage</button></div></section>
      <aside className="staff-panel staff-triage-context"><div className="staff-panel-heading"><div><p className="eyebrow">Visit context</p><h2>Patient details</h2></div></div><dl><div><dt>Patient number</dt><dd>{patient.patient_number}</dd></div><div><dt>Department</dt><dd>{entry.departments?.name ?? "Unavailable"}</dd></div><div><dt>Service</dt><dd>{entry.encounters.service_id ? "Assigned service" : "Not specified"}</dd></div><div><dt>Chief complaint</dt><dd>{entry.encounters.chief_complaint || "Not provided"}</dd></div><div><dt>Arrival</dt><dd>{new Date(entry.checked_in_at).toLocaleString("en-UG", { dateStyle: "medium", timeStyle: "short" })}</dd></div></dl></aside>
    </form>}
  </div>;
}
