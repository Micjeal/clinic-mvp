import type {StaffAppointment} from "../../appointments/types/staff-appointment.types";
import {localDateKey} from "../../appointments/utils/staff-appointments";

export const attentionStatuses=["requested","scheduled","confirmed"] as const;

export function buildStaffDashboard(appointments:StaffAppointment[],input:{now?:Date;timeZone:string}){
  const now=input.now??new Date(),today=localDateKey(now.toISOString(),input.timeZone);
  const isToday=(value:string)=>localDateKey(value,input.timeZone)===today;
  const statusCount=(status:string)=>appointments.filter(item=>item.status===status).length;
  const priority=new Map(attentionStatuses.map((status,index)=>[status,index]));
  return {
    metrics:[
      {label:"Today's appointments",value:appointments.filter(item=>isToday(item.scheduledStart)).length},
      {label:"New requests",value:statusCount("requested")},
      {label:"Scheduled",value:statusCount("scheduled")},
      {label:"Confirmed",value:statusCount("confirmed")},
      {label:"Checked in",value:statusCount("checked_in")},
      {label:"In progress",value:statusCount("in_progress")},
      {label:"Completed today",value:appointments.filter(item=>item.status==="completed"&&isToday(item.updatedAt)).length},
      {label:"Cancelled",value:statusCount("cancelled")},
      {label:"No-show",value:statusCount("no_show")},
    ],
    attention:appointments.filter(item=>attentionStatuses.includes(item.status as typeof attentionStatuses[number])).sort((a,b)=>(priority.get(a.status as typeof attentionStatuses[number])??9)-(priority.get(b.status as typeof attentionStatuses[number])??9)||new Date(a.scheduledStart).getTime()-new Date(b.scheduledStart).getTime()).slice(0,6),
    today:appointments.filter(item=>isToday(item.scheduledStart)).sort((a,b)=>new Date(a.scheduledStart).getTime()-new Date(b.scheduledStart).getTime()),
    recent:[...appointments].sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime()).slice(0,6),
  };
}
