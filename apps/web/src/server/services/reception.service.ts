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
  try { const { chargeFromCatalog } = await import("@/server/services/charge-hooks"); await chargeFromCatalog({ organizationId, encounterId: encounter.id, patientId, facilityId: input.facilityId, category: "registration", quantity: 1, actorId: staff.user.id, sourceType: "registration", sourceId: encounter.id, description: "Registration / visit fee" }); } catch (e) { logServerError("billing", "registration-charge-failed", e, { encounterId: encounter.id }); }
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
  if (nextStatus === "with_clinician" && current.encounters?.id) { try { const admin = createAdminClient(); const { error } = await admin.from("encounters").update({ clinician_user_id: staff.user.id }).eq("id", current.encounters.id).eq("organization_id", staff.membership.organization_id).is("clinician_user_id", null); if (error) throw error; } catch (syncError) { logServerError("reception", "encounter-assign-failed", syncError, { queueId: id }); } }
  if ((nextStatus === "completed" || nextStatus === "cancelled") && current.encounters?.id) { try { const admin = createAdminClient(); const { error } = await admin.from("encounters").update({ status: nextStatus, ended_at: now }).eq("id", current.encounters.id).eq("organization_id", staff.membership.organization_id); if (error) throw error; const { data: enc } = await admin.from("encounters").select("appointment_id").eq("id", current.encounters.id).maybeSingle(); if (enc?.appointment_id) { await admin.from("appointments").update({ status: nextStatus === "completed" ? "completed" : "cancelled" }).eq("id", enc.appointment_id).eq("organization_id", staff.membership.organization_id); } } catch (syncError) { logServerError("reception", "encounter-sync-failed", syncError, { queueId: id }); } }
  if (nextStatus === "waiting_clinician" && current.encounters?.id) { try { await chargeStandard(staff.membership.organization_id, current.encounters.id, staff.user.id, "triage", "Triage assessment"); } catch (chargeError) { logServerError("billing", "triage-charge-failed", chargeError, { encounterId: current.encounters.id }); } }
  if (nextStatus === "completed" && current.encounters?.id) { try { await chargeConsultation(staff.membership.organization_id, current.encounters.id, staff.user.id); } catch (chargeError) { logServerError("billing", "consultation-charge-failed", chargeError, { encounterId: current.encounters.id }); } }
  return updated;
}
export async function recordTriage(input: { queueId: string; priority: QueuePriority; temperatureC?: number; pulseBpm?: number; respiratoryRate?: number; systolicBp?: number; diastolicBp?: number; oxygenSaturation?: number; weightKg?: number; heightCm?: number; notes?: string }) { const staff = await requirePermission(Permissions.TRIAGE_WRITE); const queue = await getQueueEntry(input.queueId, staff.membership.organization_id); if (!queue) throw new NotFoundError("Queue entry not found."); if (queue.status !== "in_triage") throw new ValidationError("Start triage before recording vitals."); const numeric = [input.temperatureC, input.pulseBpm, input.respiratoryRate, input.systolicBp, input.diastolicBp, input.oxygenSaturation, input.weightKg, input.heightCm].filter((value) => value !== undefined); if (numeric.some((value) => !Number.isFinite(value) || (value as number) < 0) || (input.oxygenSaturation !== undefined && input.oxygenSaturation > 100)) throw new ValidationError("Check the vital sign values and try again."); const encounter = queue.encounters; if (!encounter?.patient_id) throw new NotFoundError("Encounter not found."); await createVitals({ organization_id: staff.membership.organization_id, encounter_id: encounter.id, patient_id: encounter.patient_id, recorded_by: staff.user.id, temperature_c: input.temperatureC ?? null, pulse_bpm: input.pulseBpm ?? null, respiratory_rate: input.respiratoryRate ?? null, systolic_bp: input.systolicBp ?? null, diastolic_bp: input.diastolicBp ?? null, oxygen_saturation: input.oxygenSaturation ?? null, weight_kg: input.weightKg ?? null, height_cm: input.heightCm ?? null, notes: input.notes?.trim() || null }); return transitionQueue(input.queueId, "waiting_clinician", input.priority); }

async function chargeConsultation(organizationId: string, encounterId: string, actorId: string) {
  const admin = createAdminClient() as unknown as import("@supabase/supabase-js").SupabaseClient;
  const { data: encounter } = await admin.from("encounters").select("id,patient_id,facility_id,department_id,service_id").eq("id", encounterId).eq("organization_id", organizationId).maybeSingle();
  if (!encounter?.service_id || !encounter.patient_id) return;
  const { data: service } = await admin.from("services").select("name,base_price,currency_code").eq("id", encounter.service_id).eq("organization_id", organizationId).maybeSingle();
  const price = Number(service?.base_price ?? 0);
  if (!service || price <= 0) return;
  const { error } = await admin.from("encounter_charges").insert({
    organization_id: organizationId,
    encounter_id: encounterId,
    patient_id: encounter.patient_id,
    facility_id: encounter.facility_id ?? null,
    charge_type: "consultation",
    description: `Consultation: ${service.name}`,
    quantity: 1,
    unit_price: price,
    total: price,
    currency_code: service.currency_code ?? "UGX",
    source_type: "encounter",
    source_id: encounterId,
    created_by: actorId,
  });
  if (error && error.code !== "23505") throw error;
}

async function chargeStandard(organizationId: string, encounterId: string, actorId: string, category: string, label: string) {
  const admin = createAdminClient() as unknown as import("@supabase/supabase-js").SupabaseClient;
  const { data: encounter } = await admin.from("encounters").select("id,patient_id,facility_id").eq("id", encounterId).eq("organization_id", organizationId).maybeSingle();
  if (!encounter?.patient_id) return;
  const { data: charge } = await admin.from("standard_charges").select("name,price,currency_code").eq("organization_id", organizationId).eq("category", category).eq("is_active", true).order("created_at", { ascending: true }).limit(1).maybeSingle();
  const price = Number(charge?.price ?? 0);
  if (!charge || price <= 0) return;
  const { error } = await admin.from("encounter_charges").insert({
    organization_id: organizationId, encounter_id: encounterId, patient_id: encounter.patient_id,
    facility_id: encounter.facility_id ?? null, charge_type: category === "triage" ? "procedure" : "procedure",
    description: `${label}: ${charge.name}`, quantity: 1, unit_price: price, total: price,
    currency_code: charge.currency_code ?? "UGX", source_type: "standard_charge", source_id: encounterId, created_by: actorId,
  });
  if (error && error.code !== "23505") throw error;
}

export async function syncQueueForAppointmentStatus(appointmentId: string, organizationId: string, userId: string, target: "with_clinician" | "completed"): Promise<string | null> {
  const admin = createAdminClient() as unknown as import("@supabase/supabase-js").SupabaseClient;
  const { data: encounter } = await admin.from("encounters").select("id,patient_id,appointment_id,clinician_user_id").eq("appointment_id", appointmentId).eq("organization_id", organizationId).maybeSingle();
  if (!encounter?.id) return null;
  const { data: queue } = await admin.from("queue_entries").select("id,status").eq("encounter_id", encounter.id).eq("organization_id", organizationId).maybeSingle();
  if (!queue?.id) return null;
  const now = new Date().toISOString();
  if (target === "with_clinician") {
    if (queue.status !== "waiting_clinician") return null;
    await admin.from("queue_entries").update({ status: "with_clinician", consult_started_by: userId, consult_started_at: now }).eq("id", queue.id);
    if (!encounter.clinician_user_id) await admin.from("encounters").update({ clinician_user_id: userId }).eq("id", encounter.id);
    return queue.id;
  }
  if (queue.status !== "with_clinician" && queue.status !== "waiting_clinician") return null;
  await admin.from("queue_entries").update({ status: "completed", consult_completed_by: userId, consult_completed_at: now }).eq("id", queue.id);
  await admin.from("encounters").update({ status: "completed", ended_at: now }).eq("id", encounter.id);
  try { await chargeConsultation(organizationId, encounter.id, userId); } catch (chargeError) { logServerError("billing", "consultation-charge-failed", chargeError, { encounterId: encounter.id }); }
  return queue.id;
}
