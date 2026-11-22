import {ArrowRight,CalendarCheck2,CalendarDays,CalendarPlus,Clock3,MapPin,MessageCircle,UserRound} from "lucide-react";
import Link from "next/link";

import {StatusChip} from "@/features/appointments/components/status-chip";
import {findUpcomingAppointment,formatAppointmentDate,formatAppointmentTime} from "@/features/appointments/utils/patient-appointments";
import {safeFacilityLocation,safePortalName} from "@/lib/public-content";
import {requirePatient} from "@/server/auth/require-patient";
import {getPatientAppointments} from "@/server/services/appointment.service";
import {PatientPageHeader} from "@/features/patient/components/patient-content";

export const metadata={title:"Patient portal"};

const quickActions=[
  {href:"/portal/appointments/new",title:"Book Appointment",description:"Request a preferred date and time for your next visit.",icon:CalendarPlus},
  {href:"/portal/appointments",title:"View Appointments",description:"Track requests, scheduled visits and appointment history.",icon:CalendarDays},
  {href:"/portal/profile",title:"Update Profile",description:"Review the personal and contact details linked to your account.",icon:UserRound},
  {href:"/portal/help",title:"Contact Clinic",description:"Find help with appointments and available clinic contacts.",icon:MessageCircle},
] as const;

export default async function PortalPage(){
  const [{patient},appointments]=await Promise.all([requirePatient(),getPatientAppointments()]);
  const upcoming=findUpcomingAppointment(appointments);
  const counts={requested:appointments.filter(item=>item.status==="requested").length,scheduled:appointments.filter(item=>item.status==="scheduled"||item.status==="confirmed").length,completed:appointments.filter(item=>item.status==="completed").length};
  const firstName=patient.first_name||"Patient";
  return <div className="patient-portal-page">
    <PatientPageHeader className="patient-page-heading--welcome" eyebrow="Overview" title={`Welcome back, ${firstName}`} description="Manage your appointment requests and keep your patient details close at hand." action={<Link className="btn patient-primary-cta" href="/portal/appointments/new"><CalendarPlus aria-hidden="true" />Book Appointment</Link>} />

    <section aria-labelledby="upcoming-appointment-title" className="patient-upcoming-card">
      <div className="patient-upcoming-card__heading"><div><p className="eyebrow">Your next visit</p><h2 id="upcoming-appointment-title">Upcoming Appointment</h2></div>{upcoming?<StatusChip status={upcoming.status}/>:null}</div>
      {upcoming?<><dl className="patient-upcoming-details"><div><dt><CalendarCheck2 aria-hidden="true" />Date</dt><dd>{formatAppointmentDate(upcoming.scheduledStart)}</dd></div><div><dt><Clock3 aria-hidden="true" />Time</dt><dd>{formatAppointmentTime(upcoming.scheduledStart)}</dd></div><div><dt>Department</dt><dd>{safePortalName(upcoming.departmentName,"Department not available")}</dd></div><div><dt>Service</dt><dd>{safePortalName(upcoming.serviceName,"Service not specified")}</dd></div><div className="patient-upcoming-details__wide"><dt><MapPin aria-hidden="true" />Facility</dt><dd>{safePortalName(upcoming.facility.name,"Care location not available")}<small>{safeFacilityLocation({address_line:upcoming.facility.addressLine,city:upcoming.facility.city,district:upcoming.facility.district})}</small></dd></div></dl><Link className="btn btn--secondary patient-card-action" href={`/portal/appointments/${upcoming.id}`}>View Appointment<ArrowRight aria-hidden="true" /></Link></>:<div className="patient-empty-state"><CalendarDays aria-hidden="true" /><div><h3>No upcoming appointments</h3><p>When you request a new appointment, you can track its status here.</p></div><Link className="btn" href="/portal/appointments/new">Book Appointment</Link></div>}
    </section>

    <section aria-labelledby="appointment-summary-title" className="patient-section"><div className="patient-section-heading"><div><p className="eyebrow">At a glance</p><h2 id="appointment-summary-title">Appointment summary</h2></div><Link href="/portal/appointments">View all appointments<ArrowRight aria-hidden="true" /></Link></div><div className="patient-summary-grid"><article><span>Requested</span><strong>{counts.requested}</strong><p>Waiting for clinic review</p></article><article><span>Scheduled</span><strong>{counts.scheduled}</strong><p>Scheduled or confirmed visits</p></article><article><span>Completed</span><strong>{counts.completed}</strong><p>Visits marked as completed</p></article></div></section>

    <section aria-labelledby="quick-actions-title" className="patient-section"><div className="patient-section-heading"><div><p className="eyebrow">Shortcuts</p><h2 id="quick-actions-title">Quick actions</h2></div></div><div className="patient-quick-actions">{quickActions.map(action=>{const Icon=action.icon;return <Link href={action.href} key={action.href}><span className="patient-quick-action__icon"><Icon aria-hidden="true" /></span><span><strong>{action.title}</strong><small>{action.description}</small></span><ArrowRight aria-hidden="true" /></Link>;})}</div></section>
  </div>;
}
