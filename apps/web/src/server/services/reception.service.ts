import "server-only";
import { Permissions } from "@clinic/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { logServerError } from "@/server/logging";
import { canTransitionQueue, isQueuePriority, type QueuePriority, type QueueStatus } from "@clinic/shared";
import { ValidationError, NotFoundError, AuthorizationError } from "@/server/errors";
import { requirePermission } from "@/server/permissions/require-permission";
import { createPatient } from "@/server/repositories/patient.repository";
import { createEncounter, createQueueEntry, findAppointmentForCheckIn, getQueueEntry, listQueueEntries, updateQueueEntry, createVitals, validateWalkInScope, findPatientByNumber } from "@/server/repositories/reception.repository";
import { hasRolePermission } from "@/server/repositories/staff.repository";
import type { Tables } from "@clinic/database";

export async function checkInAppointment(appointmentId: string) {
  const staff = await requirePermission(Permissions.RECEPTION_CHECKIN); const organizationId = staff.membership.organization_id;
  const appointment = await findAppointmentForCheckIn(appointmentId, organizationId); if (!appointment) throw new NotFoundError("Appointment not found.");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("check_in_appointment", { p_appointment_id: appointmentId });
  if (error) {
    const message = error.message ?? "";
    if (/not found/i.test(message)) throw new NotFoundError("Appointment not found.");
    if (/permission/i.test(message)) throw new AuthorizationError();
    if (/confirmed/i.test(message)) throw new ValidationError("This appointment must be confirmed before check-in.");
    throw new ValidationError("This appointment could not be checked in. Please try again.");
  }
  const result = data as { encounterId: string; queueId: string | null; existing: boolean } | null;
  if (!result?.encounterId) throw new ValidationError("This appointment could not be checked in. Please try again.");
  return { encounterId: result.encounterId, queueId: result.queueId };
}

export async function createWalkIn(input: { patientNumber?: string; firstName?: string; lastName?: string; phone?: string; dateOfBirth?: string; sex?: string; facilityId: string; departmentId: string; serviceId?: string; chiefComplaint?: string }) {
  const staff = await requirePermission(Permissions.RECEPTION_CHECKIN); const organizationId = staff.membership.organization_id;
  if (!await validateWalkInScope({ organizationId, facilityId: input.facilityId, departmentId: input.departmentId, serviceId: input.serviceId })) throw new ValidationError("Choose a valid facility, department and service.");
  let patientId = input.patientNumber ? (await findPatientByNumber(organizationId, input.patientNumber))?.id : undefined;
  if (input.patientNumber && !patientId) throw new NotFoundError("No patient was found with that patient number.");
  if (!patientId) { if (!input.firstName?.trim() || !input.lastName?.trim()) throw new ValidationError("Enter the patient's name or select an existing patient."); const patient = await createPatient({ organization_id: organizationId, primary_facility_id: input.facilityId, first_name: input.firstName.trim(), last_name: input.lastName.trim(), phone: input.phone?.trim() || null, date_of_birth: input.dateOfBirth || null, sex: input.sex || null, created_by: staff.user.id }); patientId = patient.id; }
  const encounter = await createEncounter({ organization_id: organizationId, facility_id: input.facilityId, department_id: input.departmentId, service_id: input.serviceId || null, patient_id: patientId, appointment_id: null, clinician_user_id: null, encounter_type: "walk_in", status: "open", chief_complaint: input.chiefComplaint?.trim() || null, started_at: new Date().toISOString(), created_by: staff.user.id });
  const queue = await createQueueEntry({ organization_id: organizationId, facility_id: input.facilityId, department_id: input.departmentId, encounter_id: encounter.id, status: "waiting_triage", priority: "routine", created_by: staff.user.id });
  return { encounterId: encounter.id, queueId: queue.id, patientId };
}

export async function getQueue() { const staff = await requirePermission(Permissions.QUEUE_READ); const priorityOrder: Record<string, number> = { emergency: 0, urgent: 1, priority: 2, routine: 3 }; const entries = await listQueueEntries(staff.membership.organization_id, staff.membership.primary_facility_id ?? undefined); return entries.sort((a, b) => (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9) || new Date(a.checked_in_at).getTime() - new Date(b.checked_in_at).getTime()); }
export async function getTriageQueueEntry(id: string) { const staff = await requirePermission(Permissions.TRIAGE_WRITE); return getQueueEntry(id, staff.membership.organization_id); }
export async function getTriageQueue() { const staff = await requirePermission(Permissions.TRIAGE_WRITE); const entries = await listQueueEntries(staff.membership.organization_id, staff.membership.primary_facility_id ?? undefined); return entries.filter((entry) => entry.status === "waiting_triage" || entry.status === "in_triage"); }
const CLINICAL_QUEUE_TARGETS = new Set<QueueStatus>(["with_clinician", "completed"]);

export async function transitionQueue(id: string, nextStatus: QueueStatus, priority?: QueuePriority, options?: { overrideReason?: string }) {
  const staff = await requirePermission(nextStatus === "in_triage" || nextStatus === "waiting_clinician" ? Permissions.TRIAGE_WRITE : Permissions.QUEUE_MANAGE);
  const current = await getQueueEntry(id, staff.membership.organization_id);
  if (!current) throw new NotFoundError("Queue entry not found.");
  if (!canTransitionQueue(current.status as QueueStatus, nextStatus)) throw new ValidationError("That queue transition is not available.");
  if (priority && !isQueuePriority(priority)) throw new ValidationError("Choose a valid queue priority.");

  let isClinicalOverride = false;
  if (CLINICAL_QUEUE_TARGETS.has(nextStatus)) {
    const clinicianUserId = current.encounters?.clinician_user_id ?? null;
    const isAssignedClinician = clinicianUserId != null && clinicianUserId === staff.user.id;
    if (isAssignedClinician) {
      const canClinicallyComplete = await hasRolePermission(staff.membership.role_id, Permissions.QUEUE_CLINICAL);
      if (!canClinicallyComplete) throw new AuthorizationError("Only a clinician with consultation permissions can perform this step.");
    } else {
      const canOverride = await hasRolePermission(staff.membership.role_id, Permissions.QUEUE_OVERRIDE);
      if (!canOverride) throw new AuthorizationError("Only the assigned clinician can perform this step, or an authorized supervisor.");
      isClinicalOverride = true;
    }
    if (isClinicalOverride && !options?.overrideReason?.trim()) {
      throw new ValidationError("A reason is required when completing a visit on behalf of the assigned clinician.");
    }
  }

  const now = new Date().toISOString();
  const patch: Partial<Tables<"queue_entries">> = { status: nextStatus, ...(priority ? { priority } : {}) };
  if (nextStatus === "in_triage") patch.triage_started_at = now;
  if (nextStatus === "waiting_clinician") { patch.triage_completed_at = now; patch.ready_for_clinician_at = now; }
  if (nextStatus === "with_clinician") { patch.consult_started_by = staff.user.id; patch.consult_started_at = now; }
  if (nextStatus === "completed") { patch.consult_completed_by = staff.user.id; patch.consult_completed_at = now; if (isClinicalOverride) patch.completion_override_reason = options?.overrideReason?.trim() ?? null; }
  const updated = await updateQueueEntry(id, staff.membership.organization_id, patch);
  if ((nextStatus === "completed" || nextStatus === "cancelled") && current.encounters?.id) { try { const admin = createAdminClient(); const { error } = await admin.from("encounters").update({ status: nextStatus, ended_at: now }).eq("id", current.encounters.id).eq("organization_id", staff.membership.organization_id); if (error) throw error; } catch (syncError) { logServerError("reception", "encounter-sync-failed", syncError, { queueId: id }); } }
  return updated;
}
export async function recordTriage(input: { queueId: string; priority: QueuePriority; temperatureC?: number; pulseBpm?: number; respiratoryRate?: number; systolicBp?: number; diastolicBp?: number; oxygenSaturation?: number; weightKg?: number; heightCm?: number; notes?: string }) { const staff = await requirePermission(Permissions.TRIAGE_WRITE); const queue = await getQueueEntry(input.queueId, staff.membership.organization_id); if (!queue) throw new NotFoundError("Queue entry not found."); if (queue.status !== "in_triage") throw new ValidationError("Start triage before recording vitals."); const numeric = [input.temperatureC, input.pulseBpm, input.respiratoryRate, input.systolicBp, input.diastolicBp, input.oxygenSaturation, input.weightKg, input.heightCm].filter((value) => value !== undefined); if (numeric.some((value) => !Number.isFinite(value) || (value as number) < 0) || (input.oxygenSaturation !== undefined && input.oxygenSaturation > 100)) throw new ValidationError("Check the vital sign values and try again."); const encounter = queue.encounters; if (!encounter?.patient_id) throw new NotFoundError("Encounter not found."); await createVitals({ organization_id: staff.membership.organization_id, encounter_id: encounter.id, patient_id: encounter.patient_id, recorded_by: staff.user.id, temperature_c: input.temperatureC ?? null, pulse_bpm: input.pulseBpm ?? null, respiratory_rate: input.respiratoryRate ?? null, systolic_bp: input.systolicBp ?? null, diastolic_bp: input.diastolicBp ?? null, oxygen_saturation: input.oxygenSaturation ?? null, weight_kg: input.weightKg ?? null, height_cm: input.heightCm ?? null, notes: input.notes?.trim() || null }); return transitionQueue(input.queueId, "waiting_clinician", input.priority); }
