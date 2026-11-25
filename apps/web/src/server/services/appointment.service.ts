import "server-only";
import { Permissions } from "@clinic/permissions";
import type { AppointmentRequestInput } from "@clinic/validation";
import { canTransition, isFutureAppointmentDate, isPatientCancellationStatus, appointmentStatusLabel } from "@clinic/shared";
import { NotFoundError, ValidationError } from "@/server/errors";
import { requirePatient } from "@/server/auth/require-patient";
import { requireUser } from "@/server/auth/require-user";
import { requirePermission } from "@/server/permissions/require-permission";
import { findPublicFacility } from "@/server/repositories/facility.repository";
import { findPublicDepartmentForFacility } from "@/server/repositories/department.repository";
import { findPublicService } from "@/server/repositories/service.repository";
import { listAssignableClinicians, listClinicianAvailability, listClinicianBusyIntervals } from "@/server/repositories/scheduling.repository";
import { generateSlots, type OpeningHours } from "@/server/services/scheduling.service";
import { instantInTimeZone } from "@/lib/facility-time";
import { resolveGeneratedBookingSlot } from "@/server/services/booking.service";
import { resolvePatient } from "@/server/services/patient.service";
import { createValidatedAppointmentRequest, listAppointmentsForPatient, findAppointmentForPatient, findPatientAppointmentDetails, cancelPatientAppointment, listAppointmentsForOrganization, findAppointmentForOrganization, updateAppointmentStatus, updateAppointmentClinician } from "@/server/repositories/appointment.repository";
import { sendNotification, type NotificationInput } from "@/server/services/notification.service";
import { findOrganizationSettingsAdmin, DEFAULT_ORGANIZATION_SETTINGS } from "@/server/repositories/settings.repository";
import { checkInAppointment, syncQueueForAppointmentStatus } from "@/server/services/reception.service";
import { logServerError } from "@/server/logging";
import { formatAppointmentDateTime } from "@/features/appointments/utils/staff-appointments";

const DEFAULT_TIME_ZONE = "Africa/Kampala";

function sameInstant(a: string, b: string) {
  return new Date(a).getTime() === new Date(b).getTime();
}

async function notifyPatient(input: Omit<NotificationInput, "recipientEmail"> & { recipientEmail?: string | null }) {
  if (!input.recipientPatientId) return;
  try {
    await sendNotification({ ...input, recipientEmail: input.recipientEmail ?? null });
  } catch (error) {
    logServerError("notifications", "send-failed", error, { type: input.type });
  }
  try {
    await sendNotification({ ...input, recipientEmail: null, channel: "sms" });
  } catch (error) {
    logServerError("notifications", "sms-send-failed", error, { type: input.type });
  }
}

export async function requestAppointment(input: AppointmentRequestInput) {
  const user = await requireUser();
  if (input.clinician_user_id) throw new ValidationError("Choose a Doctor using the public booking options.");
  const serviceId = input.service_id;
  if (!serviceId) throw new ValidationError("Choose a service before selecting an appointment time.");
  if (!isFutureAppointmentDate(input.scheduled_start)) throw new ValidationError("Choose a future date and time.");
  const facility = await findPublicFacility(input.facility_id);
  const department = await findPublicDepartmentForFacility(input.department_id, input.facility_id);
  if (facility.organization_id !== department.organization_id) throw new ValidationError("The selected care location is no longer available.");
  let serviceName: string | null = null;
  if (serviceId) {
    const service = await findPublicService(serviceId);
    if (service.organization_id !== facility.organization_id || (service.facility_id && service.facility_id !== facility.id) || (service.department_id && service.department_id !== department.id)) throw new ValidationError("The selected service is not available at this location.");
    if (!service.duration_minutes) throw new ValidationError("This service is not configured for online booking yet.");
    serviceName = service.name;
  }
  const localStart = instantInTimeZone(input.scheduled_start, facility.timezone);
  if (!localStart) throw new ValidationError("Choose a valid appointment time.");
  const generatedSlot = await resolveGeneratedBookingSlot({
    facilityId: facility.id,
    departmentId: department.id,
    serviceId,
    clinicianSlug: input.clinician_slug || undefined,
    date: localStart.date,
  }, new Date(input.scheduled_start).toISOString());
  if (!generatedSlot) {
    throw new ValidationError("That appointment time is no longer available. Please choose another time.");
  }
  const patient = await resolvePatient(user.id, { organizationId: facility.organization_id, facilityId: facility.id, firstName: input.first_name, lastName: input.last_name, phone: input.phone, email: input.email });
  let appointment: { id: string };
  try {
    appointment = await createValidatedAppointmentRequest({
      patientId: patient.id,
      facilityId: facility.id,
      departmentId: department.id,
      serviceId,
      clinicianSlug: generatedSlot.clinicianSlug,
      scheduledStart: generatedSlot.startsAt,
      reason: input.reason || null,
    });
  } catch {
    throw new ValidationError("That appointment time is no longer available. Please choose another time.");
  }
  const recipientName = [input.first_name, input.last_name].filter(Boolean).join(" ") || undefined;
  const when = formatAppointmentDateTime(generatedSlot.startsAt, facility.timezone ?? DEFAULT_TIME_ZONE);
  await notifyPatient({
    type: "appointment_requested",
    recipientPatientId: patient.id,
    recipientEmail: input.email,
    recipientName,
    subject: "Appointment request received",
    message: `Hello ${recipientName || "there"}, we received your appointment request${serviceName ? ` for ${serviceName}` : ` for ${department.name}`} at ${facility.name} on ${when}. We will notify you once it has been reviewed.`,
    metadata: { appointment_id: appointment.id, scheduled_start: generatedSlot.startsAt },
  });
  return appointment;
}
export async function getPatientAppointments(){const {patient}=await requirePatient();return listAppointmentsForPatient(patient.id);}
export async function getPatientAppointment(id:string){const {patient}=await requirePatient();return findPatientAppointmentDetails(id,patient.id);}
export async function cancelPatientAppointmentById(id:string){const {patient}=await requirePatient();const current=await findAppointmentForPatient(id,patient.id);if(!current||!isPatientCancellationStatus(current.status))throw new ValidationError("This appointment is not eligible for cancellation.");const details=await findPatientAppointmentDetails(id,patient.id);if(details?.organizationId){const settings={...DEFAULT_ORGANIZATION_SETTINGS,...(await findOrganizationSettingsAdmin(details.organizationId)??{})};if(!settings.patient_cancellation_enabled)throw new ValidationError("Online appointment cancellation is currently disabled. Please contact the clinic.");if(settings.cancellation_cutoff_hours>0){const cutoffMs=settings.cancellation_cutoff_hours*3_600_000;if(new Date(details.scheduledStart).getTime()-Date.now()<cutoffMs)throw new ValidationError(`Appointments can only be cancelled at least ${settings.cancellation_cutoff_hours} hour${settings.cancellation_cutoff_hours===1?"":"s"} before the scheduled time.`);}}await cancelPatientAppointment(id,patient.id);if(details){const when=formatAppointmentDateTime(details.scheduledStart,DEFAULT_TIME_ZONE);const what=details.serviceName??details.departmentName??"your appointment";await notifyPatient({type:"appointment_cancelled",recipientPatientId:patient.id,recipientEmail:patient.email,recipientName:[patient.first_name,patient.last_name].filter(Boolean).join(" ")||undefined,subject:"Appointment cancelled",message:`Your appointment for ${what} on ${when} has been cancelled. You can book a new appointment anytime from your portal.`,metadata:{appointment_id:id}});}}
export async function getStaffAppointments(){const staff=await requirePermission(Permissions.APPOINTMENT_READ);return listAppointmentsForOrganization(staff.membership.organization_id);}
export async function getStaffAppointment(id:string){const staff=await requirePermission(Permissions.APPOINTMENT_READ);const appointment=await findAppointmentForOrganization(id,staff.membership.organization_id);if(!appointment)throw new NotFoundError("Appointment not found");return appointment;}
export async function updateStaffAppointmentStatus(id:string,status:string){const staff=await requirePermission(Permissions.APPOINTMENT_UPDATE);const current=await findAppointmentForOrganization(id,staff.membership.organization_id);if(!current)throw new NotFoundError("Appointment not found");if(!canTransition(current.status,status))throw new ValidationError("This appointment status can no longer be changed that way.");if(status==="checked_in"){await checkInAppointment(id);}else{await updateAppointmentStatus(id,staff.membership.organization_id,status);if(status==="in_progress"||status==="completed"){try{await syncQueueForAppointmentStatus(id,staff.membership.organization_id,staff.user.id,status==="in_progress"?"with_clinician":"completed");}catch(syncError){logServerError("appointments","queue-sync-failed",syncError,{appointmentId:id});}}}const label=appointmentStatusLabel(status);const when=formatAppointmentDateTime(current.scheduledStart,current.facility.timezone??DEFAULT_TIME_ZONE);const what=current.service?.name??current.department.name;await notifyPatient({type:"appointment_status_changed",recipientPatientId:current.patient.id,recipientEmail:current.patient.email,recipientName:current.patient.name,subject:`Appointment ${label}`,message:`Your appointment for ${what} on ${when} is now ${label.toLowerCase()}.`,metadata:{appointment_id:id,status}});}

export async function assignStaffAppointmentClinician(id: string, clinicianUserId: string | null) {
  const staff = await requirePermission(Permissions.APPOINTMENT_UPDATE);
  const current = await findAppointmentForOrganization(id, staff.membership.organization_id);
  if (!current) throw new NotFoundError("Appointment not found");
  let assignedClinicianName: string | null = null;
  if (clinicianUserId) {
    const clinicians = await listAssignableClinicians({ organizationId: staff.membership.organization_id, facilityId: current.facility.id, departmentId: current.department.id, serviceId: current.service?.id });
    const clinician = clinicians.find((item) => item.userId === clinicianUserId);
    if (!clinician) throw new ValidationError("That clinician is not eligible for this appointment.");
    assignedClinicianName = [clinician.professionalTitle, clinician.displayName].filter(Boolean).join(" ") || clinician.displayName;
    const timeZone = current.facility.timezone ?? "Africa/Kampala";
    const date = instantInTimeZone(current.scheduledStart, timeZone)?.date;
    if (!date) throw new ValidationError("This appointment time is invalid.");
    const [availability, busy] = await Promise.all([listClinicianAvailability(clinician.membershipId, current.facility.id, date, timeZone), listClinicianBusyIntervals(clinician.userId, date, timeZone)]);
    const slots = generateSlots({ date, timeZone, durationMinutes: Math.max(1, Math.round((new Date(current.scheduledEnd ?? current.scheduledStart).getTime() - new Date(current.scheduledStart).getTime()) / 60000)), intervals: availability.rules, exceptions: availability.exceptions, busy: busy.filter((item) => item.startsAt !== current.scheduledStart), openingHours: current.department.openingHours as unknown as OpeningHours });
    if (!slots.some((slot) => sameInstant(slot.startsAt, current.scheduledStart))) throw new ValidationError("This clinician is not available for this appointment time.");
  }
  await updateAppointmentClinician(id, staff.membership.organization_id, clinicianUserId);
  if (assignedClinicianName) {
    const when = formatAppointmentDateTime(current.scheduledStart, current.facility.timezone ?? DEFAULT_TIME_ZONE);
    const what = current.service?.name ?? current.department.name;
    await notifyPatient({ type: "appointment_clinician_assigned", recipientPatientId: current.patient.id, recipientEmail: current.patient.email, recipientName: current.patient.name, subject: "Doctor assigned to your appointment", message: `${assignedClinicianName} has been assigned to your appointment for ${what} on ${when}.`, metadata: { appointment_id: id } });
  }
}

export async function getAssignableCliniciansForAppointment(id: string) {
  const staff = await requirePermission(Permissions.APPOINTMENT_UPDATE);
  const current = await findAppointmentForOrganization(id, staff.membership.organization_id);
  if (!current) throw new NotFoundError("Appointment not found");
  const clinicians = await listAssignableClinicians({ organizationId: staff.membership.organization_id, facilityId: current.facility.id, departmentId: current.department.id, serviceId: current.service?.id });
  const durationMinutes = Math.max(1, Math.round((new Date(current.scheduledEnd ?? current.scheduledStart).getTime() - new Date(current.scheduledStart).getTime()) / 60000));
  return Promise.all(clinicians.map(async (clinician) => { const timeZone = current.facility.timezone ?? "Africa/Kampala"; const date = instantInTimeZone(current.scheduledStart, timeZone)?.date; if (!date) throw new ValidationError("This appointment time is invalid."); const [availability, busy] = await Promise.all([listClinicianAvailability(clinician.membershipId, current.facility.id, date, timeZone), listClinicianBusyIntervals(clinician.userId, date, timeZone)]); const slots = generateSlots({ date, timeZone, durationMinutes, intervals: availability.rules, exceptions: availability.exceptions, busy: busy.filter((item) => item.startsAt !== current.scheduledStart), openingHours: current.department.openingHours as unknown as OpeningHours }); return { ...clinician, available: slots.some((slot) => sameInstant(slot.startsAt, current.scheduledStart)) }; }));
}
