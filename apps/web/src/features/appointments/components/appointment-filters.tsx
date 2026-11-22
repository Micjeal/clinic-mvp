import {appointmentStatusLabels} from "@clinic/shared";
import Link from "next/link";
import type {AppointmentFilters,StaffAppointment} from "@/features/appointments/types/staff-appointment.types";

function unique(items:Array<{id:string;name:string}>){return [...new Map(items.map(item=>[item.id,item])).values()].sort((a,b)=>a.name.localeCompare(b.name));}

function dateKey(date:Date,timezone:string){return new Intl.DateTimeFormat("en-CA",{timeZone:timezone,year:"numeric",month:"2-digit",day:"2-digit"}).format(date);}
function quickDates(timezone:string){const now=new Date();return {today:dateKey(now,timezone),tomorrow:dateKey(new Date(now.getTime()+86400000),timezone),weekEnd:dateKey(new Date(now.getTime()+6*86400000),timezone)};}

export function AppointmentFiltersForm({appointments,filters,timeZone="Africa/Kampala"}:{appointments:StaffAppointment[];filters:AppointmentFilters;timeZone?:string}){
  const facilities=unique(appointments.map(item=>item.facility)),departments=unique(appointments.map(item=>item.department)),services=unique(appointments.flatMap(item=>item.service?[item.service]:[])),doctors=[...new Map(appointments.filter(item=>item.clinicianUserId&&item.clinician).map(item=>[item.clinicianUserId!,{id:item.clinicianUserId!,name:item.clinician!.name}])).values()].sort((a,b)=>a.name.localeCompare(b.name));
  const {today,tomorrow,weekEnd}=quickDates(timeZone);
  return <form className="staff-filters" method="get">
    <label className="staff-filter-search">Search<span>Patient name or number</span><input defaultValue={filters.search} name="search" placeholder="Search patients" type="search"/></label>
    <label>Date<input defaultValue={filters.date} name="date" type="date"/></label>
    <label>Status<select defaultValue={filters.status??""} name="status"><option value="">All statuses</option>{Object.entries(appointmentStatusLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
    <label>Facility<select defaultValue={filters.facility??""} name="facility"><option value="">All facilities</option>{facilities.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <label>Department<select defaultValue={filters.department??""} name="department"><option value="">All departments</option>{departments.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <label>Service<select defaultValue={filters.service??""} name="service"><option value="">All services</option>{services.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <label>Doctor<select defaultValue={filters.doctor??""} name="doctor"><option value="">All doctors</option><option value="unassigned">Unassigned</option>{doctors.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <div className="staff-quick-filters" aria-label="Quick date filters"><span>Quick date</span><Link className={filters.date===today?"is-active":""} href="/staff/appointments?date={today}">Today</Link><Link className={filters.date===tomorrow?"is-active":""} href="/staff/appointments?date={tomorrow}">Tomorrow</Link><Link className={filters.date===weekEnd?"is-active":""} href="/staff/appointments?date=${today}&date_to=${weekEnd}">This week</Link></div><div className="staff-filter-actions"><button className="btn" type="submit">Apply filters</button><Link className="btn btn-secondary" href="/staff/appointments">Reset</Link></div>
  </form>;
}
