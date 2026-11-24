-- Radiology / imaging module: exam catalog, orders, reports

insert into public.permissions(permission_key, description) values
  ('radiology.read','View imaging orders and reports'),
  ('radiology.order','Order imaging studies'),
  ('radiology.report.write','Write imaging reports'),
  ('radiology.report.approve','Approve and finalize imaging reports')
on conflict (permission_key) do nothing;

create table public.imaging_tests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  name text not null,
  modality text not null default 'xray' check (modality in ('xray','ultrasound','ct','mri','mammography','fluoroscopy','other')),
  body_part text,
  description text,
  price numeric(14,2) not null default 0 check (price >= 0),
  currency_code text not null default 'UGX',
  is_active boolean not null default true,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  unique (organization_id, code)
);

create table public.imaging_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  facility_id uuid not null references public.facilities(id),
  encounter_id uuid not null references public.encounters(id) on delete cascade,
  patient_id uuid not null references public.patients(id),
  imaging_test_id uuid not null references public.imaging_tests(id),
  ordered_by uuid not null references public.profiles(id),
  priority text not null default 'routine' check (priority in ('routine','urgent','stat')),
  status text not null default 'ordered' check (status in ('ordered','scheduled','in_progress','completed','cancelled')),
  clinical_indication text,
  scheduled_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.imaging_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  imaging_order_id uuid not null unique references public.imaging_orders(id) on delete cascade,
  patient_id uuid not null references public.patients(id),
  findings text,
  impression text,
  recommendations text,
  status text not null default 'draft' check (status in ('draft','final','amended')),
  reported_by uuid references public.profiles(id) on delete set null,
  approved_by uuid references public.profiles(id) on delete set null,
  reported_at timestamptz,
  approved_at timestamptz,
  patient_visible boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index imaging_orders_org_idx on public.imaging_orders(organization_id, created_at desc);
create index imaging_orders_encounter_idx on public.imaging_orders(encounter_id);
create index imaging_reports_patient_idx on public.imaging_reports(patient_id);

alter table public.imaging_tests enable row level security;
alter table public.imaging_orders enable row level security;
alter table public.imaging_reports enable row level security;

-- imaging_tests: staff read, manage via department.manage or radiology.report.approve
create policy imaging_tests_member_read on public.imaging_tests for select to authenticated
  using (private.has_permission(organization_id,'radiology.read') or private.has_permission(organization_id,'encounter.read') or is_public = true);
create policy imaging_tests_manage_insert on public.imaging_tests for insert to authenticated
  with check (private.has_permission(organization_id,'department.manage') or private.has_permission(organization_id,'radiology.report.approve'));
create policy imaging_tests_manage_update on public.imaging_tests for update to authenticated
  using (private.has_permission(organization_id,'department.manage') or private.has_permission(organization_id,'radiology.report.approve'))
  with check (private.has_permission(organization_id,'department.manage') or private.has_permission(organization_id,'radiology.report.approve'));

-- imaging_orders
create policy imaging_orders_read on public.imaging_orders for select to authenticated
  using (private.has_permission(organization_id,'radiology.read') or private.has_permission(organization_id,'encounter.read'));
create policy imaging_orders_insert on public.imaging_orders for insert to authenticated
  with check (private.has_permission(organization_id,'radiology.order'));
create policy imaging_orders_update on public.imaging_orders for update to authenticated
  using (private.has_permission(organization_id,'radiology.order') or private.has_permission(organization_id,'radiology.report.write'))
  with check (private.has_permission(organization_id,'radiology.order') or private.has_permission(organization_id,'radiology.report.write'));

-- imaging_reports
create policy imaging_reports_read on public.imaging_reports for select to authenticated
  using (private.has_permission(organization_id,'radiology.read') or private.has_permission(organization_id,'encounter.read'));
create policy imaging_reports_insert on public.imaging_reports for insert to authenticated
  with check (private.has_permission(organization_id,'radiology.report.write'));
create policy imaging_reports_update on public.imaging_reports for update to authenticated
  using (private.has_permission(organization_id,'radiology.report.write') or private.has_permission(organization_id,'radiology.report.approve'))
  with check (private.has_permission(organization_id,'radiology.report.write') or private.has_permission(organization_id,'radiology.report.approve'));

-- role grants: doctors order+read, nurses read, lab_technician reports, admin gets all via existing all-perms grant pattern
insert into public.role_permissions(role_id, permission_key)
select r.id, x.permission_key from public.roles r
join (values ('radiology.read'),('radiology.order')) as x(permission_key) on true
where r.role_key in ('doctor','organization_admin') on conflict do nothing;

insert into public.role_permissions(role_id, permission_key)
select r.id, 'radiology.read' from public.roles r
where r.role_key in ('nurse','receptionist','lab_technician') on conflict do nothing;

insert into public.role_permissions(role_id, permission_key)
select r.id, x.permission_key from public.roles r
join (values ('radiology.read'),('radiology.report.write'),('radiology.report.approve')) as x(permission_key) on true
where r.role_key in ('lab_technician','organization_admin') on conflict do nothing;
