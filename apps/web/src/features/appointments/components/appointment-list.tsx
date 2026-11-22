"use client";

import {isPatientCancellationStatus} from "@clinic/shared";
import {ArrowRight,Building2,CalendarDays,Clock3,MapPin,Stethoscope} from "lucide-react";
import Link from "next/link";
import {useActionState} from "react";
import {useFormStatus} from "react-dom";

import {formatAppointmentDate,formatAppointmentTime} from "@/features/appointments/utils/patient-appointments";
import {safePortalName} from "@/lib/public-content";
import {cancelAppointmentAction} from "@/server/actions/appointment.actions";
import type {PatientAppointment} from "@/types/patient-portal";

import {StatusChip} from "./status-chip";

function CancelSubmit(){const {pending}=useFormStatus();return <button className="btn btn--danger patient-cancel-button" disabled={pending} type="submit">{pending?"Cancelling…":"Cancel"}</button>;}

export function PatientCancelAppointment({id}:{id:string}){
  const [state,action]=useActionState(cancelAppointmentAction.bind(null,id),null);
  return <form action={action} className="patient-cancel-form"><CancelSubmit/>{state?.error?<small className="error" role="alert">{state.error}</small>:null}{state?.success?<small className="success" role="status">{state.success}</small>:null}</form>;
}

export function AppointmentList({rows,emptyTitle="No appointments yet",emptyDescription="Your submitted appointment requests will appear here."}:{rows:PatientAppointment[];emptyTitle?:string;emptyDescription?:string}){
  if(!rows.length)return <div className="patient-list-empty"><CalendarDays aria-hidden="true"/><h2>{emptyTitle}</h2><p>{emptyDescription}</p><Link className="btn" href="/portal/appointments/new">Book Appointment</Link></div>;
  return <div className="patient-appointment-list">{rows.map(appointment=><article className="patient-appointment-card" key={appointment.id}>
    <div className="patient-appointment-card__top"><div className="patient-appointment-card__date"><span><CalendarDays aria-hidden="true"/></span><div><small>{formatAppointmentDate(appointment.scheduledStart)}</small><strong><Clock3 aria-hidden="true"/>{formatAppointmentTime(appointment.scheduledStart)}</strong></div></div><StatusChip status={appointment.status}/></div>
    <dl><div><dt><Building2 aria-hidden="true"/>Department</dt><dd>{safePortalName(appointment.departmentName,"Department not available")}</dd></div><div><dt><Stethoscope aria-hidden="true"/>Service</dt><dd>{safePortalName(appointment.serviceName,"Service not specified")}</dd></div><div><dt>Doctor</dt><dd>{safePortalName(appointment.clinicianName,"To be assigned")}</dd></div><div className="patient-appointment-card__facility"><dt><MapPin aria-hidden="true"/>Facility</dt><dd>{safePortalName(appointment.facility.name,"Care location not available")}</dd></div></dl>
    <div className="patient-appointment-card__actions"><Link className="btn btn--secondary" href={`/portal/appointments/${appointment.id}`}>View details<ArrowRight aria-hidden="true"/></Link>{isPatientCancellationStatus(appointment.status)?<PatientCancelAppointment id={appointment.id}/>:null}</div>
  </article>)}</div>;
}
