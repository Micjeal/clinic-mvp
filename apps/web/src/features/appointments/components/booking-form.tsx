"use client";

import type { Tables } from "@clinic/database";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { createAppointmentAction, getAvailableAppointmentSlots } from "@/server/actions/appointment.actions";
import {
  clinicianIsCompatible,
  filterPortalServices,
  portalBookingSteps,
} from "@/features/appointments/utils/portal-booking";
import type { PublicClinician } from "@/server/repositories/clinician.repository";

type PortalPatient = { name: string; patientNumber: string; phone: string; email: string };
type Slot = { startsAt: string; endsAt: string };
type BookingFormProps = {
  facilities: Tables<"facilities">[];
  departments: Tables<"departments">[];
  services: Tables<"services">[];
  clinicians?: PublicClinician[];
  initialSelection?: {
    facility?: string;
    department?: string;
    service?: string;
    date?: string;
    scheduledStart?: string;
  };
  initialClinician?: string;
  initialSlots?: Slot[];
  initialError?: string;
  variant?: "public" | "portal";
  patient?: PortalPatient;
};

function Submit({ isPublic }: { isPublic: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn booking-submit" disabled={pending} type="submit">
      {pending ? "Submitting…" : isPublic ? "Continue securely" : "Submit appointment request"}
    </button>
  );
}

function displayTime(value: string, timeZone?: string | null) {
  return new Intl.DateTimeFormat("en-UG", { timeStyle: "short", timeZone: timeZone || undefined })
    .format(new Date(value));
}

function todayInTimeZone(timeZone?: string | null) {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timeZone || undefined,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return "";
  }
}

export function BookingForm({
  facilities,
  departments,
  services,
  clinicians = [],
  initialSelection = {},
  initialClinician,
  initialSlots = [],
  initialError = "",
  variant = "public",
  patient,
}: BookingFormProps) {
  const [state, action] = useActionState(createAppointmentAction, null);
  const [step, setStep] = useState(1);
  const [facilityId, setFacilityId] = useState(initialSelection.facility || "");
  const [departmentId, setDepartmentId] = useState(initialSelection.department || "");
  const [serviceId, setServiceId] = useState(initialSelection.service || "");
  const [clinicianId, setClinicianId] = useState(initialClinician || "");
  const [date, setDate] = useState(initialSelection.date || "");
  const [scheduledStart, setScheduledStart] = useState(
    initialSelection.scheduledStart
      && initialSlots.some((slot) => slot.startsAt === initialSelection.scheduledStart)
      ? initialSelection.scheduledStart
      : "",
  );
  const [slots, setSlots] = useState<Slot[]>(initialSlots);
  const [reason, setReason] = useState("");
  const [error, setError] = useState(initialError);
  const [loading, startLoading] = useTransition();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const isPublic = variant === "public";
  const facility = facilities.find((item) => item.id === facilityId);
  const minDate = todayInTimeZone(facility?.timezone);
  const department = departments.find((item) => item.id === departmentId);
  const service = services.find((item) => item.id === serviceId);
  const clinician = clinicians.find((item) => item.key === clinicianId);
  const availableDepartments = useMemo(
    () => departments.filter((item) => !facilityId || item.facility_id === facilityId),
    [departments, facilityId],
  );
  const availableServices = useMemo(
    () => filterPortalServices(services, facilityId, departmentId),
    [services, facilityId, departmentId],
  );
  const availableClinicians = useMemo(
    () => clinicians.filter((item) => clinicianIsCompatible(item, { facilityId, departmentId, serviceId })),
    [clinicians, departmentId, facilityId, serviceId],
  );

  useEffect(() => { headingRef.current?.focus(); }, [step]);

  function resetDate() {
    setDate("");
    setScheduledStart("");
    setSlots([]);
  }

  function retainClinician(selection: { facilityId?: string; departmentId?: string; serviceId?: string }) {
    if (!clinician || clinicianIsCompatible(clinician, selection)) return;
    setClinicianId("");
    setError(`${clinician.displayName} is not available for that selection. Choose another Doctor.`);
  }

  function loadSlots() {
    if (!facilityId || !departmentId || !serviceId || !date) {
      setError("Choose a location, department, service and date first.");
      return;
    }
    setError("");
    startLoading(async () => {
      const result = await getAvailableAppointmentSlots({
        facilityId,
        departmentId,
        serviceId,
        clinicianSlug: clinicianId || undefined,
        date,
      });
      setSlots(result.slots);
      setScheduledStart("");
      if (result.error) setError(result.error);
    });
  }

  function next() {
    const valid = step === 1 ? Boolean(facilityId)
      : step === 2 ? Boolean(departmentId)
      : step === 3 ? Boolean(serviceId)
      : step === 5 ? Boolean(scheduledStart)
      : true;
    if (!valid) {
      setError(step === 1 ? "Select a care location to continue."
        : step === 2 ? "Select a department to continue."
        : step === 3 ? "Select a service to continue."
        : "Choose an available appointment time to continue.");
      return;
    }
    setError("");
    setStep((value) => Math.min(6, value + 1));
  }

  const nameParts = patient?.name.split(" ").filter(Boolean) ?? [];

  return (
    <form action={action} className="portal-booking-form">
      <ol aria-label="Appointment request progress" className="portal-booking-stepper">
        {portalBookingSteps.map((label, index) => (
          <li className={step === index + 1 ? "is-current" : step > index + 1 ? "is-complete" : ""} key={label}>
            <span>{index + 1}</span><strong>{label}</strong>
          </li>
        ))}
      </ol>
      <p className="portal-booking-mobile-step">Step {step} of {portalBookingSteps.length}<strong>{portalBookingSteps[step - 1]}</strong></p>
      <div className="portal-booking-panel">
        <h2 className="sr-only" ref={headingRef} tabIndex={-1}>{portalBookingSteps[step - 1]}</h2>

        {step === 1 ? <fieldset><legend>Choose a care location</legend><div className="portal-choice-grid">{facilities.map((item) => <label className={`portal-choice ${facilityId === item.id ? "is-selected" : ""}`} key={item.id}><input checked={facilityId === item.id} onChange={() => { setFacilityId(item.id); setDepartmentId(""); setServiceId(""); retainClinician({ facilityId: item.id }); resetDate(); }} type="radio" name="facility_choice" /><span><strong>{item.name}</strong><small>{item.city || item.district || "Care location"}</small></span></label>)}</div></fieldset> : null}

        {step === 2 ? <fieldset><legend>Choose a department</legend><div className="portal-choice-grid">{availableDepartments.map((item) => <label className={`portal-choice ${departmentId === item.id ? "is-selected" : ""}`} key={item.id}><input checked={departmentId === item.id} onChange={() => { setDepartmentId(item.id); setServiceId(""); retainClinician({ facilityId, departmentId: item.id }); resetDate(); }} type="radio" name="department_choice" /><span><strong>{item.name}</strong><small>{item.description || "Available clinic department"}</small></span></label>)}</div></fieldset> : null}

        {step === 3 ? <fieldset><legend>Choose a service</legend><div className="portal-choice-grid">{availableServices.map((item) => <label className={`portal-choice ${serviceId === item.id ? "is-selected" : ""}`} key={item.id}><input checked={serviceId === item.id} onChange={() => { setServiceId(item.id); retainClinician({ facilityId, departmentId, serviceId: item.id }); resetDate(); }} type="radio" name="service_choice" /><span><strong>{item.name}</strong><small>{item.duration_minutes ? `${item.duration_minutes} minutes` : department?.name || "Available service"}</small></span></label>)}</div></fieldset> : null}

        {step === 4 ? <fieldset><legend>Choose your doctor</legend><div className="portal-choice-grid"><label className={`portal-choice ${!clinicianId ? "is-selected" : ""}`}><input checked={!clinicianId} onChange={() => { setClinicianId(""); resetDate(); }} type="radio" name="doctor_choice" /><span><strong>Any available doctor</strong><small>Get the earliest eligible appointment.</small></span></label>{availableClinicians.map((item) => <label className={`portal-choice ${clinicianId === item.key ? "is-selected" : ""}`} key={item.key}><input checked={clinicianId === item.key} onChange={() => { setClinicianId(item.key); resetDate(); }} type="radio" name="doctor_choice" /><span><strong>{item.displayName}</strong><small>{item.professionalTitle || "Eligible clinician"}</small></span></label>)}</div></fieldset> : null}

        {step === 5 ? <fieldset><legend>Choose an available date and time</legend><label>Preferred date<input type="date" min={minDate} value={date} onChange={(event) => { setDate(event.target.value); setScheduledStart(""); setSlots([]); }} required /></label><button className="btn btn--secondary" disabled={loading || !date} onClick={loadSlots} type="button">{loading ? "Checking availability…" : "Find available times"}</button>{slots.length ? <div aria-label="Available appointment times" className="portal-slot-grid" role="radiogroup">{slots.map((slot) => <label className={`portal-slot ${scheduledStart === slot.startsAt ? "is-selected" : ""}`} key={slot.startsAt}><input checked={scheduledStart === slot.startsAt} name="slot_choice" onChange={() => setScheduledStart(slot.startsAt)} type="radio" /><span>{displayTime(slot.startsAt, facility?.timezone)}</span></label>)}</div> : date && !loading ? <p className="portal-booking-empty">No appointment times are available on this date. Choose another date or Doctor.</p> : null}<label>Reason for your request<textarea maxLength={500} onChange={(event) => setReason(event.target.value)} rows={4} value={reason} /></label><p className="portal-booking-notice">Only currently generated appointment times can be submitted. The clinic will review your request.</p></fieldset> : null}

        {step === 6 ? <fieldset><legend>Review appointment request</legend><dl className="portal-booking-review"><div><dt>Location</dt><dd>{facility?.name}</dd></div><div><dt>Department</dt><dd>{department?.name}</dd></div><div><dt>Service</dt><dd>{service?.name}</dd></div><div><dt>Doctor</dt><dd>{clinician?.displayName || "Any available doctor"}</dd></div><div><dt>Date and time</dt><dd>{scheduledStart ? new Intl.DateTimeFormat("en-UG", { dateStyle: "medium", timeStyle: "short", timeZone: facility?.timezone || undefined }).format(new Date(scheduledStart)) : "Not selected"}</dd></div>{patient ? <div><dt>Patient</dt><dd>{patient.name}{patient.patientNumber ? ` · ${patient.patientNumber}` : ""}</dd></div> : null}</dl><p className="portal-booking-notice">{isPublic ? "Sign in or create a patient account to submit this selected time securely." : "Submitting creates a requested appointment. It is not confirmed until the clinic responds."}</p></fieldset> : null}

        <input name="facility_id" type="hidden" value={facilityId} />
        <input name="department_id" type="hidden" value={departmentId} />
        <input name="service_id" type="hidden" value={serviceId} />
        <input name="clinician_slug" type="hidden" value={clinicianId} />
        <input name="booking_date" type="hidden" value={date} />
        <input name="scheduled_start" type="hidden" value={scheduledStart} />
        <input name="reason" type="hidden" value={reason} />
        <input name="first_name" type="hidden" value={nameParts[0] || ""} />
        <input name="last_name" type="hidden" value={nameParts.slice(1).join(" ")} />
        <input name="phone" type="hidden" value={patient?.phone || ""} />
        <input name="email" type="hidden" value={patient?.email || ""} />
        <input name="booking_context" type="hidden" value={isPublic ? "public" : "portal"} />

        {error || state?.error ? <p className="error" role="alert">{error || state?.error}</p> : null}
        <div className="portal-booking-actions">
          {step > 1 ? <button className="btn btn--secondary" onClick={() => { setError(""); setStep((value) => Math.max(1, value - 1)); }} type="button"><ChevronLeft aria-hidden="true" />Back</button> : <span />}
          {step < 6 ? <button className="btn" onClick={next} type="button">Continue<ChevronRight aria-hidden="true" /></button> : <Submit isPublic={isPublic} />}
        </div>
      </div>
    </form>
  );
}
