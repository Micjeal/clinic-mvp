import {CalendarX2,ChevronRight} from "lucide-react";
import Link from "next/link";
import type {StaffAppointment} from "@/features/appointments/types/staff-appointment.types";
import {formatAppointmentDate,formatAppointmentTime} from "@/features/appointments/utils/staff-appointments";
import {StatusChip} from "@/features/appointments/components/status-chip";

export function StaffAppointmentList({appointments,timeZone}:{appointments:StaffAppointment[];timeZone:string}){
  if(!appointments.length)return <div className="staff-empty"><CalendarX2 aria-hidden="true"/><h2>No appointment requests found.</h2><p>New appointment requests will appear here once patients submit them.</p></div>;
  return <>
    <div className="staff-table-wrap"><table className="staff-table"><thead><tr><th scope="col">Date / time</th><th scope="col">Patient</th><th scope="col">Patient number</th><th scope="col">Department</th><th scope="col">Service</th><th scope="col">Doctor</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Action</span></th></tr></thead><tbody>{appointments.map(item=><tr key={item.id}><td><strong>{formatAppointmentTime(item.scheduledStart,timeZone)}</strong><span>{formatAppointmentDate(item.scheduledStart,timeZone)}</span></td><td>{item.patient.name}</td><td>{item.patient.number}</td><td>{item.department.name}</td><td>{item.service?.name??"General consultation"}</td><td>{item.clinician?.name??"Unassigned"}</td><td><StatusChip status={item.status}/></td><td><Link className="staff-table-action" href={`/staff/appointments/${item.id}`}>View<span className="sr-only"> {item.patient.name}&apos;s appointment</span><ChevronRight aria-hidden="true"/></Link></td></tr>)}</tbody></table></div>
    <div className="staff-mobile-list">{appointments.map(item=><article className="staff-appointment-card" key={item.id}><div className="staff-appointment-card__time"><strong>{formatAppointmentTime(item.scheduledStart,timeZone)}</strong><span>{formatAppointmentDate(item.scheduledStart,timeZone)}</span></div><StatusChip status={item.status}/><div className="staff-appointment-card__patient"><h2>{item.patient.name}</h2><p>{item.patient.number}</p></div><dl><div><dt>Department</dt><dd>{item.department.name}</dd></div><div><dt>Service</dt><dd>{item.service?.name??"General consultation"}</dd></div><div><dt>Doctor</dt><dd>{item.clinician?.name??"Unassigned"}</dd></div></dl><Link className="btn" href={`/staff/appointments/${item.id}`}>View appointment</Link></article>)}</div>
  </>;
}
