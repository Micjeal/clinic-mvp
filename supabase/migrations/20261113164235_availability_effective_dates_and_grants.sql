-- Effective availability windows could only be set outside the UI because the
-- replacement RPC rewrote rules without them. Accept optional effective dates,
-- allow non-overlapping windows for the same clock period, and tighten grants.

create or replace function public.replace_clinician_availability(p_membership_id uuid, p_facility_id uuid, p_periods jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_organization_id uuid;
  v_inserted integer := 0;
begin
  if jsonb_typeof(p_periods) <> 'array' then
    raise exception 'Availability periods must be an array.';
  end if;

  select m.organization_id into v_organization_id
  from public.staff_memberships m
  join public.roles r on r.id = m.role_id and r.role_key = 'doctor'
  where m.id = p_membership_id
    and private.has_permission(m.organization_id, 'staff.manage');

  if v_organization_id is null then
    raise exception 'Doctor account is not available.';
  end if;

  if not exists (
    select 1 from public.facilities f
    where f.id = p_facility_id and f.organization_id = v_organization_id
  ) then
    raise exception 'Facility is not available for this organization.';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_periods) as p(day_of_week integer, start_time time, end_time time, effective_from date, effective_to date)
    where p.day_of_week not between 0 and 6
      or p.end_time <= p.start_time
      or (p.effective_from is not null and p.effective_to is not null and p.effective_to < p.effective_from)
  ) then
    raise exception 'Availability periods are invalid.';
  end if;

  if exists (
    with periods as (
      select row_number() over () as row_id, p.*
      from jsonb_to_recordset(p_periods) as p(day_of_week integer, start_time time, end_time time, effective_from date, effective_to date)
    )
    select 1
    from periods a
    join periods b on a.day_of_week = b.day_of_week and a.row_id < b.row_id
    where a.start_time < b.end_time
      and a.end_time > b.start_time
      and daterange(coalesce(a.effective_from, '-infinity'::date), coalesce(a.effective_to, 'infinity'::date), '[]')
          && daterange(coalesce(b.effective_from, '-infinity'::date), coalesce(b.effective_to, 'infinity'::date), '[]')
  ) then
    raise exception 'Availability periods cannot overlap.';
  end if;

  delete from public.clinician_availability_rules
  where membership_id = p_membership_id
    and facility_id = p_facility_id
    and organization_id = v_organization_id;

  insert into public.clinician_availability_rules (
    organization_id, membership_id, facility_id, day_of_week, start_time, end_time,
    effective_from, effective_to, is_active
  )
  select v_organization_id, p_membership_id, p_facility_id,
    p.day_of_week, p.start_time, p.end_time, p.effective_from, p.effective_to, true
  from jsonb_to_recordset(p_periods) as p(day_of_week integer, start_time time, end_time time, effective_from date, effective_to date);

  get diagnostics v_inserted = row_count;
  if v_inserted <> jsonb_array_length(p_periods) then
    raise exception 'Availability replacement count mismatch.';
  end if;
  return v_inserted;
end;
$function$;

-- NULL effective dates were treated as distinct, so identical rules could be
-- inserted twice. Use sentinel dates so the uniqueness rule always applies.
alter table public.clinician_availability_rules
  drop constraint if exists clinician_availability_rules_membership_id_facility_id_day__key;
create unique index if not exists clinician_availability_rules_unique_window_idx
  on public.clinician_availability_rules (
    membership_id,
    facility_id,
    day_of_week,
    start_time,
    end_time,
    coalesce(effective_from, '-infinity'::date),
    coalesce(effective_to, 'infinity'::date)
  );

-- Anonymous callers never read these tables directly (public reads go through
-- SECURITY DEFINER RPCs), and TRUNCATE bypasses RLS.
revoke all on table public.clinician_availability_rules from anon;
revoke all on table public.clinician_availability_exceptions from anon;
revoke all on table public.clinician_profiles from anon;
revoke truncate, references, trigger on table public.clinician_availability_rules from authenticated;
revoke truncate, references, trigger on table public.clinician_availability_exceptions from authenticated;
revoke truncate, references, trigger on table public.clinician_profiles from authenticated;
