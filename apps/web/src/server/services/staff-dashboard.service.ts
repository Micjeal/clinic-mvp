import "server-only";
import {buildStaffDashboard} from "@/features/staff/utils/staff-dashboard";
import {getStaffAppointments} from "@/server/services/appointment.service";

export async function getStaffDashboard(timeZone:string){return buildStaffDashboard(await getStaffAppointments(),{timeZone});}
