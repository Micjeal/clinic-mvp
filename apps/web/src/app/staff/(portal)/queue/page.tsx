import Link from "next/link";
import { Clock3 } from "lucide-react";
import { getQueue } from "@/server/services/reception.service";
import { QueueAction } from "@/features/staff/components/reception-actions";
import { StaffPageHeader } from "@/features/staff/components/staff-content";
import { getStaffPortalContext } from "@/server/services/staff-portal.service";
import { StaffAccessDenied } from "@/features/staff/components/access-denied";
import { AuthorizationError } from "@/server/errors";

const stages = [
  ["waiting_triage", "Waiting for triage", "triage.write"],
  ["in_triage", "In triage", "triage.write"],
  ["waiting_clinician", "Ready for clinician", "queue.manage"],
  ["with_clinician", "With clinician", "queue.manage"],
] as const;
const priorityRank: Record<string, number> = { emergency: 0, urgent: 1, priority: 2, routine: 3 };

function waitingSince(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  return minutes < 1 ? "Just checked in" : `${minutes} min waiting`;
}

export const metadata = { title: "Queue" };

export default async function QueuePage() {
  let entries, context;
  try { [entries, context] = await Promise.all([getQueue(), getStaffPortalContext()]); }
  catch (error) { if (error instanceof AuthorizationError) return <StaffAccessDenied />; throw error; }
  return <div className="staff-page">
    <StaffPageHeader eyebrow="Patient flow" title="Patient Queue" description="Track patients waiting for triage or clinician care." />
    <div className="staff-queue-board">
      {stages.map(([status, label, permission]) => {
        const group = entries.filter((entry) => entry.status === status).sort((a, b) => (priorityRank[a.priority] ?? 9) - (priorityRank[b.priority] ?? 9) || new Date(a.checked_in_at).getTime() - new Date(b.checked_in_at).getTime());
        return <section className="staff-queue-group" key={status}>
          <header className="staff-queue-group__header"><div><p className="eyebrow">Queue stage</p><h2>{label}</h2></div><span className="staff-queue-count">{group.length}</span></header>
          {group.length ? <div className="staff-queue-cards">{group.map((entry) => { const patient = entry.encounters?.patients; const clinicianUserId = entry.encounters?.clinician_user_id ?? null; const isClinicalStage = status === "waiting_clinician" || status === "with_clinician"; const canClinical = context.permissions?.includes("queue.clinical") ?? false; const canOverride = context.permissions?.includes("queue.override") ?? false; const isAssignedClinician = clinicianUserId != null && clinicianUserId === context.userId; const canAct = !isClinicalStage || (isAssignedClinician ? canClinical : canOverride); const requiresOverride = isClinicalStage && canAct && !isAssignedClinician; return <article className="staff-queue-card" key={entry.id}>
            <div className="staff-queue-card__identity"><h3>{patient?.id ? <Link className="staff-table-link" href={`/staff/patients/${patient.id}`}>{patient.first_name} {patient.last_name}</Link> : patient ? `${patient.first_name} ${patient.last_name}` : "Patient"}</h3><p>{patient?.patient_number ?? "Patient number unavailable"}</p></div>
            <span className={`staff-priority staff-priority--${entry.priority}`}>{entry.priority}</span>
            <dl><div><dt>Department</dt><dd>{entry.departments?.name ?? "Department unavailable"}</dd></div><div><dt>Waiting</dt><dd suppressHydrationWarning><Clock3 aria-hidden="true" />{waitingSince(entry.checked_in_at)}</dd></div></dl>
            {context.permissions?.includes(permission) ? <QueueAction id={entry.id} status={entry.status as "waiting_triage" | "in_triage" | "waiting_clinician" | "with_clinician"} priority={entry.priority as "routine" | "priority" | "urgent" | "emergency"} canAct={canAct} requiresOverride={requiresOverride} /> : null}
          </article>; })}</div> : <div className="staff-empty staff-empty--compact"><p>No patients in this stage.</p></div>}
        </section>;
      })}
    </div>
  </div>;
}
