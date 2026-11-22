export const patientCancellationStatuses = ["requested", "scheduled", "confirmed"] as const;

export const allowedStatusTransitions: Record<string, readonly string[]> = {
  requested: ["scheduled", "cancelled"],
  scheduled: ["confirmed", "cancelled", "no_show"],
  confirmed: ["checked_in", "cancelled", "no_show"],
  checked_in: ["in_progress"],
  in_progress: ["completed"],
};

export const appointmentStatusLabels: Record<string, string> = {
  requested: "Requested",
  scheduled: "Scheduled",
  confirmed: "Confirmed",
  checked_in: "Checked in",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
};

export const appointmentTransitionLabels: Record<string, string> = {
  scheduled: "Schedule",
  confirmed: "Confirm",
  checked_in: "Check in",
  in_progress: "Start consultation",
  completed: "Complete",
  cancelled: "Cancel",
  no_show: "Mark no-show",
};

export const destructiveAppointmentTransitions = new Set(["cancelled", "no_show"]);

export function appointmentStatusLabel(status: string) {
  return appointmentStatusLabels[status] ?? status;
}

export function appointmentTransitionLabel(status: string) {
  return appointmentTransitionLabels[status] ?? appointmentStatusLabel(status);
}

export function canTransition(from: string, to: string) {
  return allowedStatusTransitions[from]?.includes(to) ?? false;
}

export function isPatientCancellationStatus(status: string) {
  return (patientCancellationStatuses as readonly string[]).includes(status);
}

export function isFutureAppointmentDate(value: string, now = Date.now()) {
  const time = new Date(value).getTime();
  return Number.isFinite(time) && time > now;
}
