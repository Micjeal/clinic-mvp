"use client";

import { useState, useTransition } from "react";
import { createShiftAction, deleteShiftAction, requestLeaveAction, reviewLeaveAction } from "@/server/actions/hr.actions";

type Membership = { id: string; profiles?: { full_name?: string; email?: string } | null; roles?: { name?: string } | null };
type Facility = { id: string; name: string };
type Shift = { id: string; shift_date: string; start_time: string; end_time: string; role_on_duty: string | null; staff_memberships?: { profiles?: { full_name?: string } | null } | null; facilities?: { name?: string } | null };

export function ShiftForm({ memberships, facilities }: { memberships: Membership[]; facilities: Facility[] }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  return (
    <form action={(formData) => startTransition(async () => {
      const result = await createShiftAction(null, formData);
      setMessage(result.error ?? "Shift added.");
      if (!result.error) window.location.reload();
    })} className="staff-form-grid" style={{ marginBottom: "1.25rem" }}>
      <label>Staff<select name="staff_membership_id" required>
        <option value="">Choose…</option>
        {memberships.map((m) => { const profile = m.profiles as { full_name?: string; email?: string } | null; const role = m.roles as { name?: string } | null; return <option key={m.id} value={m.id}>{profile?.full_name ?? profile?.email}{role?.name ? ` — ${role.name}` : ""}</option>; })}
      </select></label>
      <label>Facility<select name="facility_id"><option value="">Any facility</option>{facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></label>
      <label>Date<input name="shift_date" required type="date" /></label>
      <label>Start<input name="start_time" required type="time" /></label>
      <label>End<input name="end_time" required type="time" /></label>
      <label>Role on duty<input name="role_on_duty" placeholder="e.g. Triage nurse" /></label>
      <div className="staff-form-actions"><button className="btn btn--compact" disabled={pending} type="submit">{pending ? "Adding…" : "Add shift"}</button>{message ? <span className="staff-table-empty">{message}</span> : null}</div>
    </form>
  );
}

export function ShiftRowActions({ shiftId }: { shiftId: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  return (
    <span style={{ display: "inline-flex", gap: ".4rem", alignItems: "center" }}>
      <button className="btn btn--secondary btn--compact" disabled={pending} onClick={() => startTransition(async () => {
        const result = await deleteShiftAction(shiftId);
        setMessage(result.error ?? "");
        if (!result.error) window.location.reload();
      })} type="button">Remove</button>
      {message ? <span className="staff-table-empty">{message}</span> : null}
    </span>
  );
}

export function LeaveRequestForm() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  return (
    <form action={(formData) => startTransition(async () => {
      const result = await requestLeaveAction(null, formData);
      setMessage(result.error ?? "Request submitted.");
      if (!result.error) window.location.reload();
    })} className="staff-form-grid" style={{ marginBottom: "1.25rem" }}>
      <label>Type<select name="leave_type" defaultValue="annual"><option value="annual">Annual</option><option value="sick">Sick</option><option value="maternity">Maternity</option><option value="paternity">Paternity</option><option value="compassionate">Compassionate</option><option value="unpaid">Unpaid</option><option value="other">Other</option></select></label>
      <label>From<input name="start_date" required type="date" /></label>
      <label>To<input name="end_date" required type="date" /></label>
      <label className="staff-form-grid__wide">Reason<textarea name="reason" rows={2} /></label>
      <div className="staff-form-actions"><button className="btn btn--compact" disabled={pending} type="submit">{pending ? "Submitting…" : "Request leave"}</button>{message ? <span className="staff-table-empty">{message}</span> : null}</div>
    </form>
  );
}

export function LeaveReviewButtons({ leaveId, status }: { leaveId: string; status: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  if (status !== "pending") return null;
  const decide = (decision: "approved" | "rejected") => startTransition(async () => {
    const formData = new FormData();
    formData.set("leave_id", leaveId);
    formData.set("decision", decision);
    const result = await reviewLeaveAction(null, formData);
    setMessage(result.error ?? "");
    if (!result.error) window.location.reload();
  });
  return (
    <span style={{ display: "inline-flex", gap: ".4rem", alignItems: "center" }}>
      <button className="btn btn--compact" disabled={pending} onClick={() => decide("approved")} type="button">Approve</button>
      <button className="btn btn--secondary btn--compact" disabled={pending} onClick={() => decide("rejected")} type="button">Reject</button>
      {message ? <span className="staff-table-empty">{message}</span> : null}
    </span>
  );
}
