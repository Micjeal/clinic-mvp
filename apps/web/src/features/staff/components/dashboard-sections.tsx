import { ArrowRight, CalendarX2 } from "lucide-react";
import Link from "next/link";
import type { StaffAppointment } from "@/features/appointments/types/staff-appointment.types";
import { formatAppointmentDate, formatAppointmentDateTime, formatAppointmentTime } from "@/features/appointments/utils/staff-appointments";
import { StatusChip } from "@/features/appointments/components/status-chip";

function Empty({ message }: { message: string }) {
  return <div className="staff-empty staff-empty--compact"><CalendarX2 aria-hidden="true" /><p>{message}</p></div>;
}

const queueStageMeta: Record<string, { label: string; hint: string }> = {
  waiting_triage: { label: "Waiting for triage", hint: "Needs triage review" },
  in_triage: { label: "In triage", hint: "Being assessed" },
  waiting_clinician: { label: "Ready for clinician", hint: "Awaiting doctor" },
  with_clinician: { label: "With clinician", hint: "Consultation in progress" },
};

export type QueueSnapshotEntry = {
  id: string;
  status: string;
  priority: string;
  checked_in_at: string;
  encounters?: { patients?: { first_name: string | null; last_name: string | null; patient_number?: string | null } | null } | null;
  departments?: { name: string } | null;
};

function waitLabel(checkedInAt: string, now: number) {
  const minutes = Math.max(0, Math.floor((now - new Date(checkedInAt).getTime()) / 60000));
  if (minutes < 1) return "Just arrived";
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export function TodaySchedule({ items, timeZone }: { items: StaffAppointment[]; timeZone: string }) {
  return <section className="staff-panel staff-dash-panel">
    <div className="staff-panel-heading">
      <div><p className="eyebrow">Daily schedule</p><h2>Today&apos;s appointments <span className="staff-panel-count">{items.length}</span></h2></div>
      <Link className="staff-panel-link" href="/staff/appointments">View all <ArrowRight aria-hidden="true" /></Link>
    </div>
    {items.length ? <>
      <div className="staff-dashboard-table"><table className="staff-table">
        <thead><tr><th scope="col">Time</th><th scope="col">Patient</th><th scope="col">Department</th><th scope="col">Clinician</th><th scope="col">Service</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Action</span></th></tr></thead>
        <tbody>{items.map((item) => <tr key={item.id}>
          <td><strong>{formatAppointmentTime(item.scheduledStart, timeZone)}</strong></td>
          <td><span className="staff-cell-stack"><strong>{item.patient.name}</strong><small>{item.patient.number}</small></span></td>
          <td>{item.department.name}</td>
          <td>{item.clinician?.name ?? "Unassigned"}</td>
          <td>{item.service?.name ?? "General consultation"}</td>
          <td><StatusChip status={item.status} /></td>
          <td><Link className="staff-table-action" href={`/staff/appointments/${item.id}`}>View</Link></td>
        </tr>)}</tbody>
      </table></div>
      <div className="staff-mobile-list">{items.map((item) => <article className="staff-dashboard-mobile-card" key={item.id}>
        <div><strong>{formatAppointmentTime(item.scheduledStart, timeZone)}</strong><StatusChip status={item.status} /></div>
        <h3>{item.patient.name}</h3>
        <p>{item.department.name} · {item.clinician?.name ?? "Unassigned"} · {item.service?.name ?? "General consultation"}</p>
        <Link href={`/staff/appointments/${item.id}`}>View appointment</Link>
      </article>)}</div>
    </> : <Empty message="There are no appointments scheduled for today." />}
  </section>;
}

export function AttentionPanel({ items, timeZone }: { items: StaffAppointment[]; timeZone: string }) {
  return <section className="staff-panel staff-dash-panel">
    <div className="staff-panel-heading">
      <div><p className="eyebrow">Priority queue</p><h2>Needs attention <span className="staff-panel-count">{items.length}</span></h2></div>
      <Link className="staff-panel-link" href="/staff/appointments">View all <ArrowRight aria-hidden="true" /></Link>
    </div>
    {items.length ? <div className="staff-priority-list">{items.map((item) => <article key={item.id}>
      <div><strong>{item.patient.name}</strong><span>{item.patient.number}</span></div>
      <div><span>{formatAppointmentDateTime(item.scheduledStart, timeZone)}</span><small>{item.department.name} · {item.service?.name ?? "General consultation"}</small></div>
      <StatusChip status={item.status} />
      <Link href={`/staff/appointments/${item.id}`}>View<span className="sr-only"> appointment for {item.patient.name}</span></Link>
    </article>)}</div> : <Empty message="No appointments currently need attention." />}
  </section>;
}

export function QueueSnapshot({ entries, now }: { entries: QueueSnapshotEntry[]; now: number }) {
  const stages = Object.keys(queueStageMeta).map((status) => ({ status, ...queueStageMeta[status], items: entries.filter((entry) => entry.status === status) }));
  const waiting = entries
    .filter((entry) => entry.status === "waiting_triage" || entry.status === "waiting_clinician")
    .sort((a, b) => new Date(a.checked_in_at).getTime() - new Date(b.checked_in_at).getTime())
    .slice(0, 5);
  return <section className="staff-panel staff-dash-panel">
    <div className="staff-panel-heading">
      <div><p className="eyebrow">Live queue</p><h2>Patients in queue <span className="staff-panel-count">{entries.length}</span></h2></div>
      <Link className="staff-panel-link" href="/staff/queue">Open queue <ArrowRight aria-hidden="true" /></Link>
    </div>
    {entries.length ? <>
      <ul className="staff-queue-snapshot__stages">
        {stages.map((stage) => <li key={stage.status}>
          <span className={`staff-queue-snapshot__dot staff-queue-snapshot__dot--${stage.status}`} aria-hidden="true" />
          <span className="staff-queue-snapshot__label">{stage.label}</span>
          <small>{stage.hint}</small>
          <strong>{stage.items.length}</strong>
        </li>)}
      </ul>
      {waiting.length ? <div className="staff-queue-snapshot__waiting">
        <p className="staff-nav-label">Longest waiting</p>
        {waiting.map((entry) => {
          const patient = entry.encounters?.patients;
          const name = patient ? [patient.first_name, patient.last_name].filter(Boolean).join(" ") : "Patient";
          return <div className="staff-queue-snapshot__row" key={entry.id}>
            <span><strong>{name}</strong><small>{entry.departments?.name ?? "Department unavailable"}</small></span>
            <span className="staff-queue-snapshot__wait">{waitLabel(entry.checked_in_at, now)}</span>
          </div>;
        })}
      </div> : null}
    </> : <Empty message="The queue is clear — no patients waiting." />}
  </section>;
}

export function RecentAppointments({ items, timeZone }: { items: StaffAppointment[]; timeZone: string }) {
  return <section className="staff-panel staff-dash-panel">
    <div className="staff-panel-heading">
      <div><p className="eyebrow">Latest activity</p><h2>Recent appointments <span className="staff-panel-count">{items.length}</span></h2></div>
      <Link className="staff-panel-link" href="/staff/appointments">View all <ArrowRight aria-hidden="true" /></Link>
    </div>
    {items.length ? <>
      <div className="staff-dashboard-table"><table className="staff-table">
        <thead><tr><th scope="col">Patient</th><th scope="col">Reference</th><th scope="col">Department</th><th scope="col">Clinician</th><th scope="col">Scheduled</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Action</span></th></tr></thead>
        <tbody>{items.map((item) => <tr key={item.id}>
          <td><span className="staff-cell-stack"><strong>{item.patient.name}</strong><small>{item.patient.number}</small></span></td>
          <td><code className="staff-ref">{item.id.slice(0, 8).toUpperCase()}</code></td>
          <td>{item.department.name}</td>
          <td>{item.clinician?.name ?? "Unassigned"}</td>
          <td>{formatAppointmentDateTime(item.scheduledStart, timeZone)}</td>
          <td><StatusChip status={item.status} /></td>
          <td><Link className="staff-table-action" href={`/staff/appointments/${item.id}`}>View</Link></td>
        </tr>)}</tbody>
      </table></div>
      <div className="staff-mobile-list">{items.map((item) => <article className="staff-dashboard-mobile-card" key={item.id}>
        <div><strong>{item.patient.name}</strong><StatusChip status={item.status} /></div>
        <p>{item.department.name} · {item.clinician?.name ?? "Unassigned"} · {formatAppointmentDateTime(item.scheduledStart, timeZone)}</p>
        <Link href={`/staff/appointments/${item.id}`}>View appointment</Link>
      </article>)}</div>
    </> : <Empty message="No appointment activity yet." />}
  </section>;
}
