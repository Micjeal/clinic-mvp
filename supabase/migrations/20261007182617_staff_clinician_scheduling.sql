-- Staff clinician directory and scheduling foundation.
-- No clinician data is seeded; the organization administrator creates the first doctor.
create extension if not exists btree_gist;

create table if not exists public.staff_service_assignments (
  membership_id uuid not null references public.staff_memberships(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (membership_id, service_id)
);

create table if not exists public.clinician_profiles (
  membership_id uuid primary key references public.staff_memberships(id) on delete cascade,
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  display_name text not null,
  professional_title text,
  public_bio text,
  photo_path text,
  is_public boolean not null default false,
  accepting_appointments boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.clinician_profiles add column if not exists user_id uuid;
create unique index if not exists clinician_profiles_user_id_idx on public.clinician_profiles(user_id);

create table if not exists public.clinician_availability_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  membership_id uuid not null references public.staff_memberships(id) on delete cascade,
  facility_id uuid not null references public.facilities(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  effective_from date,
  effective_to date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time),
  check (effective_to is null or effective_from is null or effective_to >= effective_from),
  unique (membership_id, facility_id, day_of_week, start_time, end_time, effective_from)
);

create table if not exists public.clinician_availability_exceptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  membership_id uuid not null references public.staff_memberships(id) on delete cascade,
  facility_id uuid not null references public.facilities(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  type text not null check (type in ('unavailable', 'available_override')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index if not exists staff_service_assignments_service_idx on public.staff_service_assignments(service_id, is_active);
create index if not exists clinician_availability_rules_lookup_idx on public.clinician_availability_rules(membership_id, facility_id, day_of_week, is_active);
create index if not exists clinician_availability_exceptions_lookup_idx on public.clinician_availability_exceptions(membership_id, facility_id, starts_at, ends_at);

alter table public.staff_service_assignments enable row level security;
alter table public.clinician_profiles enable row level security;
alter table public.clinician_availability_rules enable row level security;
alter table public.clinician_availability_exceptions enable row level security;

create policy clinician_profiles_public_read on public.clinician_profiles for select to anon, authenticated
  using (is_public and accepting_appointments and exists (
    select 1 from public.staff_memberships m
    join public.roles r on r.id = m.role_id
    join public.organizations o on o.id = m.organization_id
    where m.id = clinician_profiles.membership_id and m.is_active and r.role_key = 'doctor' and o.status = 'active'
  ));
create policy clinician_profiles_staff_read on public.clinician_profiles for select to authenticated
  using (exists (select 1 from public.staff_memberships m where m.id = clinician_profiles.membership_id and private.has_permission(m.organization_id, 'appointment.read')));
create policy clinician_profiles_manage on public.clinician_profiles for all to authenticated
  using (exists (select 1 from public.staff_memberships m where m.id = clinician_profiles.membership_id and private.has_permission(m.organization_id, 'staff.manage')))
  with check (exists (select 1 from public.staff_memberships m where m.id = clinician_profiles.membership_id and private.has_permission(m.organization_id, 'staff.manage')));

create policy staff_service_assignments_staff_read on public.staff_service_assignments for select to authenticated
  using (exists (select 1 from public.staff_memberships m where m.id = staff_service_assignments.membership_id and private.has_permission(m.organization_id, 'appointment.read')));
create policy staff_service_assignments_manage on public.staff_service_assignments for all to authenticated
  using (exists (select 1 from public.staff_memberships m where m.id = staff_service_assignments.membership_id and private.has_permission(m.organization_id, 'staff.manage')))
  with check (exists (select 1 from public.staff_memberships m join public.services s on s.id = staff_service_assignments.service_id where m.id = staff_service_assignments.membership_id and m.organization_id = s.organization_id and private.has_permission(m.organization_id, 'staff.manage')));

create policy clinician_availability_public_read on public.clinician_availability_rules for select to anon, authenticated
  using (is_active and exists (select 1 from public.clinician_profiles p where p.membership_id = clinician_availability_rules.membership_id and p.is_public and p.accepting_appointments));
create policy clinician_availability_staff_read on public.clinician_availability_rules for select to authenticated
  using (private.has_permission(organization_id, 'appointment.read'));
create policy clinician_availability_manage on public.clinician_availability_rules for all to authenticated
  using (private.has_permission(organization_id, 'staff.manage')) with check (private.has_permission(organization_id, 'staff.manage'));

create policy clinician_exceptions_staff_read on public.clinician_availability_exceptions for select to authenticated
  using (private.has_permission(organization_id, 'appointment.read'));
create policy clinician_exceptions_manage on public.clinician_availability_exceptions for all to authenticated
  using (private.has_permission(organization_id, 'staff.manage')) with check (private.has_permission(organization_id, 'staff.manage'));

do $$
begin
  if exists (
    select 1 from public.appointments a
    where a.clinician_user_id is not null and a.scheduled_end is null
  ) then
    raise exception 'Cannot add clinician overlap protection while clinician appointments have no scheduled_end';
  end if;
end $$;

alter table public.appointments
  add constraint appointments_clinician_scheduled_end_check
  check (clinician_user_id is null or scheduled_end is not null) not valid;

alter table public.appointments
  add constraint appointments_clinician_no_overlap
  exclude using gist (
    clinician_user_id with =,
    tstzrange(scheduled_start, scheduled_end, '[)') with &&
  ) where (clinician_user_id is not null and status in ('requested', 'scheduled', 'confirmed', 'checked_in', 'in_progress'));

;
