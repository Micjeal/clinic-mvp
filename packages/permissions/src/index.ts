export const Permissions = {
  PATIENT_READ: "patient.read",
  PATIENT_CREATE: "patient.create",
  PATIENT_UPDATE: "patient.update",
  APPOINTMENT_READ: "appointment.read",
  APPOINTMENT_CREATE: "appointment.create",
  APPOINTMENT_UPDATE: "appointment.update",
  STAFF_MANAGE: "staff.manage",
  SCHEDULE_MANAGE: "schedule.manage",
  RECEPTION_CHECKIN: "reception.checkin",
  QUEUE_READ: "queue.read",
  QUEUE_MANAGE: "queue.manage",
  TRIAGE_WRITE: "triage.write",
} as const;

export type Permission = (typeof Permissions)[keyof typeof Permissions];
