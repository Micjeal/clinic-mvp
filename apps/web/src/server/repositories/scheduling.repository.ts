import "server-only";
import { createClient } from "@/lib/supabase/server";
import { dayOfWeekForDate, isAvailabilityRuleEffective, localDateBounds, RESERVING_STATUSES } from "@/server/services/scheduling.service";

export async function getPublicClinicianSchedule(input: { slug: string; facilityId: string; date: string; timeZone: string }) {
  const supabase = await createClient();
  const dayOfWeek = dayOfWeekForDate(input.date);
  const bounds = localDateBounds(input.date, input.timeZone);
  if (dayOfWeek === null || !bounds) return null;
  const rpc = supabase.rpc.bind(supabase) as unknown as (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: Error | null }>;
  const { data, error } = await rpc("get_public_clinician_schedule", {
    p_slug: input.slug,
    p_facility_id: input.facilityId,
    p_day_of_week: dayOfWeek,
    p_bounds_start: bounds.start.toISOString(),
    p_bounds_end: bounds.end.toISOString(),
  });
  if (error) throw error;
  if (!data || typeof data !== "object") return null;
  const result = data as {
    rules?: Array<{ dayOfWeek: number; startTime: string; endTime: string }>;
    exceptions?: Array<{ startsAt: string; endsAt: string; type: "unavailable" | "available_override" }>;
    busy?: Array<{ startsAt: string; endsAt: string }>;
  };
  return {
    rules: result.rules ?? [],
    exceptions: result.exceptions ?? [],
    busy: result.busy ?? [],
  };
}

export async function listAssignableClinicians(input: { organizationId: string; facilityId: string; departmentId: string; serviceId?: string | null }) {
  const supabase = await createClient();
  const { data: memberships, error } = await supabase.from("staff_memberships").select("id,user_id,primary_facility_id,roles(role_key),profiles(full_name,professional_title)").eq("organization_id", input.organizationId).eq("is_active", true);
  if (error) throw error;
  const doctors = (memberships ?? []).filter((member) => (member.roles as { role_key?: string } | null)?.role_key === "doctor");
  if (!doctors.length) return [];
  const ids = doctors.map((member) => member.id);
  const { data: departmentAssignments, error: departmentError } = await supabase.from("staff_department_assignments").select("membership_id").in("membership_id", ids).eq("department_id", input.departmentId);
  if (departmentError) throw departmentError;
  const departmentIds = new Set((departmentAssignments ?? []).map((item) => item.membership_id));
  if (!departmentIds.size) return [];
  let serviceIds = departmentIds;
  let serviceFacilityId: string | null = null;
  if (input.serviceId) {
    const [{ data: serviceAssignments, error: serviceError }, { data: service, error: serviceRowError }] = await Promise.all([
      supabase.from("staff_service_assignments").select("membership_id").in("membership_id", [...departmentIds]).eq("is_active", true).eq("service_id", input.serviceId),
      supabase.from("services").select("facility_id").eq("id", input.serviceId).maybeSingle(),
    ]);
    if (serviceError) throw serviceError;
    if (serviceRowError) throw serviceRowError;
    serviceIds = new Set((serviceAssignments ?? []).map((item) => item.membership_id));
    serviceFacilityId = service?.facility_id ?? null;
  }
  return doctors
    .filter((doctor) => departmentIds.has(doctor.id) && serviceIds.has(doctor.id))
    .filter((doctor) => (serviceFacilityId ?? doctor.primary_facility_id) === input.facilityId)
    .map((doctor) => ({ membershipId: doctor.id, userId: doctor.user_id, displayName: (doctor.profiles as { full_name?: string } | null)?.full_name ?? "Unnamed doctor", professionalTitle: (doctor.profiles as { professional_title?: string } | null)?.professional_title ?? null }));
}

export async function listClinicianAvailability(membershipId: string, facilityId: string, date: string, timeZone = "Africa/Kampala") {
  const supabase = await createClient();
  const dayOfWeek = dayOfWeekForDate(date);
  if (dayOfWeek === null) return { rules: [], exceptions: [] };
  const bounds = localDateBounds(date, timeZone);
  if (!bounds) return { rules: [], exceptions: [] };
  const [{ data: rules, error: rulesError }, { data: exceptions, error: exceptionsError }] = await Promise.all([
    supabase.from("clinician_availability_rules").select("day_of_week,start_time,end_time,effective_from,effective_to").eq("membership_id", membershipId).eq("facility_id", facilityId).eq("day_of_week", dayOfWeek).eq("is_active", true),
    supabase.from("clinician_availability_exceptions").select("starts_at,ends_at,type").eq("membership_id", membershipId).eq("facility_id", facilityId).lt("starts_at", bounds.end.toISOString()).gt("ends_at", bounds.start.toISOString()),
  ]);
  if (rulesError) throw rulesError;
  if (exceptionsError) throw exceptionsError;
  return { rules: (rules ?? []).filter((rule) => isAvailabilityRuleEffective(date, { effectiveFrom: rule.effective_from, effectiveTo: rule.effective_to })).map((rule) => ({ dayOfWeek: rule.day_of_week, startTime: rule.start_time, endTime: rule.end_time })), exceptions: (exceptions ?? []).map((item) => ({ startsAt: item.starts_at, endsAt: item.ends_at, type: item.type as "unavailable" | "available_override" })) };
}

export async function listClinicianBusyIntervals(userId: string, date: string, timeZone = "Africa/Kampala") {
  const supabase = await createClient();
  const bounds = localDateBounds(date, timeZone);
  if (!bounds) return [];
  const { data, error } = await supabase.from("appointments").select("scheduled_start,scheduled_end").eq("clinician_user_id", userId).in("status", [...RESERVING_STATUSES]).lt("scheduled_start", bounds.end.toISOString()).gt("scheduled_end", bounds.start.toISOString());
  if (error) throw error;
  return (data ?? []).filter((item): item is { scheduled_start: string; scheduled_end: string } => Boolean(item.scheduled_start && item.scheduled_end)).map((item) => ({ startsAt: item.scheduled_start, endsAt: item.scheduled_end }));
}
