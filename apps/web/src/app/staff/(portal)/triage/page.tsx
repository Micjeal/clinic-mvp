import Link from "next/link";
import { getTriageQueue } from "@/server/services/reception.service";
import { StaffPageHeader } from "@/features/staff/components/staff-content";
import { StaffAccessDenied } from "@/features/staff/components/access-denied";
import { AuthorizationError } from "@/server/errors";

export const metadata = { title: "Triage" };

export default async function TriagePage() {
  let entries;
  try { entries = await getTriageQueue(); }
  catch (error) { if (error instanceof AuthorizationError) return <StaffAccessDenied />; throw error; }
  return <div className="staff-page">
    <StaffPageHeader eyebrow="Clinical intake" title="Triage" description="Assess patients before clinician review." />
    {entries.length ? <div className="staff-triage-list">{entries.map((entry) => { const patient = entry.encounters?.patients; return <article className="staff-triage-card" key={entry.id}>
      <div className="staff-triage-card__identity"><h2>{patient?.id ? <Link className="staff-table-link" href={`/staff/patients/${patient.id}`}>{patient.first_name} {patient.last_name}</Link> : patient ? `${patient.first_name} ${patient.last_name}` : "Patient"}</h2><p>{patient?.patient_number ?? "Patient number unavailable"}</p></div>
      <dl><div><dt>Arrival</dt><dd>{new Date(entry.checked_in_at).toLocaleTimeString("en-UG", { hour: "2-digit", minute: "2-digit" })}</dd></div><div><dt>Department</dt><dd>{entry.departments?.name ?? "Unavailable"}</dd></div><div><dt>Stage</dt><dd>{entry.status === "waiting_triage" ? "Waiting for triage" : "In triage"}</dd></div></dl>
      <span className={`staff-priority staff-priority--${entry.priority}`}>{entry.priority}</span>
      <Link className="btn btn-primary" href={`/staff/triage/${entry.id}`}>{entry.status === "waiting_triage" ? "Start triage" : "Continue"}</Link>
    </article>; })}</div> : <div className="staff-empty"><h2>No patients are waiting for triage.</h2><p>New check-ins will appear here.</p></div>}
  </div>;
}
