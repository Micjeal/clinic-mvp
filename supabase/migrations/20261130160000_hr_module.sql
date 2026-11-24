-- HR module: staff shifts and leave requests

insert into public.permissions(permission_key, description) values
  ('hr.read','View staff schedules and leave'),
  ('hr.manage','Manage staff schedules')
on conflict (permission_key) do nothing;

create table public.staff_shifts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  staff_membership_id uuid not null references public.staff_memberships(id) on delete cascade,
  facility_id uuid references public.facilities(id) on delete set null,
  shift_date date not null,
  start_time time not null,
  end_time time not null,
  role_on_duty text,
  notes text,
  created_at timestamptz not null default now(),
  unique (staff_membership_id, shift_date, start_time)
);

create table public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  staff_membership_id uuid not null references public.staff_memberships(id) on delete cascade,
  leave_type text not null default 'annual' check (leave_type in ('annual','sick','maternity','paternity','compassionate','unpaid','other')),
  start_date date not null,
  end_date date not null,
  reason text,
  status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create index staff_shifts_org_date_idx on public.staff_shifts(organization_id, shift_date);
create index leave_requests_org_idx on public.leave_requests(organization_id, status);

alter table public.staff_shifts enable row level security;
alter table public.leave_requests enable row level security;

create policy staff_shifts_read on public.staff_shifts for select to authenticated
  using (private.has_permission(organization_id,'hr.read') or private.has_permission(organization_id,'staff.manage'));
create policy staff_shifts_insert on public.staff_shifts for insert to authenticated
  with check (private.has_permission(organization_id,'hr.manage') or private.has_permission(organization_id,'staff.manage'));
create policy staff_shifts_update on public.staff_shifts for update to authenticated
  using (private.has_permission(organization_id,'hr.manage') or private.has_permission(organization_id,'staff.manage'))
  with check (private.has_permission(organization_id,'hr.manage') or private.has_permission(organization_id,'staff.manage'));
create policy staff_shifts_delete on public.staff_shifts for delete to authenticated
  using (private.has_permission(organization_id,'hr.manage') or private.has_permission(organization_id,'staff.manage'));

create policy leave_requests_read on public.leave_requests for select to authenticated
  using (private.has_permission(organization_id,'hr.read') or private.has_permission(organization_id,'staff.manage'));
create policy leave_requests_insert on public.leave_requests for insert to authenticated
  with check (staff_membership_id in (select id from public.staff_memberships where user_id = (select auth.uid()) and organization_id = leave_requests.organization_id));
create policy leave_requests_update on public.leave_requests for update to authenticated
  using (private.has_permission(organization_id,'hr.manage') or private.has_permission(organization_id,'staff.manage'))
  with check (private.has_permission(organization_id,'hr.manage') or private.has_permission(organization_id,'staff.manage'));

insert into public.role_permissions(role_id, permission_key)
select r.id, x.permission_key from public.roles r
join (values ('hr.read'),('hr.manage')) as x(permission_key) on true
where r.role_key = 'organization_admin' on conflict do nothing;

insert into public.role_permissions(role_id, permission_key)
select r.id, 'hr.read' from public.roles r
where r.role_key in ('receptionist','doctor','nurse') on conflict do nothing;
