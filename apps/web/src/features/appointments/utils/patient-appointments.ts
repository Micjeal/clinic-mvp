import type {PatientAppointment,PatientAppointmentView} from "@/types/patient-portal";

const liveVisitStatuses=new Set(["checked_in","in_progress"]);
const pastStatuses=new Set(["completed","no_show"]);

export function patientAppointmentView(appointment:PatientAppointment,now=Date.now()):Exclude<PatientAppointmentView,"all">{
  if(appointment.status==="cancelled")return "cancelled";
  if(pastStatuses.has(appointment.status))return "past";
  if(liveVisitStatuses.has(appointment.status))return "upcoming";
  return new Date(appointment.scheduledStart).getTime()>=now?"upcoming":"past";
}

export function filterPatientAppointments(rows:PatientAppointment[],view:PatientAppointmentView,now=Date.now()){
  return view==="all"?rows:rows.filter(row=>patientAppointmentView(row,now)===view);
}

export function findUpcomingAppointment(rows:PatientAppointment[],now=Date.now()){
  return rows
    .filter(row=>patientAppointmentView(row,now)==="upcoming")
    .toSorted((a,b)=>new Date(a.scheduledStart).getTime()-new Date(b.scheduledStart).getTime())[0]??null;
}

export function formatAppointmentDate(value:string){return new Intl.DateTimeFormat("en-UG",{dateStyle:"medium",timeZone:"Africa/Kampala"}).format(new Date(value));}
export function formatAppointmentTime(value:string){return new Intl.DateTimeFormat("en-UG",{timeStyle:"short",timeZone:"Africa/Kampala"}).format(new Date(value));}
export function formatAppointmentDateTime(value:string){return new Intl.DateTimeFormat("en-UG",{dateStyle:"medium",timeStyle:"short",timeZone:"Africa/Kampala"}).format(new Date(value));}
