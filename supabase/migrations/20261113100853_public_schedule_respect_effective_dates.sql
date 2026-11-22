-- Availability rules carry effective_from / effective_to, and the booking RPC enforces
-- them, but the public schedule RPC ignored them. The slot generator could therefore
-- offer times the database then rejected as "no longer available".
--
-- Resolve the facility-local date from the requested bounds and filter rules by their
-- effective window. No signature change, so existing grants are preserved.
create or replace function public.get_public_clinician_schedule(
  p_slug text,
  p_facility_id uuid,
  p_day_of_week smallint,
  p_bounds_start timestamp with time zone,
  p_bounds_end timestamp with time zone
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_membership_id uuid;
  v_user_id uuid;
  v_timezone text;
  v_local_date date;
begin
  if p_day_of_week < 0 or p_day_of_week > 6 or p_bounds_end <= p_bounds_start then
    return null;
  end if;

  select cp.membership_id, cp.user_id, f.timezone
    into v_membership_id, v_user_id, v_timezone
  from public.clinician_profiles cp
  join public.staff_memberships m on m.id = cp.membership_id and m.is_active
  join public.roles r on r.id = m.role_id and r.role_key = 'doctor'
  join public.organizations o on o.id = m.organization_id and o.status = 'active'
  join public.facilities f on f.id = p_facility_id and f.organization_id = m.organization_id and f.is_active and f.is_public
  where cp.slug = p_slug
    and cp.is_public
    and cp.accepting_appointments
    and exists (
      select 1
      from public.staff_department_assignments sda
      where sda.membership_id = m.id
    )
  limit 1;

  if v_membership_id is null then
    return null;
  end if;

  v_local_date := (p_bounds_start at time zone coalesce(v_timezone, 'UTC'))::date;

  return jsonb_build_object(
    'rules', coalesce((
      select jsonb_agg(jsonb_build_object(
        'dayOfWeek', ar.day_of_week,
        'startTime', ar.start_time::text,
        'endTime', ar.end_time::text
      ) order by ar.start_time)
      from public.clinician_availability_rules ar
      where ar.membership_id = v_membership_id
        and ar.facility_id = p_facility_id
        and ar.day_of_week = p_day_of_week
        and ar.is_active
        and (ar.effective_from is null or ar.effective_from <= v_local_date)
        and (ar.effective_to is null or ar.effective_to >= v_local_date)
    ), '[]'::jsonb),
    'exceptions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'startsAt', ae.starts_at,
        'endsAt', ae.ends_at,
        'type', ae.type
      ) order by ae.starts_at)
      from public.clinician_availability_exceptions ae
      where ae.membership_id = v_membership_id
        and ae.facility_id = p_facility_id
        and ae.starts_at < p_bounds_end
        and ae.ends_at > p_bounds_start
    ), '[]'::jsonb),
    'busy', coalesce((
      select jsonb_agg(jsonb_build_object(
        'startsAt', a.scheduled_start,
        'endsAt', a.scheduled_end
      ) order by a.scheduled_start)
      from public.appointments a
      where a.clinician_user_id = v_user_id
        and a.status in ('requested', 'scheduled', 'confirmed', 'checked_in', 'in_progress')
        and a.scheduled_start < p_bounds_end
        and a.scheduled_end > p_bounds_start
    ), '[]'::jsonb)
  );
end;
$function$;
