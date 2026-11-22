-- Department opening hours exist but were never enforced, so the public schedule
-- could offer times on days the clinic is closed (for example Sunday for Pediatrics).
-- Add a reusable local-time check and enforce it in the authoritative booking RPC.

create or replace function private.department_open_at(
  target_department_id uuid,
  local_start timestamp,
  local_end timestamp
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_hours jsonb;
  v_key text;
  v_text text;
  v_starts time;
  v_ends time;
begin
  if local_end <= local_start then
    return false;
  end if;

  select d.opening_hours into v_hours
  from public.departments d
  where d.id = target_department_id;

  -- Unconfigured hours mean "no restriction" rather than "always closed".
  if v_hours is null or v_hours = '{}'::jsonb then
    return true;
  end if;

  v_key := (array['sun','mon','tue','wed','thu','fri','sat'])[extract(dow from local_start)::integer + 1];
  v_text := coalesce(v_hours ->> v_key, '');
  if btrim(v_text) = '' then
    return false;
  end if;

  for v_starts, v_ends in
    select
      nullif(btrim(split_part(part, '-', 1)), '')::time,
      nullif(btrim(split_part(part, '-', 2)), '')::time
    from regexp_split_to_table(v_text, ',') as part
  loop
    if v_starts is not null and v_ends is not null
      and local_start::time >= v_starts
      and local_end::time <= v_ends then
      return true;
    end if;
  end loop;

  return false;
end;
$function$;

create or replace function private.request_patient_appointment_impl(p_patient_id uuid, p_facility_id uuid, p_department_id uuid, p_service_id uuid, p_clinician_slug text, p_scheduled_start timestamp with time zone, p_reason text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_actor_id uuid := (select auth.uid());
  v_organization_id uuid;
  v_clinician_user_id uuid;
  v_membership_id uuid;
  v_timezone text;
  v_duration_minutes integer;
  v_scheduled_end timestamptz;
  v_local_start timestamp;
  v_local_end timestamp;
  v_appointment_id uuid;
  v_is_available boolean;
begin
  if v_actor_id is null then
    raise exception 'Authentication is required.';
  end if;
  if p_service_id is null or p_clinician_slug is null or p_scheduled_start <= now() then
    raise exception 'That appointment time is no longer available.';
  end if;

  select
    f.organization_id,
    f.timezone,
    s.duration_minutes,
    cp.user_id,
    cp.membership_id
  into
    v_organization_id,
    v_timezone,
    v_duration_minutes,
    v_clinician_user_id,
    v_membership_id
  from public.facilities f
  join public.departments d
    on d.id = p_department_id
   and d.facility_id = f.id
   and d.organization_id = f.organization_id
   and d.is_active
   and d.is_public
  join public.services s
    on s.id = p_service_id
   and s.organization_id = f.organization_id
   and (s.facility_id is null or s.facility_id = f.id)
   and (s.department_id is null or s.department_id = d.id)
   and s.is_active
   and s.is_public
   and s.duration_minutes is not null
   and s.duration_minutes > 0
  join public.clinician_profiles cp
    on cp.slug = p_clinician_slug
   and cp.is_public
   and cp.accepting_appointments
  join public.staff_memberships m
    on m.id = cp.membership_id
   and m.user_id = cp.user_id
   and m.organization_id = f.organization_id
   and m.is_active
  join public.roles r on r.id = m.role_id and r.role_key = 'doctor'
  where f.id = p_facility_id
    and f.is_active
    and f.is_public
    and coalesce(s.facility_id, m.primary_facility_id) = f.id
    and exists (
      select 1 from public.staff_department_assignments sda
      where sda.membership_id = m.id and sda.department_id = d.id
    )
    and exists (
      select 1 from public.staff_service_assignments ssa
      where ssa.membership_id = m.id and ssa.service_id = s.id and ssa.is_active
    )
  limit 1;

  if v_membership_id is null then
    raise exception 'That appointment time is no longer available.';
  end if;
  if not exists (
    select 1 from public.patients patient
    where patient.id = p_patient_id
      and patient.auth_user_id = v_actor_id
      and patient.organization_id = v_organization_id
      and patient.is_active
  ) then
    raise exception 'Patient account is not available for this appointment.';
  end if;

  v_scheduled_end := p_scheduled_start + make_interval(mins => v_duration_minutes);
  v_local_start := p_scheduled_start at time zone v_timezone;
  v_local_end := v_scheduled_end at time zone v_timezone;

  select (
    exists (
      select 1
      from public.clinician_availability_rules ar
      where ar.membership_id = v_membership_id
        and ar.facility_id = p_facility_id
        and ar.organization_id = v_organization_id
        and ar.is_active
        and ar.day_of_week = extract(dow from v_local_start)::smallint
        and (ar.effective_from is null or ar.effective_from <= v_local_start::date)
        and (ar.effective_to is null or ar.effective_to >= v_local_start::date)
        and v_local_start::time >= ar.start_time
        and v_local_end::date = v_local_start::date
        and v_local_end::time <= ar.end_time
        and (extract(epoch from (v_local_start::time - ar.start_time))::bigint % 900) = 0
    )
    or exists (
      select 1
      from public.clinician_availability_exceptions ae
      where ae.membership_id = v_membership_id
        and ae.facility_id = p_facility_id
        and ae.organization_id = v_organization_id
        and ae.type = 'available_override'
        and p_scheduled_start >= ae.starts_at
        and v_scheduled_end <= ae.ends_at
        and (extract(epoch from (p_scheduled_start - ae.starts_at))::bigint % 900) = 0
    )
  ) into v_is_available;

  if not coalesce(v_is_available, false)
    or not private.department_open_at(p_department_id, v_local_start, v_local_end)
    or exists (
      select 1
      from public.clinician_availability_exceptions ae
      where ae.membership_id = v_membership_id
        and ae.facility_id = p_facility_id
        and ae.organization_id = v_organization_id
        and ae.type = 'unavailable'
        and ae.starts_at < v_scheduled_end
        and ae.ends_at > p_scheduled_start
    )
    or exists (
      select 1
      from public.appointments appointment
      where appointment.clinician_user_id = v_clinician_user_id
        and appointment.status in ('requested', 'scheduled', 'confirmed', 'checked_in', 'in_progress')
        and appointment.scheduled_start < v_scheduled_end
        and appointment.scheduled_end > p_scheduled_start
    ) then
    raise exception 'That appointment time is no longer available.';
  end if;

  insert into public.appointments (
    organization_id,
    facility_id,
    department_id,
    service_id,
    patient_id,
    clinician_user_id,
    appointment_type,
    status,
    scheduled_start,
    scheduled_end,
    reason,
    created_by
  ) values (
    v_organization_id,
    p_facility_id,
    p_department_id,
    p_service_id,
    p_patient_id,
    v_clinician_user_id,
    'consultation',
    'requested',
    p_scheduled_start,
    v_scheduled_end,
    nullif(trim(p_reason), ''),
    v_actor_id
  )
  returning id into v_appointment_id;

  return v_appointment_id;
exception
  when exclusion_violation or unique_violation then
    raise exception 'That appointment time is no longer available.';
end;
$function$;

revoke all on function private.department_open_at(uuid, timestamp, timestamp) from public;
grant execute on function private.department_open_at(uuid, timestamp, timestamp) to authenticated, service_role;
