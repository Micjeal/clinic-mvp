import type {AppointmentFilters,StaffAppointment} from "../types/staff-appointment.types";

export function localDateKey(value:string,timeZone:string){
  return new Intl.DateTimeFormat("en-CA",{timeZone,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(value));
}

export function formatAppointmentDate(value:string,timeZone:string){return new Intl.DateTimeFormat("en-UG",{timeZone,dateStyle:"medium"}).format(new Date(value));}
export function formatAppointmentTime(value:string,timeZone:string){return new Intl.DateTimeFormat("en-UG",{timeZone,hour:"numeric",minute:"2-digit"}).format(new Date(value));}
export function formatAppointmentDateTime(value:string,timeZone:string){return new Intl.DateTimeFormat("en-UG",{timeZone,dateStyle:"medium",timeStyle:"short"}).format(new Date(value));}

export function filterStaffAppointments(items:StaffAppointment[],filters:AppointmentFilters,timeZone:string){
  const search=filters.search?.trim().toLocaleLowerCase()??"";
  return items.filter(item=>{
    if(search&&!`${item.patient.name} ${item.patient.number}`.toLocaleLowerCase().includes(search))return false;
    if(filters.date&&localDateKey(item.scheduledStart,timeZone)!==filters.date)return false;
    if(filters.dateTo&&localDateKey(item.scheduledStart,timeZone)>filters.dateTo)return false;
    if(filters.status&&item.status!==filters.status)return false;
    if(filters.facility&&item.facility.id!==filters.facility)return false;
    if(filters.department&&item.department.id!==filters.department)return false;
    if(filters.service&&(item.service?.id??"")!==filters.service)return false;
    if(filters.doctor&&(filters.doctor === "unassigned" ? item.clinicianUserId !== null : item.clinicianUserId !== filters.doctor))return false;
    return true;
  });
}
