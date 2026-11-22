-- Doctor-management correctness hardening.
-- Migration history was reconciled against the linked project before this file was created.

alter table public.clinician_profiles
  add column if not exists public_id uuid not null default gen_random_uuid();

create unique index if not exists clinician_profiles_public_id_idx
  on public.clinician_profiles(public_id);

-- Object ownership is stored privately so public object names can be opaque.
-- The public bucket may serve the image bytes, but anonymous callers cannot
-- enumerate this table or infer a Doctor's organization or membership IDs.
create table if not exists public.clinician_photo_objects (
  object_path text primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  membership_id uuid not null references public.staff_memberships(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (object_path ~ '^clinicians/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$'
    or object_path ~ '^[0-9a-f-]+/[0-9a-f-]+/[^/]+\.(jpg|png|webp)$')
);

alter table public.clinician_photo_objects enable row level security;
revoke all on table public.clinician_photo_objects from public, anon;
grant select, insert, update, delete on table public.clinician_photo_objects to authenticated;

drop policy if exists clinician_photo_objects_staff_select on public.clinician_photo_objects;
drop policy if exists clinician_photo_objects_staff_insert on public.clinician_photo_objects;
drop policy if exists clinician_photo_objects_staff_update on public.clinician_photo_objects;
drop policy if exists clinician_photo_objects_staff_delete on public.clinician_photo_objects;
create policy clinician_photo_objects_staff_select
on public.clinician_photo_objects for select to authenticated
using (private.has_permission(organization_id, 'staff.manage'));
create policy clinician_photo_objects_staff_insert
on public.clinician_photo_objects for insert to authenticated
with check (
  private.has_permission(organization_id, 'staff.manage')
  and exists (
    select 1 from public.staff_memberships m
    where m.id = membership_id and m.organization_id = organization_id and m.is_active
  )
);
create policy clinician_photo_objects_staff_update
on public.clinician_photo_objects for update to authenticated
using (private.has_permission(organization_id, 'staff.manage'))
with check (
  private.has_permission(organization_id, 'staff.manage')
  and exists (
    select 1 from public.staff_memberships m
    where m.id = membership_id and m.organization_id = organization_id and m.is_active
  )
);
create policy clinician_photo_objects_staff_delete
on public.clinician_photo_objects for delete to authenticated
using (private.has_permission(organization_id, 'staff.manage'));

-- Register legacy objects before normalizing persisted URLs to object paths.
insert into public.clinician_photo_objects (object_path, organization_id, membership_id)
select distinct
  case
    when cp.photo_path like '%/storage/v1/object/public/clinician-photos/%'
      then split_part(cp.photo_path, '/storage/v1/object/public/clinician-photos/', 2)
    else cp.photo_path
  end,
  m.organization_id,
  cp.membership_id
from public.clinician_profiles cp
join public.staff_memberships m on m.id = cp.membership_id
where cp.photo_path is not null
  and (
    cp.photo_path like '%/storage/v1/object/public/clinician-photos/%'
    or cp.photo_path ~ '^[0-9a-f-]+/[0-9a-f-]+/[^/]+\.(jpg|png|webp)$'
  )
on conflict (object_path) do nothing;

update public.clinician_profiles
set photo_path = split_part(photo_path, '/storage/v1/object/public/clinician-photos/', 2)
where photo_path like '%/storage/v1/object/public/clinician-photos/%';

drop policy if exists clinician_photos_staff_select on storage.objects;
drop policy if exists clinician_photos_staff_insert on storage.objects;
drop policy if exists clinician_photos_staff_update on storage.objects;
drop policy if exists clinician_photos_staff_delete on storage.objects;
create policy clinician_photos_staff_select
on storage.objects for select to authenticated
using (
  bucket_id = 'clinician-photos'
  and exists (
    select 1 from public.clinician_photo_objects photo
    where photo.object_path = name
      and private.has_permission(photo.organization_id, 'staff.manage')
  )
);
create policy clinician_photos_staff_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'clinician-photos'
  and exists (
    select 1 from public.clinician_photo_objects photo
    join public.staff_memberships doctor on doctor.id = photo.membership_id
    where photo.object_path = name
      and doctor.organization_id = photo.organization_id
      and doctor.is_active
      and private.has_permission(photo.organization_id, 'staff.manage')
  )
);
create policy clinician_photos_staff_update
on storage.objects for update to authenticated
using (
  bucket_id = 'clinician-photos'
  and exists (
    select 1 from public.clinician_photo_objects photo
    where photo.object_path = name
      and private.has_permission(photo.organization_id, 'staff.manage')
  )
)
with check (
  bucket_id = 'clinician-photos'
  and exists (
    select 1 from public.clinician_photo_objects photo
    where photo.object_path = name
      and private.has_permission(photo.organization_id, 'staff.manage')
  )
);
create policy clinician_photos_staff_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'clinician-photos'
  and exists (
    select 1 from public.clinician_photo_objects photo
    where photo.object_path = name
      and private.has_permission(photo.organization_id, 'staff.manage')
  )
);

-- Anonymous callers must use the safe projections below. Base scheduling and
-- profile rows remain available only through staff policies.
drop policy if exists clinician_profiles_public_read on public.clinician_profiles;
drop policy if exists clinician_specializations_public_read on public.clinician_specializations;
drop policy if exists clinician_qualifications_public_read on public.clinician_qualifications;
drop policy if exists clinician_achievements_public_read on public.clinician_achievements;
drop policy if exists clinician_availability_public_read on public.clinician_availability_rules;
drop policy if exists clinician_exceptions_public_read on public.clinician_availability_exceptions;

drop function if exists public.get_public_clinician_directory();
drop function if exists private.get_public_clinician_directory_impl();

create function public.get_public_clinician_directory()
returns table (
  slug text,
  display_name text,
  professional_title text,
  public_bio text,
  photo_path text,
  years_experience integer,
  experience_summary text,
  languages text[],
  accepting_appointments boolean,
  department_id uuid,
  department_name text,
  service_id uuid,
  service_name text,
  service_duration_minutes integer,
  facility_id uuid,
  facility_name text,
  facility_city text,
  facility_timezone text,
  specializations jsonb,
  qualifications jsonb,
  achievements jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct
    cp.slug,
    cp.display_name,
    cp.professional_title,
    cp.public_bio,
    cp.photo_path,
    cp.years_experience,
    cp.experience_summary,
    coalesce(cp.languages, array[]::text[]),
    cp.accepting_appointments,
    d.id,
    d.name,
    s.id,
    s.name,
    s.duration_minutes,
    f.id,
    f.name,
    f.city,
    f.timezone,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', cs.name,
        'description', cs.description
      ) order by cs.sort_order, cs.id)
      from public.clinician_specializations cs
      where cs.membership_id = cp.membership_id
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'type', cq.qualification_type,
        'qualification', cq.qualification,
        'institution', cq.institution,
        'country', cq.country,
        'year', cq.year
      ) order by cq.sort_order, cq.id)
      from public.clinician_qualifications cq
      where cq.membership_id = cp.membership_id
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'title', ca.title,
        'description', ca.description,
        'year', ca.year
      ) order by ca.sort_order, ca.id)
      from public.clinician_achievements ca
      where ca.membership_id = cp.membership_id
    ), '[]'::jsonb)
  from public.clinician_profiles cp
  join public.staff_memberships m on m.id = cp.membership_id and m.is_active
  join public.roles r on r.id = m.role_id and r.role_key = 'doctor'
  join public.organizations o on o.id = m.organization_id and o.status = 'active'
  join public.staff_department_assignments sda on sda.membership_id = m.id
  join public.departments d on d.id = sda.department_id and d.is_active and d.is_public
  left join public.staff_service_assignments ssa on ssa.membership_id = m.id and ssa.is_active
  left join public.services s on s.id = ssa.service_id and s.is_active and s.is_public
  left join public.facilities f on f.id = coalesce(s.facility_id, m.primary_facility_id) and f.is_active and f.is_public
  where cp.is_public and cp.slug is not null;
$$;

revoke all on function public.get_public_clinician_directory() from public;
grant execute on function public.get_public_clinician_directory() to anon, authenticated;

create or replace function public.get_public_clinician_schedule(
  p_slug text,
  p_facility_id uuid,
  p_day_of_week smallint,
  p_bounds_start timestamptz,
  p_bounds_end timestamptz
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_membership_id uuid;
  v_user_id uuid;
begin
  if p_day_of_week < 0 or p_day_of_week > 6 or p_bounds_end <= p_bounds_start then
    return null;
  end if;

  select cp.membership_id, cp.user_id
    into v_membership_id, v_user_id
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
$$;

revoke all on function public.get_public_clinician_schedule(text, uuid, smallint, timestamptz, timestamptz) from public;
grant execute on function public.get_public_clinician_schedule(text, uuid, smallint, timestamptz, timestamptz) to anon, authenticated;

create or replace function public.replace_clinician_availability(
  p_membership_id uuid,
  p_facility_id uuid,
  p_periods jsonb
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
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
    from jsonb_to_recordset(p_periods) as p(day_of_week integer, start_time time, end_time time)
    where p.day_of_week not between 0 and 6 or p.end_time <= p.start_time
  ) then
    raise exception 'Availability periods are invalid.';
  end if;

  if exists (
    with periods as (
      select row_number() over () as row_id, p.*
      from jsonb_to_recordset(p_periods) as p(day_of_week integer, start_time time, end_time time)
    )
    select 1
    from periods a
    join periods b on a.day_of_week = b.day_of_week and a.row_id < b.row_id
    where a.start_time < b.end_time and a.end_time > b.start_time
  ) then
    raise exception 'Availability periods cannot overlap.';
  end if;

  delete from public.clinician_availability_rules
  where membership_id = p_membership_id
    and facility_id = p_facility_id
    and organization_id = v_organization_id;

  insert into public.clinician_availability_rules (
    organization_id, membership_id, facility_id, day_of_week, start_time, end_time, is_active
  )
  select v_organization_id, p_membership_id, p_facility_id,
    p.day_of_week, p.start_time, p.end_time, true
  from jsonb_to_recordset(p_periods) as p(day_of_week integer, start_time time, end_time time);

  get diagnostics v_inserted = row_count;
  if v_inserted <> jsonb_array_length(p_periods) then
    raise exception 'Availability replacement count mismatch.';
  end if;
  return v_inserted;
end;
$$;

revoke all on function public.replace_clinician_availability(uuid, uuid, jsonb) from public, anon;
grant execute on function public.replace_clinician_availability(uuid, uuid, jsonb) to authenticated;

create or replace function public.replace_clinician_assignments(
  p_membership_id uuid,
  p_department_ids jsonb,
  p_service_ids jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_organization_id uuid;
  v_department_count integer;
  v_service_count integer;
begin
  if jsonb_typeof(p_department_ids) <> 'array' or jsonb_typeof(p_service_ids) <> 'array' then
    raise exception 'Assignments must be arrays.';
  end if;

  select m.organization_id into v_organization_id
  from public.staff_memberships m
  join public.roles r on r.id = m.role_id and r.role_key = 'doctor'
  where m.id = p_membership_id
    and private.has_permission(m.organization_id, 'staff.manage');

  if v_organization_id is null then
    raise exception 'Doctor account is not available.';
  end if;

  select count(distinct d.id)::integer into v_department_count
  from jsonb_array_elements_text(p_department_ids) requested(value)
  join public.departments d on d.id = requested.value::uuid
    and d.organization_id = v_organization_id;

  if v_department_count <> jsonb_array_length(p_department_ids) then
    raise exception 'One or more departments are not available for this organization.';
  end if;

  select count(distinct s.id)::integer into v_service_count
  from jsonb_array_elements_text(p_service_ids) requested(value)
  join public.services s on s.id = requested.value::uuid
    and s.organization_id = v_organization_id
  where s.department_id is null
     or p_department_ids ? s.department_id::text;

  if v_service_count <> jsonb_array_length(p_service_ids) then
    raise exception 'One or more services are not available for the selected departments.';
  end if;

  delete from public.staff_service_assignments where membership_id = p_membership_id;
  delete from public.staff_department_assignments where membership_id = p_membership_id;

  insert into public.staff_department_assignments (membership_id, department_id, is_primary)
  select p_membership_id, item.value::uuid, item.ordinality = 1
  from jsonb_array_elements_text(p_department_ids) with ordinality as item(value, ordinality);

  get diagnostics v_department_count = row_count;
  if v_department_count <> jsonb_array_length(p_department_ids) then
    raise exception 'Department replacement count mismatch.';
  end if;

  insert into public.staff_service_assignments (membership_id, service_id, is_active)
  select p_membership_id, item.value::uuid, true
  from jsonb_array_elements_text(p_service_ids) as item(value);

  get diagnostics v_service_count = row_count;
  if v_service_count <> jsonb_array_length(p_service_ids) then
    raise exception 'Service replacement count mismatch.';
  end if;

  return jsonb_build_object('departments', v_department_count, 'services', v_service_count);
end;
$$;

revoke all on function public.replace_clinician_assignments(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.replace_clinician_assignments(uuid, jsonb, jsonb) to authenticated;

create or replace function public.replace_clinician_profile(
  p_membership_id uuid,
  p_slug text,
  p_display_name text,
  p_professional_title text,
  p_public_bio text,
  p_photo_path text,
  p_years_experience integer,
  p_experience_summary text,
  p_languages text[],
  p_specializations jsonb,
  p_qualifications jsonb,
  p_achievements jsonb
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_organization_id uuid;
  v_user_id uuid;
  v_count integer;
begin
  if jsonb_typeof(p_specializations) <> 'array'
    or jsonb_typeof(p_qualifications) <> 'array'
    or jsonb_typeof(p_achievements) <> 'array' then
    raise exception 'Profile collections must be arrays.';
  end if;

  select m.organization_id, m.user_id into v_organization_id, v_user_id
  from public.staff_memberships m
  join public.roles r on r.id = m.role_id and r.role_key = 'doctor'
  where m.id = p_membership_id
    and private.has_permission(m.organization_id, 'staff.manage');

  if v_organization_id is null then
    raise exception 'Doctor account is not available.';
  end if;
  if nullif(trim(p_display_name), '') is null or nullif(trim(p_professional_title), '') is null then
    raise exception 'Display name and professional title are required.';
  end if;
  if p_years_experience is not null and p_years_experience not between 0 and 100 then
    raise exception 'Years of experience is invalid.';
  end if;
  if p_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'Clinician slug is invalid.';
  end if;
  if p_photo_path is not null and not exists (
    select 1
    from public.clinician_photo_objects photo
    where photo.object_path = p_photo_path
      and photo.organization_id = v_organization_id
      and photo.membership_id = p_membership_id
  ) then
    raise exception 'Clinician photo is not registered for this Doctor.';
  end if;

  insert into public.clinician_profiles (
    membership_id, user_id, slug, display_name, professional_title,
    public_bio, photo_path, years_experience, experience_summary, languages
  ) values (
    p_membership_id, v_user_id, p_slug, trim(p_display_name), trim(p_professional_title),
    nullif(trim(p_public_bio), ''), p_photo_path, p_years_experience,
    nullif(trim(p_experience_summary), ''), coalesce(p_languages, array[]::text[])
  )
  on conflict (membership_id) do update set
    slug = coalesce(public.clinician_profiles.slug, excluded.slug),
    display_name = excluded.display_name,
    professional_title = excluded.professional_title,
    public_bio = excluded.public_bio,
    photo_path = excluded.photo_path,
    years_experience = excluded.years_experience,
    experience_summary = excluded.experience_summary,
    languages = excluded.languages,
    updated_at = now();

  delete from public.clinician_specializations where membership_id = p_membership_id;
  insert into public.clinician_specializations (
    membership_id, organization_id, name, description, sort_order
  )
  select p_membership_id, v_organization_id, trim(item.name), nullif(trim(item.description), ''), item.ordinality - 1
  from jsonb_to_recordset(p_specializations) with ordinality
    as item(name text, description text, ordinality bigint);
  get diagnostics v_count = row_count;
  if v_count <> jsonb_array_length(p_specializations) then
    raise exception 'Specialization replacement count mismatch.';
  end if;

  delete from public.clinician_qualifications where membership_id = p_membership_id;
  insert into public.clinician_qualifications (
    membership_id, organization_id, qualification_type, qualification,
    institution, country, year, sort_order
  )
  select p_membership_id, v_organization_id, item.qualification_type,
    trim(item.qualification), trim(item.institution), nullif(trim(item.country), ''),
    item.year, item.ordinality - 1
  from jsonb_to_recordset(p_qualifications) with ordinality
    as item(qualification_type text, qualification text, institution text, country text, year integer, ordinality bigint);
  get diagnostics v_count = row_count;
  if v_count <> jsonb_array_length(p_qualifications) then
    raise exception 'Qualification replacement count mismatch.';
  end if;

  delete from public.clinician_achievements where membership_id = p_membership_id;
  insert into public.clinician_achievements (
    membership_id, organization_id, title, description, year, sort_order
  )
  select p_membership_id, v_organization_id, trim(item.title),
    nullif(trim(item.description), ''), item.year, item.ordinality - 1
  from jsonb_to_recordset(p_achievements) with ordinality
    as item(title text, description text, year integer, ordinality bigint);
  get diagnostics v_count = row_count;
  if v_count <> jsonb_array_length(p_achievements) then
    raise exception 'Achievement replacement count mismatch.';
  end if;

  return p_photo_path;
end;
$$;

revoke all on function public.replace_clinician_profile(uuid, text, text, text, text, text, integer, text, text[], jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.replace_clinician_profile(uuid, text, text, text, text, text, integer, text, text[], jsonb, jsonb, jsonb) to authenticated;

-- The final appointment write is revalidated inside the same transaction that
-- inserts it. The private implementation is SECURITY DEFINER only because it
-- must inspect public scheduling rows that anonymous projections no longer
-- expose; it performs explicit patient ownership and organization checks.
create or replace function private.request_patient_appointment_impl(
  p_patient_id uuid,
  p_facility_id uuid,
  p_department_id uuid,
  p_service_id uuid,
  p_clinician_slug text,
  p_scheduled_start timestamptz,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
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
$$;

revoke all on function private.request_patient_appointment_impl(uuid, uuid, uuid, uuid, text, timestamptz, text) from public, anon;
grant execute on function private.request_patient_appointment_impl(uuid, uuid, uuid, uuid, text, timestamptz, text) to authenticated;

create or replace function public.request_patient_appointment(
  p_patient_id uuid,
  p_facility_id uuid,
  p_department_id uuid,
  p_service_id uuid,
  p_clinician_slug text,
  p_scheduled_start timestamptz,
  p_reason text
)
returns uuid
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.request_patient_appointment_impl(
    p_patient_id,
    p_facility_id,
    p_department_id,
    p_service_id,
    p_clinician_slug,
    p_scheduled_start,
    p_reason
  );
$$;

revoke all on function public.request_patient_appointment(uuid, uuid, uuid, uuid, text, timestamptz, text) from public, anon;
grant execute on function public.request_patient_appointment(uuid, uuid, uuid, uuid, text, timestamptz, text) to authenticated;
