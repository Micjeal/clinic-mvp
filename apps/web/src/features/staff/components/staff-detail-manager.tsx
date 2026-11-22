"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  deleteExceptionAction,
  saveAvailabilityAction,
  saveExceptionAction,
  updateStaffMemberAction,
} from "@/server/actions/staff-management.actions";
import { ClinicalSetupEditor } from "@/features/staff/components/clinical-setup-editor";
import { PublicProfileEditor } from "@/features/staff/components/public-profile-editor";
import { PublishingControls } from "@/features/staff/components/publishing-controls";
import { facilityDateTimeLabel } from "@/lib/facility-time";

type Period = { dayOfWeek: number; startTime: string; endTime: string; effectiveFrom: string; effectiveTo: string };
type Exception = {
  id: string;
  facility_id: string;
  starts_at: string;
  ends_at: string;
  type: string;
};
type ActionState = { error?: string; success?: boolean; warning?: string } | null;
type Section = "summary" | "clinical" | "profile" | "availability" | "timeoff" | "account";
type Props = {
  member: {
    id: string;
    role_id: string;
    role_key: string;
    job_title: string | null;
    employee_number: string | null;
    registration_number: string | null;
    primary_facility_id: string | null;
    is_active: boolean;
    full_name?: string;
  };
  roles: Array<{ id: string; name: string; role_key: string }>;
  profile: {
    slug?: string | null;
    display_name: string;
    professional_title: string | null;
    public_bio: string | null;
    photo_path: string | null;
    years_experience?: number | null;
    experience_summary?: string | null;
    languages?: string[] | null;
    is_public: boolean;
    accepting_appointments: boolean;
  } | null;
  departmentIds: string[];
  serviceIds: string[];
  departments: Array<{ id: string; name: string; description: string | null }>;
  services: Array<{
    id: string;
    name: string;
    description: string | null;
    department_id: string | null;
    duration_minutes: number | null;
  }>;
  rules: Array<{
    facility_id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    effective_from: string | null;
    effective_to: string | null;
  }>;
  exceptions: Exception[];
  facilityId: string | null;
  facilities: Array<{ id: string; name: string; timezone: string }>;
  facilityName: string | null;
  nextAvailability: string | null;
  specializations: Array<{ id: string; name: string; description: string | null }>;
  qualifications: Array<{
    id: string;
    qualification_type: string;
    qualification: string;
    institution: string;
    country: string | null;
    year: number | null;
  }>;
  achievements: Array<{
    id: string;
    title: string;
    description: string | null;
    year: number | null;
  }>;
  initialSection?: Section;
};

const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const navigation = [
  { id: "clinical", label: "Clinical setup" },
  { id: "profile", label: "Public profile" },
  { id: "availability", label: "Availability" },
  { id: "timeoff", label: "Time off" },
  { id: "publishing", label: "Publishing" },
] as const;

function Result({
  state,
  fallback = "Changes saved successfully.",
}: {
  state: ActionState;
  fallback?: string;
}) {
  return (
    <>
      {state?.error ? (
        <p className="error" role="alert">
          {state.error}
        </p>
      ) : null}
      {state?.success ? (
        <p className="staff-form-success" role="status">
          {state.warning ?? fallback}
        </p>
      ) : null}
    </>
  );
}

export function StaffDetailManager({
  member,
  roles,
  profile,
  departmentIds,
  serviceIds,
  departments,
  services,
  rules,
  exceptions,
  facilityId,
  facilities,
  facilityName,
  nextAvailability,
  initialSection,
  specializations,
  qualifications,
  achievements,
}: Props) {
  const [accountState, accountAction] = useActionState(updateStaffMemberAction, null);
  const [scheduleState, scheduleAction] = useActionState(saveAvailabilityAction, null);
  const [exceptionState, exceptionAction] = useActionState(saveExceptionAction, null);
  const [deleteState, deleteAction] = useActionState(deleteExceptionAction, null);
  const [periods, setPeriods] = useState<Period[]>(
    rules.map((rule) => ({
      dayOfWeek: rule.day_of_week,
      startTime: rule.start_time.slice(0, 5),
      endTime: rule.end_time.slice(0, 5),
      effectiveFrom: rule.effective_from ?? "",
      effectiveTo: rule.effective_to ?? "",
    })),
  );
  const [copyFrom, setCopyFrom] = useState(1);
  const [copyTargets, setCopyTargets] = useState<number[]>([]);
  const timeOffDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (member.role_key !== "doctor" || !initialSection) return;
    const targetId = initialSection === "summary" ? "doctor-setup-top" : initialSection;
    window.requestAnimationFrame(() => {
      document.getElementById(targetId)?.scrollIntoView({ block: "start" });
    });
  }, [initialSection, member.role_key]);

  if (member.role_key !== "doctor") {
    return (
      <div className="staff-member-editor">
        <div className="staff-member-editor__main">
          <section className="staff-editor-section">
            <p className="eyebrow">Profile</p>
            <h2>Staff profile</h2>
            <dl className="staff-detail-list">
              <div><dt>Name</dt><dd>{member.full_name}</dd></div>
              <div><dt>Role</dt><dd>{roles.find((role) => role.id === member.role_id)?.name ?? "Staff member"}</dd></div>
              <div><dt>Job title</dt><dd>{member.job_title || "Not provided"}</dd></div>
            </dl>
          </section>
          <section className="staff-editor-section">
            <p className="eyebrow">Account access</p>
            <h2>Role, facility and status</h2>
            <form action={accountAction} className="staff-form-grid">
              <input name="membership_id" type="hidden" value={member.id} />
              <label>Role<select name="role_id" defaultValue={member.role_id}>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label>
              <label>Primary facility<select name="facility_id" defaultValue={member.primary_facility_id ?? ""}><option value="">No primary facility</option>{facilities.map((facility) => <option key={facility.id} value={facility.id}>{facility.name}</option>)}</select></label>
              <label>Job title<input name="job_title" defaultValue={member.job_title ?? ""} /></label>
              <label>Employee number<input name="employee_number" defaultValue={member.employee_number ?? ""} /></label>
              <label>Registration number<input name="registration_number" defaultValue={member.registration_number ?? ""} /></label>
              <label>Status<select name="is_active" defaultValue={String(member.is_active)}><option value="true">Active</option><option value="false">Suspended</option></select></label>
              <div className="staff-form-actions"><button className="btn" type="submit">Save changes</button><Result fallback="Account updated." state={accountState} /></div>
            </form>
          </section>
        </div>
        <aside className="staff-member-context">
          <p className="eyebrow">Assignment</p>
          <h2>{facilityName || "No facility assigned"}</h2>
          <p>{member.job_title || "Staff member"}</p>
          <div className="staff-context-rule" />
          <p className="eyebrow">Account state</p>
          <strong className={member.is_active ? "staff-context-positive" : "staff-context-negative"}>{member.is_active ? "Active" : "Suspended"}</strong>
        </aside>
      </div>
    );
  }

  const setupSteps = [
    ["Account", true],
    ["Facility", Boolean(facilityId)],
    ["Department", departmentIds.length > 0],
    ["Services", serviceIds.length > 0],
    ["Public profile", Boolean(profile?.display_name && profile?.professional_title)],
    ["Availability", rules.length > 0],
  ] as const;
  const setupComplete = setupSteps.filter(([, complete]) => complete).length;
  const savedPeriods = rules.map((rule) => ({
    dayOfWeek: rule.day_of_week,
    startTime: rule.start_time.slice(0, 5),
    endTime: rule.end_time.slice(0, 5),
    effectiveFrom: rule.effective_from ?? "",
    effectiveTo: rule.effective_to ?? "",
  }));
  const dirtySchedule = JSON.stringify(periods) !== JSON.stringify(savedPeriods);
  const bookingPaused = rules.length > 0 && !profile?.accepting_appointments;
  const facilityTimezone = facilities.find((facility) => facility.id === facilityId)?.timezone
    ?? "Africa/Kampala";

  function addPeriod(dayOfWeek: number) {
    setPeriods((items) => [...items, { dayOfWeek, startTime: "08:00", endTime: "12:00", effectiveFrom: "", effectiveTo: "" }]);
  }

  function updatePeriod(index: number, key: "startTime" | "endTime" | "effectiveFrom" | "effectiveTo", value: string) {
    setPeriods((items) =>
      items.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item),
    );
  }

  function removePeriod(index: number) {
    setPeriods((items) => items.filter((_, itemIndex) => itemIndex !== index));
  }

  function copySchedule() {
    const source = periods.filter((period) => period.dayOfWeek === copyFrom);
    setPeriods((items) => [
      ...items.filter((period) => !copyTargets.includes(period.dayOfWeek)),
      ...copyTargets.flatMap((dayOfWeek) => source.map((period) => ({ ...period, dayOfWeek }))),
    ]);
  }

  return (
    <div className="doctor-setup-page" id="doctor-setup-top">
      <section aria-labelledby="doctor-setup-progress-title" className="doctor-setup-progress">
        <div className="doctor-setup-progress__summary">
          <div>
            <p className="doctor-section-kicker">Setup progress</p>
            <h2 id="doctor-setup-progress-title">{setupComplete} of {setupSteps.length} complete</h2>
          </div>
          <div aria-label={`${Math.round((setupComplete / setupSteps.length) * 100)} percent complete`} aria-valuemax={100} aria-valuemin={0} aria-valuenow={Math.round((setupComplete / setupSteps.length) * 100)} className="doctor-setup-progress__bar" role="progressbar"><span style={{ width: `${(setupComplete / setupSteps.length) * 100}%` }} /></div>
        </div>
        <ol className="doctor-setup-progress__steps">
          {setupSteps.map(([label, complete], index) => (
            <li className={complete ? "is-complete" : ""} key={label}>
              <span aria-hidden="true">{complete ? "✓" : index + 1}</span>
              <strong>{label}</strong>
              <small>{complete ? "Complete" : "Required"}</small>
            </li>
          ))}
        </ol>
        <details className="doctor-account-access">
          <summary>Manage account, facility and employment details</summary>
          <form action={accountAction} className="staff-form-grid">
            <input name="membership_id" type="hidden" value={member.id} />
            <label>Role<select name="role_id" defaultValue={member.role_id}>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label>
            <label>Primary facility<select name="facility_id" defaultValue={member.primary_facility_id ?? ""}><option value="">No primary facility</option>{facilities.map((facility) => <option key={facility.id} value={facility.id}>{facility.name}</option>)}</select></label>
            <label>Job title<input name="job_title" defaultValue={member.job_title ?? ""} /></label>
            <label>Employee number<input name="employee_number" defaultValue={member.employee_number ?? ""} /></label>
            <label>Registration number<input name="registration_number" defaultValue={member.registration_number ?? ""} /></label>
            <label>Status<select name="is_active" defaultValue={String(member.is_active)}><option value="true">Active</option><option value="false">Suspended</option></select></label>
            <div className="staff-form-actions"><button className="btn" type="submit">Save account</button><Result fallback="Account updated." state={accountState} /></div>
          </form>
        </details>
      </section>

      <nav aria-label="Doctor setup sections" className="doctor-anchor-nav">
        {navigation.map((item) => <a href={`#${item.id}`} key={item.id}>{item.label}</a>)}
      </nav>

      <main className="doctor-setup-sections">
        <section className="doctor-setup-section" id="clinical">
          <ClinicalSetupEditor departments={departments} initialDepartmentIds={departmentIds} initialServiceIds={serviceIds} membershipId={member.id} services={services} />
        </section>

        <section className="doctor-setup-section" id="profile">
          <PublicProfileEditor achievements={achievements} membershipId={member.id} profile={profile} qualifications={qualifications} specializations={specializations} />
        </section>

        <section className="doctor-setup-section" id="availability">
          <div className="doctor-work-panel">
            <header className="doctor-section-heading">
              <p className="doctor-section-kicker">03 · Weekly availability</p>
              <h2>Regular consultation hours</h2>
              <p>{facilityName ? `Facility: ${facilityName}` : "Assign a primary facility before configuring availability."}</p>
            </header>
            {bookingPaused ? (
              <div className="doctor-booking-paused-banner">
                <p><strong>Online booking is paused.</strong> These hours remain saved, but patients cannot book them until online booking is enabled.</p>
                <a className="staff-table-action" href="#publishing">Review publishing</a>
              </div>
            ) : null}
            {facilityId ? (
              <form action={scheduleAction}>
                <input name="membership_id" type="hidden" value={member.id} />
                <input name="facility_id" type="hidden" value={facilityId} />
                <input name="periods_json" type="hidden" value={JSON.stringify(periods)} />
                <p className="form-help">Leave the effective window dates empty for a period that always applies.</p>
                <div className="doctor-schedule-list">
                  {days.map((day, dayOfWeek) => {
                    const dayPeriods = periods.filter((period) => period.dayOfWeek === dayOfWeek);
                    return (
                      <div className="doctor-schedule-row" key={day}>
                        <div className="doctor-schedule-day-label"><strong>{day}</strong><span>{dayPeriods.length ? "Available" : "Unavailable"}</span></div>
                        <div className="doctor-schedule-periods">
                          {dayPeriods.map((period) => {
                            const index = periods.indexOf(period);
                            return (
                              <div className="staff-schedule-period" key={`${day}-${index}`}>
                                <input aria-label={`${day} start`} onChange={(event) => updatePeriod(index, "startTime", event.target.value)} type="time" value={period.startTime} />
                                <span>to</span>
                                <input aria-label={`${day} end`} onChange={(event) => updatePeriod(index, "endTime", event.target.value)} type="time" value={period.endTime} />
                                <label className="staff-schedule-window">Window starts<input aria-label={`${day} effective from`} onChange={(event) => updatePeriod(index, "effectiveFrom", event.target.value)} type="date" value={period.effectiveFrom} /></label>
                                <label className="staff-schedule-window">Window ends<input aria-label={`${day} effective to`} onChange={(event) => updatePeriod(index, "effectiveTo", event.target.value)} type="date" value={period.effectiveTo} /></label>
                                <button className="btn btn--secondary" onClick={() => removePeriod(index)} type="button">Remove</button>
                              </div>
                            );
                          })}
                          <button className="staff-table-action" onClick={() => addPeriod(dayOfWeek)} type="button">+ Add hours</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="doctor-copy-hours">
                  <label>Copy from<select onChange={(event) => setCopyFrom(Number(event.target.value))} value={copyFrom}>{days.map((day, index) => <option key={day} value={index}>{day}</option>)}</select></label>
                  <div className="doctor-copy-targets"><strong>Copy to</strong>{days.map((day, index) => index !== copyFrom ? <label key={day}><input checked={copyTargets.includes(index)} onChange={() => setCopyTargets((items) => items.includes(index) ? items.filter((item) => item !== index) : [...items, index])} type="checkbox" />{day}</label> : null)}</div>
                  <button className="btn btn--secondary" disabled={!copyTargets.length} onClick={copySchedule} type="button">Copy hours</button>
                </div>
                {dirtySchedule ? (
                  <div className="doctor-unsaved-bar"><span>Unsaved availability changes</span><button className="btn btn--secondary" onClick={() => setPeriods(savedPeriods)} type="button">Discard</button><button className="btn" type="submit">Save availability</button></div>
                ) : null}
                <Result fallback="Availability updated." state={scheduleState} />
                {scheduleState?.success && !profile?.accepting_appointments ? <p className="doctor-booking-paused-note" role="status">This schedule is not currently bookable because online booking is paused.</p> : null}
              </form>
            ) : <p className="doctor-empty-inline">Choose a primary facility in Account before configuring availability.</p>}
          </div>
        </section>

        <section className="doctor-setup-section" id="timeoff">
          <div className="doctor-work-panel">
            <header className="doctor-section-heading doctor-section-heading--action">
              <div><p className="doctor-section-kicker">04 · Time off</p><h2>Schedule exceptions</h2><p>Unavailable periods and extra availability take precedence over the regular weekly schedule. Times use {facilityTimezone}.</p></div>
              <button className="btn btn--secondary btn--compact" disabled={!facilityId} onClick={() => timeOffDialogRef.current?.showModal()} type="button">Add time off</button>
            </header>
            <div className="doctor-timeoff-list">
              {exceptions.length ? exceptions.map((item) => (
                <article key={item.id}>
                  <div><strong>{item.type === "available_override" ? "Available override" : "Unavailable"}</strong><span>{facilityDateTimeLabel(item.starts_at, facilities.find((facility) => facility.id === item.facility_id)?.timezone ?? facilityTimezone)} – {facilityDateTimeLabel(item.ends_at, facilities.find((facility) => facility.id === item.facility_id)?.timezone ?? facilityTimezone)}</span></div>
                  <form action={deleteAction}><input name="id" type="hidden" value={item.id} /><input name="membership_id" type="hidden" value={member.id} /><button className="btn btn--secondary" type="submit">Remove</button></form>
                </article>
              )) : <div className="doctor-empty-inline">No upcoming schedule exceptions.<small>Add time off when the Doctor will be unavailable outside regular hours.</small></div>}
              <Result fallback="Time off removed." state={deleteState} />
            </div>
            <dialog className="doctor-timeoff-dialog" ref={timeOffDialogRef}>
              <div className="doctor-timeoff-dialog__heading"><div><p className="doctor-section-kicker">Schedule exception</p><h2>Add time off</h2></div><button aria-label="Close time off dialog" className="clinical-dialog-close" onClick={() => timeOffDialogRef.current?.close()} type="button">×</button></div>
              <form action={exceptionAction} className="doctor-timeoff-form">
                <input name="membership_id" type="hidden" value={member.id} />
                <input name="facility_id" type="hidden" value={facilityId ?? ""} />
                <label>Type<select name="type"><option value="unavailable">Unavailable</option><option value="available_override">Available override</option></select></label>
                <label>Starts ({facilityTimezone})<input name="starts_at" required type="datetime-local" /></label>
                <label>Ends ({facilityTimezone})<input name="ends_at" required type="datetime-local" /></label>
                <div className="doctor-timeoff-dialog__actions"><button className="btn btn--secondary" onClick={() => timeOffDialogRef.current?.close()} type="button">Cancel</button><button className="btn" type="submit">Add time off</button></div>
                <Result fallback="Time off added." state={exceptionState} />
              </form>
            </dialog>
          </div>
        </section>

        <section className="doctor-setup-section" id="publishing">
          <PublishingControls departmentCount={departmentIds.length} hasAvailability={rules.length > 0} membershipId={member.id} profile={profile} serviceCount={serviceIds.length} />
        </section>
      </main>
    </div>
  );
}
