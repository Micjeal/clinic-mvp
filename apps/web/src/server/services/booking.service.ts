import "server-only";
import { ValidationError } from "@/server/errors";
import { findPublicDepartmentForFacility } from "@/server/repositories/department.repository";
import { findPublicFacility } from "@/server/repositories/facility.repository";
import { listPublicClinicians } from "@/server/repositories/clinician.repository";
import { findPublicService } from "@/server/repositories/service.repository";
import { getPublicClinicianSchedule } from "@/server/repositories/scheduling.repository";
import { generateSlots, type OpeningHours, type Slot } from "@/server/services/scheduling.service";
import { findOrganizationSettingsAdmin, DEFAULT_ORGANIZATION_SETTINGS } from "@/server/repositories/settings.repository";

export type BookingSlotInput = {
  facilityId: string;
  departmentId: string;
  serviceId?: string;
  clinicianSlug?: string;
  date: string;
};

type MatchedSlot = Slot & { clinicianSlug: string };

async function generatedSlotMatches(input: BookingSlotInput): Promise<MatchedSlot[]> {
  const facility = await findPublicFacility(input.facilityId);
  const department = await findPublicDepartmentForFacility(input.departmentId, input.facilityId);
  const service = input.serviceId ? await findPublicService(input.serviceId) : null;
  if (
    facility.organization_id !== department.organization_id
    || (service && (
      service.organization_id !== facility.organization_id
      || (service.facility_id && service.facility_id !== facility.id)
      || (service.department_id && service.department_id !== department.id)
    ))
  ) {
    throw new ValidationError("The selected booking options are no longer available.");
  }
  const durationMinutes = service?.duration_minutes ?? 30;
  if (!durationMinutes) {
    throw new ValidationError("This service is not configured for online booking yet.");
  }

  const settings = { ...DEFAULT_ORGANIZATION_SETTINGS, ...(await findOrganizationSettingsAdmin(facility.organization_id) ?? {}) };
  if (!settings.online_booking_enabled) return [];

  const eligible = (await listPublicClinicians()).filter((clinician) => (
    clinician.facilityIds.includes(facility.id)
    && clinician.departmentIds.includes(department.id)
    && (!service || clinician.serviceIds.includes(service.id))
  ));
  const selected = input.clinicianSlug
    ? eligible.filter((clinician) => clinician.key === input.clinicianSlug)
    : eligible;
  if (input.clinicianSlug && !selected.length) {
    throw new ValidationError("That clinician is no longer available. Choose another doctor.");
  }

  const now = new Date();
  const earliest = now.getTime() + settings.booking_min_advance_minutes * 60_000;
  const latest = now.getTime() + settings.booking_max_advance_days * 86_400_000;
  const groups = await Promise.all(selected.map(async (clinician) => {
    const schedule = await getPublicClinicianSchedule({
      slug: clinician.key,
      facilityId: facility.id,
      date: input.date,
      timeZone: facility.timezone,
    });
    if (!schedule) return [];
    return generateSlots({
      date: input.date,
      timeZone: facility.timezone,
      durationMinutes,
      intervals: schedule.rules,
      exceptions: schedule.exceptions,
      busy: schedule.busy,
      now,
      openingHours: department.opening_hours as unknown as OpeningHours,
    })
      .filter((slot) => {
        const start = new Date(slot.startsAt).getTime();
        return start >= earliest && start <= latest;
      })
      .map((slot) => ({ ...slot, clinicianSlug: clinician.key }));
  }));
  return groups.flat().sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

export async function getAvailableBookingSlots(input: BookingSlotInput) {
  const matches = await generatedSlotMatches(input);
  return [...new Map(matches.map(({ startsAt, endsAt }) => [startsAt, { startsAt, endsAt }])).values()];
}

export async function resolveGeneratedBookingSlot(input: BookingSlotInput, scheduledStart: string) {
  const matches = await generatedSlotMatches(input);
  return matches.find((slot) => slot.startsAt === scheduledStart) ?? null;
}
