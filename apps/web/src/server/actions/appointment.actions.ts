"use server";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {appointmentRequestSchema} from "@clinic/validation";
import {safeServerMessage} from "@/server/errors";
import {requestAppointment,cancelPatientAppointmentById} from "@/server/services/appointment.service";
import { getAvailableBookingSlots } from "@/server/services/booking.service";
import { portalBookingPathWithContext } from "@/features/appointments/utils/portal-booking";
export async function createAppointmentAction(_previous:unknown,formData:FormData){if(formData.get("booking_context")==="public"){const next=portalBookingPathWithContext({facility:String(formData.get("facility_id")||"")||undefined,department:String(formData.get("department_id")||"")||undefined,service:String(formData.get("service_id")||"")||undefined,doctor:String(formData.get("clinician_slug")||"")||undefined,date:String(formData.get("booking_date")||"")||undefined,scheduledStart:String(formData.get("scheduled_start")||"")||undefined});redirect(`/login?next=${encodeURIComponent(next)}`);}const parsed=appointmentRequestSchema.safeParse(Object.fromEntries(formData.entries()));if(!parsed.success)return {error:"Please complete all required booking fields."};let appointment;try{appointment=await requestAppointment(parsed.data);}catch(error){return {error:safeServerMessage(error,"We could not submit the request. Please try again.")};}redirect(`/portal/appointments/${appointment.id}`);}
export async function cancelAppointmentAction(id:string,_previous:unknown){try{await cancelPatientAppointmentById(id);revalidatePath("/portal");revalidatePath("/portal/appointments");revalidatePath(`/portal/appointments/${id}`);return {success:"Appointment cancelled."};}catch(error){return {error:safeServerMessage(error,"This appointment could not be cancelled.")};}}

export async function getAvailableAppointmentSlots(input: { facilityId: string; departmentId: string; serviceId?: string; clinicianSlug?: string; date: string }) {
  try {
    return { slots: await getAvailableBookingSlots(input) };
  } catch (error) { return { error: safeServerMessage(error, "We couldn't load available appointment times."), slots: [] }; }
}
