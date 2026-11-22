import {AppointmentFiltersForm} from "@/features/appointments/components/appointment-filters";
import {StaffAppointmentList} from "@/features/appointments/components/staff-appointment-list";
import type {AppointmentFilters} from "@/features/appointments/types/staff-appointment.types";
import {filterStaffAppointments} from "@/features/appointments/utils/staff-appointments";
import {getStaffAppointments} from "@/server/services/appointment.service";
import {getStaffPortalContext} from "@/server/services/staff-portal.service";
import {StaffPageHeader} from "@/features/staff/components/staff-content";

export const metadata={title:"Appointments"};

export default async function StaffAppointmentsPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const params=await searchParams;
  const value=(key:string)=>typeof params[key]==="string"?params[key] as string:undefined;
  const filters:AppointmentFilters={search:value("search"),date:value("date"),dateTo:value("date_to"),status:value("status"),facility:value("facility"),department:value("department"),service:value("service"),doctor:value("doctor")};
  const [appointments,context]=await Promise.all([getStaffAppointments(),getStaffPortalContext()]);
  const filtered=filterStaffAppointments(appointments,filters,context.timezone);
  return <div className="staff-page"><StaffPageHeader eyebrow="Appointment operations" title="Appointments" description="Review and manage patient appointment requests." context={<div className="staff-count"><strong>{filtered.length}</strong><span>{filtered.length===1?"appointment":"appointments"}</span></div>} /><AppointmentFiltersForm appointments={appointments} filters={filters} timeZone={context.timezone}/><section aria-label="Appointment results" className="staff-results"><StaffAppointmentList appointments={filtered} timeZone={context.timezone}/></section></div>;
}
