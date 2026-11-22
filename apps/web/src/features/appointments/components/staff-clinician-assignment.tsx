"use client";

import { useActionState } from "react";
import { assignAppointmentClinicianAction } from "@/server/actions/staff-appointment.actions";

type Clinician = { userId: string; displayName: string; professionalTitle: string | null; available: boolean };
export function StaffClinicianAssignment({ appointmentId, currentUserId, clinicians }: { appointmentId: string; currentUserId?: string | null; clinicians: Clinician[] }) {
  const [state, action] = useActionState(async (_previous: { error?: string; success?: string } | null, formData: FormData) => assignAppointmentClinicianAction(appointmentId, String(formData.get("clinician_user_id") || "") || null), null);
  return <section className="staff-panel staff-detail-section"><div className="staff-panel-heading"><div><p className="eyebrow">Clinician</p><h2>{currentUserId ? "Assigned doctor" : "Doctor not assigned"}</h2></div></div><form action={action} className="staff-clinician-picker"><label>Choose an eligible doctor<select name="clinician_user_id" defaultValue={currentUserId ?? ""}><option value="">Not assigned</option>{clinicians.map((clinician) => <option disabled={!clinician.available} key={clinician.userId} value={clinician.userId}>{clinician.displayName}{clinician.professionalTitle ? ` · ${clinician.professionalTitle}` : ""}{clinician.available ? " · Available" : " · Conflict at this time"}</option>)}</select></label>{!clinicians.length ? <p className="form-help">No eligible doctors are available for this appointment time.</p> : null}<button className="btn" type="submit">{currentUserId ? "Change doctor" : "Assign doctor"}</button>{state?.error ? <p className="error" role="alert">{state.error}</p> : state?.success ? <p className="staff-form-success" role="status">{state.success}</p> : null}</form></section>;
}
