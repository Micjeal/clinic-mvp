import {CalendarPlus} from "lucide-react";
import Link from "next/link";

import {AppointmentList} from "@/features/appointments/components/appointment-list";
import {filterPatientAppointments} from "@/features/appointments/utils/patient-appointments";
import {getPatientAppointments} from "@/server/services/appointment.service";
import type {PatientAppointmentView} from "@/types/patient-portal";
import {PatientPageHeader} from "@/features/patient/components/patient-content";

export const metadata={title:"My appointments"};

const views:[PatientAppointmentView,string][]=[["upcoming","Upcoming"],["past","Past"],["cancelled","Cancelled"],["all","All"]];
const emptyCopy:Record<PatientAppointmentView,{title:string;description:string}>={upcoming:{title:"No upcoming appointments",description:"When you request a new appointment, you can track its status here."},past:{title:"No appointment history",description:"Completed and previous appointment requests will appear here."},cancelled:{title:"No cancelled appointments",description:"Appointments you cancel will appear here for your reference."},all:{title:"No appointments yet",description:"Your submitted appointment requests will appear here."}};

export default async function PortalAppointmentsPage({searchParams}:{searchParams:Promise<{created?:string;view?:string}>}){
  const [params,appointments]=await Promise.all([searchParams,getPatientAppointments()]);
  const activeView=views.some(([value])=>value===params.view)?params.view as PatientAppointmentView:"upcoming";
  const filtered=filterPatientAppointments(appointments,activeView);
  return <div className="patient-portal-page">
    <PatientPageHeader eyebrow="Appointments" title="Your appointments" description="Review clinic updates, visit details and eligible cancellations." action={<Link className="btn" href="/portal/appointments/new"><CalendarPlus aria-hidden="true" />Book Appointment</Link>} />
    {params.created?<div className="patient-success-banner" role="status"><div><strong>Appointment requested</strong><span>Your clinic is reviewing this request. You can follow its status below.</span></div><Link href={`/portal/appointments/${encodeURIComponent(params.created)}`}>View request</Link></div>:null}
    <nav aria-label="Appointment views" className="patient-appointment-tabs">{views.map(([value,label])=><Link aria-current={activeView===value?"page":undefined} className={activeView===value?"is-active":""} href={value==="upcoming"?"/portal/appointments":`/portal/appointments?view=${value}`} key={value}>{label}<span>{filterPatientAppointments(appointments,value).length}</span></Link>)}</nav>
    <AppointmentList emptyDescription={emptyCopy[activeView].description} emptyTitle={emptyCopy[activeView].title} rows={filtered}/>
  </div>;
}
