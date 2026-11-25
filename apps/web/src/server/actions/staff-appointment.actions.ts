"use server";
import {revalidatePath} from "next/cache";
import {safeServerMessage} from "@/server/errors";
import {assignStaffAppointmentClinician,updateStaffAppointmentStatus} from "@/server/services/appointment.service";
export async function updateAppointmentStatusAction(id:string,status:string,_previous:unknown){try{const result=await updateStaffAppointmentStatus(id,status);revalidatePath("/staff");revalidatePath("/staff/appointments");revalidatePath(`/staff/appointments/${id}`);return {success:"Appointment updated.",queueId:result??undefined};}catch(error){return {error:safeServerMessage(error,"Unable to update this appointment. Please try again.")};}}
export async function assignAppointmentClinicianAction(id:string,clinicianUserId:string|null){try{await assignStaffAppointmentClinician(id,clinicianUserId);revalidatePath("/staff");revalidatePath("/staff/appointments");revalidatePath(`/staff/appointments/${id}`);return {success:"Doctor assigned."};}catch(error){return {error:safeServerMessage(error,"This clinician is not available for the appointment.")};}}
