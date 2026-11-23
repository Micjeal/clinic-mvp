import { notFound } from "next/navigation";
import Link from "next/link";
import { getTriageQueueEntry } from "@/server/services/reception.service";
import { StartTriageButton } from "@/features/staff/components/triage-actions";
import { TriageVitalsForm } from "@/features/staff/components/triage-vitals-form";
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
    {entry.status === "waiting_triage" ? <section className="staff-panel staff-triage-start"><div><p className="eyebrow">Next step</p><h2>Begin this assessment</h2><p>Open the triage form to record priority and vital signs for this visit.</p></div><StartTriageButton id={entry.id} priority={entry.priority as "routine" | "priority" | "urgent" | "emergency"} /></section> : <TriageVitalsForm queueId={entry.id} defaultPriority={entry.priority}>
      <aside className="staff-panel staff-triage-context"><div className="staff-panel-heading"><div><p className="eyebrow">Visit context</p><h2>Patient details</h2></div></div><dl><div><dt>Patient number</dt><dd>{patient.patient_number}</dd></div><div><dt>Department</dt><dd>{entry.departments?.name ?? "Unavailable"}</dd></div><div><dt>Service</dt><dd>{entry.encounters.service_id ? "Assigned service" : "Not specified"}</dd></div><div><dt>Chief complaint</dt><dd>{entry.encounters.chief_complaint || "Not provided"}</dd></div><div><dt>Arrival</dt><dd>{new Date(entry.checked_in_at).toLocaleString("en-UG", { dateStyle: "medium", timeStyle: "short" })}</dd></div></dl></aside>
    </TriageVitalsForm>}
  </div>;
}
