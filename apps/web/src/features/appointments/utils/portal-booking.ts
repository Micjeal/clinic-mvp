import type { Tables } from "@clinic/database";
import type { PublicClinician } from "@/server/repositories/clinician.repository";

export const portalBookingPath = "/portal/appointments/new";
export const portalBookingSteps = ["Location", "Department", "Service", "Doctor", "Date & time", "Review"] as const;

export function filterPortalServices(services: Tables<"services">[], facilityId: string, departmentId: string) {
  return services.filter((service) => (!facilityId || !service.facility_id || service.facility_id === facilityId) && (!departmentId || !service.department_id || service.department_id === departmentId));
}

export type BookingContext = {
  facility?: string;
  department?: string;
  service?: string;
  doctor?: string;
  date?: string;
  scheduledStart?: string;
};

export function portalBookingPathWithContext(context: BookingContext) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(context)) {
    if (value) params.set(key === "scheduledStart" ? "scheduled_start" : key, value);
  }
  const query = params.toString();
  return query ? `${portalBookingPath}?${query}` : portalBookingPath;
}

export function publicBookingPath(context: BookingContext) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(context)) {
    if (value) params.set(key === "scheduledStart" ? "scheduled_start" : key, value);
  }
  const query = params.toString();
  return query ? `/appointments?${query}` : "/appointments";
}

export function clinicianIsCompatible(
  clinician: PublicClinician,
  selection: { facilityId?: string; departmentId?: string; serviceId?: string },
) {
  return (!selection.facilityId || clinician.facilityIds.includes(selection.facilityId))
    && (!selection.departmentId || clinician.departmentIds.includes(selection.departmentId))
    && (!selection.serviceId || clinician.serviceIds.includes(selection.serviceId));
}
