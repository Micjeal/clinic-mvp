import {AtSign,Building2,CalendarDays,Clock3,MapPin,Phone,UserRound} from "lucide-react";
import {appointmentStatusLabels} from "@clinic/shared";
import Link from "next/link";
import {notFound} from "next/navigation";
import {Permissions} from "@clinic/permissions";
import {AppointmentStatusActions} from "@/features/appointments/components/appointment-status-actions";
import {StaffClinicianAssignment} from "@/features/appointments/components/staff-clinician-assignment";
import {StatusChip} from "@/features/appointments/components/status-chip";
import {formatAppointmentDate,formatAppointmentDateTime,formatAppointmentTime} from "@/features/appointments/utils/staff-appointments";
import {NotFoundError} from "@/server/errors";
import {getAssignableCliniciansForAppointment,getStaffAppointment} from "@/server/services/appointment.service";
import {getStaffPortalContext} from "@/server/services/staff-portal.service";

export const metadata={title:"Appointment"};
const workflow=["requested","scheduled","confirmed","checked_in","in_progress","completed"];

export default async function StaffAppointmentDetailPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  let appointment;
  try{appointment=await getStaffAppointment(id);}catch(error){if(error instanceof NotFoundError)notFound();throw error;}
  const context=await getStaffPortalContext(),canUpdate=context.permissions.includes(Permissions.APPOINTMENT_UPDATE),clinicians=canUpdate?await getAssignableCliniciansForAppointment(id):[];
  return <div className="staff-page staff-detail-page"><nav aria-label="Breadcrumb" className="staff-breadcrumb"><Link href="/staff/appointments">Appointments</Link><span aria-hidden="true">/</span><span aria-current="page">Appointment</span></nav>
    <header className="staff-page-heading staff-detail-heading"><div><p className="eyebrow">Appointment management</p><h1>{appointment.patient.name}</h1><p>{appointment.patient.number}</p></div><StatusChip status={appointment.status}/></header>
    <section aria-labelledby="staff-status-timeline-title" className="staff-panel staff-status-timeline"><div className="staff-panel-heading"><div><p className="eyebrow">Workflow</p><h2 id="staff-status-timeline-title">Appointment status</h2></div></div><ol>{workflow.map((status,index)=>{const current=appointment.status===status;const completed=appointment.status!=="cancelled"&&appointment.status!=="no_show"&&workflow.indexOf(appointment.status)>index;return <li className={`${current?"is-current ":""}${completed?"is-complete":""}`} key={status}><span>{index+1}</span><div><strong>{appointmentStatusLabels[status as keyof typeof appointmentStatusLabels]}</strong>{current?<small>Current status</small>:null}</div></li>;})}</ol>{appointment.status==="cancelled"||appointment.status==="no_show"?<p className="staff-terminal-status"><strong>{appointmentStatusLabels[appointment.status as keyof typeof appointmentStatusLabels]}</strong> This appointment is no longer active.</p>:null}</section>
    <div className="staff-detail-grid"><section className="staff-panel staff-detail-section"><div className="staff-panel-heading"><div><p className="eyebrow">Appointment</p><h2>Request details</h2></div></div><dl className="staff-detail-list"><div><dt><CalendarDays aria-hidden="true"/>Preferred date</dt><dd>{formatAppointmentDate(appointment.scheduledStart,context.timezone)}</dd></div><div><dt><Clock3 aria-hidden="true"/>Preferred time</dt><dd>{formatAppointmentTime(appointment.scheduledStart,context.timezone)}</dd></div><div><dt><MapPin aria-hidden="true"/>Facility</dt><dd>{appointment.facility.name}</dd></div><div><dt><Building2 aria-hidden="true"/>Department</dt><dd>{appointment.department.name}</dd></div><div><dt>Service</dt><dd>{appointment.service?.name??"General consultation"}</dd></div><div className="staff-detail-list__wide"><dt>Reason</dt><dd>{appointment.reason||"No reason was provided."}</dd></div></dl></section>
      <section className="staff-panel staff-detail-section"><div className="staff-panel-heading"><div><p className="eyebrow">Patient</p><h2>Contact information</h2></div></div><dl className="staff-detail-list"><div><dt><UserRound aria-hidden="true"/>Patient name</dt><dd>{appointment.patient.name}</dd></div><div><dt>Patient number</dt><dd>{appointment.patient.number}</dd></div><div><dt><Phone aria-hidden="true"/>Phone</dt><dd>{appointment.patient.phone||"Not provided"}</dd></div><div><dt><AtSign aria-hidden="true"/>Email</dt><dd>{appointment.patient.email||"Not provided"}</dd></div></dl></section>
      <section className="staff-panel staff-detail-section staff-detail-section--request"><div className="staff-panel-heading"><div><p className="eyebrow">Request information</p><h2>Submission</h2></div></div><dl className="staff-detail-list"><div><dt>Created date</dt><dd>{formatAppointmentDateTime(appointment.createdAt,context.timezone)}</dd></div><div><dt>Created by</dt><dd>{appointment.createdByLabel}</dd></div></dl></section></div>
    {canUpdate?<StaffClinicianAssignment appointmentId={appointment.id} currentUserId={appointment.clinicianUserId} clinicians={clinicians}/>:null}<AppointmentStatusActions appointmentId={appointment.id} canUpdate={canUpdate} currentStatus={appointment.status}/>
  </div>;
}
