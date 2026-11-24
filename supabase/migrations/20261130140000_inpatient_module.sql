-- Inpatient module: wards, beds, admissions

insert into public.permissions(permission_key, description) values
  ('ward.read','View wards, beds and admissions'),
  ('ward.manage','Manage ward structure and bed status'),
  ('admission.manage','Admit, transfer and discharge patients')
on conflict (permission_key) do nothing;

create table public.wards (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  facility_id uuid not null references public.facilities(id),
  department_id uuid references public.departments(id) on delete set null,
  name text not null,
  ward_type text not null default 'general' check (ward_type in ('general','maternity','pediatric','icu','high_dependency','isolation','private')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (facility_id, name)
);

create table public.beds (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  ward_id uuid not null references public.wards(id) on delete cascade,
  bed_number text not null,
  status text not null default 'available' check (status in ('available','occupied','reserved','maintenance','closed')),
  created_at timestamptz not null default now(),
  unique (ward_id, bed_number)
);

create table public.admissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  facility_id uuid not null references public.facilities(id),
  patient_id uuid not null references public.patients(id),
  ward_id uuid not null references public.wards(id),
  bed_id uuid references public.beds(id) on delete set null,
  encounter_id uuid references public.encounters(id) on delete set null,
  admitted_by uuid references public.profiles(id) on delete set null,
  admission_number text not null,
  status text not null default 'admitted' check (status in ('admitted','on_leave','transferred','discharged','deceased')),
  reason_for_admission text,
  diagnosis_on_admission text,
  admitted_at timestamptz not null default now(),
  discharged_at timestamptz,
  discharge_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, admission_number)
);

create index admissions_org_idx on public.admissions(organization_id, status, admitted_at desc);
create index admissions_patient_idx on public.admissions(patient_id, admitted_at desc);
create index beds_ward_idx on public.beds(ward_id, status);

alter table public.wards enable row level security;
alter table public.beds enable row level security;
alter table public.admissions enable row level security;

create policy wards_read on public.wards for select to authenticated
  using (private.has_permission(organization_id,'ward.read') or private.has_permission(organization_id,'encounter.read'));
create policy wards_insert on public.wards for insert to authenticated
  with check (private.has_permission(organization_id,'ward.manage'));
create policy wards_update on public.wards for update to authenticated
  using (private.has_permission(organization_id,'ward.manage')) with check (private.has_permission(organization_id,'ward.manage'));

create policy beds_read on public.beds for select to authenticated
  using (private.has_permission(organization_id,'ward.read') or private.has_permission(organization_id,'encounter.read'));
create policy beds_insert on public.beds for insert to authenticated
  with check (private.has_permission(organization_id,'ward.manage'));
create policy beds_update on public.beds for update to authenticated
  using (private.has_permission(organization_id,'ward.manage')) with check (private.has_permission(organization_id,'ward.manage'));

create policy admissions_read on public.admissions for select to authenticated
  using (private.has_permission(organization_id,'ward.read') or private.has_permission(organization_id,'patient.read'));
create policy admissions_insert on public.admissions for insert to authenticated
  with check (private.has_permission(organization_id,'admission.manage'));
create policy admissions_update on public.admissions for update to authenticated
  using (private.has_permission(organization_id,'admission.manage')) with check (private.has_permission(organization_id,'admission.manage'));

insert into public.role_permissions(role_id, permission_key)
select r.id, x.permission_key from public.roles r
join (values ('ward.read'),('ward.manage'),('admission.manage')) as x(permission_key) on true
where r.role_key = 'organization_admin' on conflict do nothing;

insert into public.role_permissions(role_id, permission_key)
select r.id, x.permission_key from public.roles r
join (values ('ward.read'),('admission.manage')) as x(permission_key) on true
where r.role_key in ('doctor','nurse','receptionist') on conflict do nothing;

insert into public.role_permissions(role_id, permission_key)
select r.id, 'ward.read' from public.roles r
where r.role_key in ('cashier','lab_technician','pharmacist','inventory_manager') on conflict do nothing;
