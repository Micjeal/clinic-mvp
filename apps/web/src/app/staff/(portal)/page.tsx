import { Building, CalendarDays, CheckCircle2, ClipboardCheck, ClipboardList, Clock3, Plus, UserPlus } from "lucide-react";
import Link from "next/link";
import { AttentionPanel, QueueSnapshot, RecentAppointments, TodaySchedule, type QueueSnapshotEntry } from "@/features/staff/components/dashboard-sections";
import { StaffKpiCard, StaffPageHeader, StaffQuickActions } from "@/features/staff/components/staff-content";
import { buildOpsMetrics, buildStaffDashboard } from "@/features/staff/utils/staff-dashboard";
import { getStaffAppointments } from "@/server/services/appointment.service";
import { getQueue } from "@/server/services/reception.service";
import { getStaffPortalContext } from "@/server/services/staff-portal.service";
import { AuthorizationError } from "@/server/errors";

export const metadata = { title: "Staff dashboard" };

export default async function StaffDashboardPage() {
  const context = await getStaffPortalContext();
  const [appointments, queueResult] = await Promise.all([
    getStaffAppointments(),
    getQueue().catch((error) => { if (error instanceof AuthorizationError) return []; throw error; }),
  ]);
  const dashboard = buildStaffDashboard(appointments, { timeZone: context.timezone });
  const ops = buildOpsMetrics(appointments, queueResult, { timeZone: context.timezone });

  const now = new Date();
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: context.timezone }).format(now));
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const dateLabel = new Intl.DateTimeFormat("en-UG", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: context.timezone }).format(now);
  const permissions = context.permissions ?? [];

  const quickActions = [
    permissions.includes("reception.checkin") ? { href: "/staff/reception/walk-in", label: "Register walk-in", description: "Check in a patient without an appointment", icon: ClipboardCheck } : null,
    permissions.includes("queue.read") ? { href: "/staff/queue", label: "Open patient queue", description: "Triage and clinician flow board", icon: ClipboardList } : null,
    { href: "/staff/appointments?status=requested", label: "Review requests", description: "Appointment requests awaiting action", icon: CalendarDays },
    permissions.includes("staff.manage") ? { href: "/staff/users/new", label: "Add staff member", description: "Create a staff account and role", icon: UserPlus } : null,
    permissions.includes("department.manage") ? { href: "/staff/departments/new", label: "Add department", description: "Extend the care catalogue", icon: Building } : null,
  ].filter((action): action is NonNullable<typeof action> => action !== null);

  return <div className="staff-page">
    <StaffPageHeader
      eyebrow={`${context.organization} · ${dateLabel}`}
      title={`${greeting}, ${context.name.split(" ")[0]}`}
      description="Here's what needs attention today."
      actions={permissions.includes("reception.checkin") ? <Link className="btn btn-primary" href="/staff/reception/walk-in"><Plus aria-hidden="true" />Walk-in</Link> : null}
      context={<div className="staff-page-heading__context"><span>Signed in as</span><strong>{context.role}</strong></div>}
    />

    <section aria-label="Key figures" className="staff-kpi-grid">
      <StaffKpiCard icon={CalendarDays} label="Appointments today" value={ops.todayAppointments} hint={`of ${ops.totalAppointments} on record`} tone="blue" href="/staff/appointments" />
      <StaffKpiCard icon={ClipboardList} label="Patients waiting" value={ops.patientsWaiting} hint="waiting for triage or clinician" tone={ops.patientsWaiting > 0 ? "amber" : "green"} href={permissions.includes("queue.read") ? "/staff/queue" : undefined} />
      <StaffKpiCard icon={CheckCircle2} label="Completed today" value={ops.completedToday} hint="consultations finished" tone="green" />
      <StaffKpiCard icon={Clock3} label="Avg. waiting time" value={ops.avgWaitMinutes == null ? "—" : `${ops.avgWaitMinutes} min`} hint="across active queue entries" tone="violet" href={permissions.includes("queue.read") ? "/staff/queue" : undefined} />
    </section>

    <div className="staff-dash-grid">
      <div className="staff-dash-main">
        <TodaySchedule items={dashboard.today} timeZone={context.timezone} />
      </div>
      <aside className="staff-dash-side">
        <AttentionPanel items={dashboard.attention} timeZone={context.timezone} />
        {permissions.includes("queue.read") ? <QueueSnapshot entries={queueResult as QueueSnapshotEntry[]} now={now.getTime()} /> : null}
      </aside>
    </div>

    <RecentAppointments items={dashboard.recent.slice(0, 8)} timeZone={context.timezone} />

    <StaffQuickActions actions={quickActions} />
  </div>;
}
