-- Phase 2: reception, check-in, operational queue and triage foundation.
alter table public.encounters add column if not exists service_id uuid references public.services(id);
create unique index if not exists encounters_appointment_unique on public.encounters(appointment_id) where appointment_id is not null;

create table if not exists public.queue_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  facility_id uuid not null references public.facilities(id) on delete cascade,
  department_id uuid not null references public.departments(id) on delete cascade,
  encounter_id uuid not null unique references public.encounters(id) on delete cascade,
  status text not null default 'waiting_triage' check (status in ('waiting_triage','in_triage','waiting_clinician','with_clinician','completed','cancelled')),
  priority text not null default 'routine' check (priority in ('routine','priority','urgent','emergency')),
  checked_in_at timestamptz not null default now(),
  triage_started_at timestamptz,
  triage_completed_at timestamptz,
  ready_for_clinician_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists queue_entries_operational_idx on public.queue_entries(organization_id,facility_id,status,priority,checked_in_at);
alter table public.queue_entries enable row level security;

create policy queue_entries_staff_read on public.queue_entries for select to authenticated using (private.has_permission(organization_id,'queue.read') or private.has_permission(organization_id,'queue.manage'));
create policy queue_entries_staff_insert on public.queue_entries for insert to authenticated with check (private.has_permission(organization_id,'queue.manage'));
create policy queue_entries_staff_update on public.queue_entries for update to authenticated using (private.has_permission(organization_id,'queue.manage')) with check (private.has_permission(organization_id,'queue.manage'));

insert into public.permissions(permission_key,description) values
 ('reception.checkin','Check in arriving patients'),
 ('queue.read','Read operational patient queues'),
 ('queue.manage','Manage queue stages and priorities')
on conflict (permission_key) do nothing;
insert into public.role_permissions(role_id,permission_key)
select r.id,p.permission_key from public.roles r cross join public.permissions p
where r.role_key='organization_admin' and p.permission_key in ('reception.checkin','queue.read','queue.manage') on conflict do nothing;
insert into public.role_permissions(role_id,permission_key)
select r.id,p.permission_key from public.roles r cross join public.permissions p
where r.role_key='receptionist' and p.permission_key in ('reception.checkin','queue.read','queue.manage') on conflict do nothing;
insert into public.role_permissions(role_id,permission_key)
select r.id,p.permission_key from public.roles r cross join public.permissions p
where r.role_key='nurse' and p.permission_key in ('queue.read','queue.manage') on conflict do nothing;

;
