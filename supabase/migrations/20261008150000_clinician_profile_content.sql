alter table public.clinician_profiles
  add column if not exists years_experience integer,
  add column if not exists experience_summary text,
  add column if not exists languages text[];
alter table public.clinician_profiles
  drop constraint if exists clinician_profiles_years_experience_check;
alter table public.clinician_profiles
  add constraint clinician_profiles_years_experience_check check (years_experience is null or (years_experience >= 0 and years_experience <= 100));
create table if not exists public.clinician_specializations (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.staff_memberships(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 120),
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists clinician_specializations_name_idx on public.clinician_specializations (membership_id, lower(name));
create table if not exists public.clinician_qualifications (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.staff_memberships(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  qualification_type text not null check (qualification_type in ('Degree','Masters','Residency','Fellowship','Certification','Other')),
  qualification text not null check (char_length(trim(qualification)) between 2 and 160),
  institution text not null check (char_length(trim(institution)) between 2 and 160),
  country text,
  year integer check (year is null or year between 1800 and 2100),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.clinician_achievements (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.staff_memberships(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 2 and 160),
  description text,
  year integer check (year is null or year between 1800 and 2100),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.clinician_specializations enable row level security;
alter table public.clinician_qualifications enable row level security;
alter table public.clinician_achievements enable row level security;
create or replace function private.can_manage_clinician_profile(target_membership uuid, target_org uuid)
returns boolean language sql stable security definer set search_path = public, private as $$
  select exists (
    select 1 from public.staff_memberships m
    where m.id = target_membership and m.organization_id = target_org
      and m.is_active and private.has_permission(m.organization_id, 'staff.manage')
  );
$$;
create or replace function private.can_read_public_clinician_profile(target_membership uuid)
returns boolean language sql stable security definer set search_path = public, private as $$
  select exists (
    select 1 from public.clinician_profiles p
    join public.staff_memberships m on m.id = p.membership_id and m.is_active
    join public.roles r on r.id = m.role_id and r.role_key = 'doctor'
    join public.organizations o on o.id = m.organization_id and o.status = 'active'
    where p.membership_id = target_membership and p.is_public
  );
$$;
create policy clinician_specializations_public_read on public.clinician_specializations for select to anon, authenticated using (private.can_read_public_clinician_profile(membership_id));
create policy clinician_qualifications_public_read on public.clinician_qualifications for select to anon, authenticated using (private.can_read_public_clinician_profile(membership_id));
create policy clinician_achievements_public_read on public.clinician_achievements for select to anon, authenticated using (private.can_read_public_clinician_profile(membership_id));
create policy clinician_specializations_manage on public.clinician_specializations for all to authenticated using (private.can_manage_clinician_profile(membership_id, organization_id)) with check (private.can_manage_clinician_profile(membership_id, organization_id));
create policy clinician_qualifications_manage on public.clinician_qualifications for all to authenticated using (private.can_manage_clinician_profile(membership_id, organization_id)) with check (private.can_manage_clinician_profile(membership_id, organization_id));
create policy clinician_achievements_manage on public.clinician_achievements for all to authenticated using (private.can_manage_clinician_profile(membership_id, organization_id)) with check (private.can_manage_clinician_profile(membership_id, organization_id));
grant select on public.clinician_specializations, public.clinician_qualifications, public.clinician_achievements to anon, authenticated;
grant insert, update, delete on public.clinician_specializations, public.clinician_qualifications, public.clinician_achievements to authenticated;
drop policy if exists clinician_profiles_public_read on public.clinician_profiles;
create policy clinician_profiles_public_read on public.clinician_profiles for select to anon, authenticated using (
  is_public and exists (
    select 1 from public.staff_memberships m join public.roles r on r.id = m.role_id and r.role_key = 'doctor' join public.organizations o on o.id = m.organization_id and o.status = 'active'
    where m.id = clinician_profiles.membership_id and m.is_active
  )
);
