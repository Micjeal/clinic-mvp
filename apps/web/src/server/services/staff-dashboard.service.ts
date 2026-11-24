import "server-only";
import {buildStaffDashboard} from "@/features/staff/utils/staff-dashboard";
import {getStaffAppointments} from "@/server/services/appointment.service";
import {AuthorizationError} from "@/server/errors";

export async function getStaffDashboard(timeZone:string){
  try{return buildStaffDashboard(await getStaffAppointments(),{timeZone});}
  catch(error){if(error instanceof AuthorizationError)return buildStaffDashboard([],{timeZone});throw error;}
}
