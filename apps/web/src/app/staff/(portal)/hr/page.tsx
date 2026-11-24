import { StaffPageHeader } from "@/features/staff/components/staff-content";
import { StaffAccessDenied } from "@/features/staff/components/access-denied";
import { getRoster } from "@/server/services/hr.service";
import { requirePermission } from "@/server/permissions/require-permission";
import { Permissions } from "@clinic/permissions";
import { AuthorizationError } from "@/server/errors";
import { LeaveRequestForm, LeaveReviewButtons, ShiftForm, ShiftRowActions } from "@/features/hr/components/hr-workspace";

export const metadata = { title: "Staff scheduling" };

const LEAVE_LABELS: Record<string, string> = { annual: "Annual", sick: "Sick", maternity: "Maternity", paternity: "Paternity", compassionate: "Compassionate", unpaid: "Unpaid", other: "Other" };

export default async function HrPage() {
  let roster;
  try {
    roster = await getRoster();
  } catch (error) {
    if (error instanceof AuthorizationError) return <StaffAccessDenied />;
    throw error;
  }
  const { shifts, leave, memberships, facilities } = roster;
  const canManage = await requirePermission(Permissions.HR_MANAGE).then(() => true).catch(() => false);
  const pendingLeave = leave.filter((l) => l.status === "pending").length;

  return (
    <div className="staff-page">
      <StaffPageHeader eyebrow="People" title="Staff scheduling" description="Shifts, roster and leave requests for the next 7 days." />
      <div className="staff-kpi-grid">
        <div className="staff-kpi"><span>Shifts (7d)</span><strong>{shifts.length}</strong></div>
        <div className="staff-kpi"><span>Pending leave</span><strong>{pendingLeave}</strong></div>
        <div className="staff-kpi"><span>Active staff</span><strong>{memberships.length}</strong></div>
      </div>
      {canManage ? <section className="staff-panel"><div className="staff-panel__header"><h2>Schedule a shift</h2></div><ShiftForm facilities={facilities as never} memberships={memberships as never} /></section> : null}
      <section className="staff-panel">
        <div className="staff-panel__header"><h2>Upcoming shifts</h2></div>
        <div className="staff-table-wrap"><table className="staff-table">
          <thead><tr><th>Date</th><th>Staff</th><th>Time</th><th>Role</th><th>Facility</th>{canManage ? <th /> : null}</tr></thead>
          <tbody>
            {shifts.length === 0 ? <tr><td colSpan={6} className="staff-table-empty">No shifts scheduled this week.</td></tr> :
              shifts.map((shift) => {
                const member = shift.staff_memberships as { profiles?: { full_name?: string } | null } | null;
                return <tr key={shift.id}><td>{shift.shift_date}</td><td>{member?.profiles?.full_name ?? "—"}</td><td>{shift.start_time}–{shift.end_time}</td><td>{shift.role_on_duty ?? "—"}</td><td>{(shift.facilities as { name?: string } | null)?.name ?? "—"}</td>{canManage ? <td><ShiftRowActions shiftId={shift.id} /></td> : null}</tr>;
              })}
          </tbody>
        </table></div>
      </section>
      <section className="staff-panel">
        <div className="staff-panel__header"><h2>Leave</h2></div>
        <LeaveRequestForm />
        {leave.length === 0 ? <p className="staff-table-empty">No leave requests.</p> : (
          <div className="staff-table-wrap"><table className="staff-table">
            <thead><tr><th>Staff</th><th>Type</th><th>Dates</th><th>Reason</th><th>Status</th>{canManage ? <th /> : null}</tr></thead>
            <tbody>
              {leave.map((l) => {
                const member = l.staff_memberships as { profiles?: { full_name?: string } | null } | null;
                return <tr key={l.id}><td>{member?.profiles?.full_name ?? "—"}</td><td>{LEAVE_LABELS[l.leave_type] ?? l.leave_type}</td><td>{l.start_date} → {l.end_date}</td><td>{l.reason ?? "—"}</td><td><span className={`staff-status ${l.status === "approved" ? "staff-status--paid" : l.status === "rejected" ? "staff-status--void" : "staff-status--issued"}`}>{l.status}</span></td>{canManage ? <td><LeaveReviewButtons leaveId={l.id} status={l.status} /></td> : null}</tr>;
              })}
            </tbody>
          </table></div>
        )}
      </section>
    </div>
  );
}
