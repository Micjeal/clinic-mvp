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

const activeQueueStatuses=new Set(["waiting_triage","in_triage","waiting_clinician","with_clinician"]);
const waitingQueueStatuses=new Set(["waiting_triage","waiting_clinician"]);

export type OpsQueueEntry={status:string;checked_in_at:string};

export function buildOpsMetrics(appointments:StaffAppointment[],queue:OpsQueueEntry[],input:{now?:Date;timeZone:string}){
  const now=input.now??new Date(),today=localDateKey(now.toISOString(),input.timeZone);
  const isToday=(value:string)=>localDateKey(value,input.timeZone)===today;
  const activeWaits=queue.filter(entry=>activeQueueStatuses.has(entry.status)).map(entry=>Math.max(0,(now.getTime()-new Date(entry.checked_in_at).getTime())/60000));
  return {
    totalAppointments:appointments.length,
    todayAppointments:appointments.filter(item=>isToday(item.scheduledStart)).length,
    patientsWaiting:queue.filter(entry=>waitingQueueStatuses.has(entry.status)).length,
    completedToday:appointments.filter(item=>item.status==="completed"&&isToday(item.updatedAt)).length,
    avgWaitMinutes:activeWaits.length?Math.round(activeWaits.reduce((sum,value)=>sum+value,0)/activeWaits.length):null,
  };
}
