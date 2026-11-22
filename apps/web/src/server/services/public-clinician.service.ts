import "server-only";
import { listPublicDepartments } from "@/server/repositories/department.repository";
import {
  findPublicDirectoryClinician,
  listPublicDirectoryClinicians,
  type PublicDirectoryClinician,
} from "@/server/repositories/clinician.repository";
import { getPublicClinicianSchedule } from "@/server/repositories/scheduling.repository";
import { generateSlots, type OpeningHours, type Slot } from "@/server/services/scheduling.service";

export type PublicNextSlot = Slot & {
  facilityId: string;
  facilityName: string;
  facilityCity: string | null;
  timeZone: string;
  departmentId: string;
  departmentName: string;
  serviceId: string;
  serviceName: string;
  durationMinutes: number;
};

export type PublicClinicianWithAvailability = PublicDirectoryClinician & {
  nextSlot: PublicNextSlot | null;
};

type BookablePair = {
  facilityId: string;
  departmentId: string;
  departmentName: string;
  serviceId: string;
  durationMinutes: number;
};

const dateKey = (date: Date, timeZone: string) => new Intl.DateTimeFormat("en-CA", { timeZone }).format(date);

async function loadOpeningHours() {
  const departments = await listPublicDepartments();
  return new Map(departments.map((department) => [department.id, department.opening_hours as unknown as OpeningHours]));
}

/**
 * Return the earliest generated slot across every facility, department and
 * service the clinician is bookable for. A service can belong to a different
 * facility than the clinician's primary one, so the directory exposes explicit
 * pairs, and the slot is clamped to the department's opening hours.
 */
export async function findNextPublicClinicianSlot(
  clinician: PublicDirectoryClinician,
  horizon = 14,
  openingHoursByDepartment: Map<string, OpeningHours> = new Map(),
) {
  if (!clinician.acceptingAppointments) return null;
  const facilities = new Map(clinician.facilities.map((facility) => [facility.id, facility]));
  const bookable = clinician.facilityServices.filter(
    (pair): pair is BookablePair =>
      Boolean(pair.durationMinutes) && facilities.has(pair.facilityId),
  );
  if (!bookable.length) return null;

  const now = new Date();
  for (let offset = 0; offset < horizon; offset += 1) {
    const day = new Date(now);
    day.setUTCDate(now.getUTCDate() + offset);
    const candidates: PublicNextSlot[] = [];
    const pending = new Map<string, { facilityId: string; key: string; timeZone: string }>();
    for (const pair of bookable) {
      const facility = facilities.get(pair.facilityId);
      if (!facility) continue;
      const timeZone = facility.timezone || "Africa/Kampala";
      const key = dateKey(day, timeZone);
      pending.set(`${pair.facilityId}|${key}`, { facilityId: pair.facilityId, key, timeZone });
    }
    const schedules = new Map(await Promise.all(
      [...pending].map(async ([cacheKey, item]) => [
        cacheKey,
        await getPublicClinicianSchedule({
          slug: clinician.slug,
          facilityId: item.facilityId,
          date: item.key,
          timeZone: item.timeZone,
        }),
      ] as const),
    ));
    for (const pair of bookable) {
      const facility = facilities.get(pair.facilityId);
      if (!facility) continue;
      const timeZone = facility.timezone || "Africa/Kampala";
      const key = dateKey(day, timeZone);
      const schedule = schedules.get(`${pair.facilityId}|${key}`);
      if (!schedule) continue;
      const service = clinician.services.find((item) => item.id === pair.serviceId);
      const slots = generateSlots({
        date: key,
        timeZone,
        durationMinutes: pair.durationMinutes,
        intervals: schedule.rules,
        exceptions: schedule.exceptions,
        busy: schedule.busy,
        now,
        openingHours: openingHoursByDepartment.get(pair.departmentId),
      });
      const slot = slots[0];
      if (!slot) continue;
      candidates.push({
        ...slot,
        facilityId: pair.facilityId,
        facilityName: facility.name,
        facilityCity: facility.city,
        timeZone,
        departmentId: pair.departmentId,
        departmentName: pair.departmentName,
        serviceId: pair.serviceId,
        serviceName: service?.name ?? "Consultation",
        durationMinutes: pair.durationMinutes,
      });
    }
    if (candidates.length) return candidates.sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];
  }
  return null;
}

export async function listPublicCliniciansWithAvailability(): Promise<PublicClinicianWithAvailability[]> {
  const [clinicians, openingHours] = await Promise.all([
    listPublicDirectoryClinicians(),
    loadOpeningHours(),
  ]);
  return Promise.all(
    clinicians.map(async (clinician) => ({
      ...clinician,
      nextSlot: await findNextPublicClinicianSlot(clinician, 14, openingHours),
    })),
  );
}

export async function findPublicClinicianProfile(slug: string) {
  const [clinician, openingHours] = await Promise.all([
    findPublicDirectoryClinician(slug),
    loadOpeningHours(),
  ]);
  if (!clinician) return null;
  return {
    ...clinician,
    nextSlot: await findNextPublicClinicianSlot(clinician, 21, openingHours),
  };
}
