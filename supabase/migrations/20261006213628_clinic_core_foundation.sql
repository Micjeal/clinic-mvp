
create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  legal_name text,
  email text,
  phone text,
  website text,
  timezone text not null default 'Africa/Kampala',
  currency_code text not null default 'UGX',
  status text not null default 'active' check (status in ('active','inactive','suspended')),
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.facilities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  code text not null,
  facility_type text not null default 'clinic'
    check (facility_type in ('clinic','hospital','medical_centre','laboratory','pharmacy','other')),
  email text,
  phone text,
  address_line text,
  city text,
  district text,
  country_code text not null default 'UG',
  timezone text not null default 'Africa/Kampala',
  is_active boolean not null default true,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  facility_id uuid not null references public.facilities(id) on delete cascade,
  name text not null,
  code text not null,
  description text,
  phone text,
  email text,
  opening_hours jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  is_public boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (facility_id, code)
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  avatar_path text,
  professional_title text,
  status text not null default 'active' check (status in ('active','inactive','suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.permissions (
  permission_key text primary key,
  description text not null,
  created_at timestamptz not null default now()
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  role_key text not null unique,
  name text not null,
  description text,
  is_system boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_key text not null references public.permissions(permission_key) on delete cascade,
  primary key (role_id, permission_key)
);

create table public.staff_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid not null references public.roles(id),
  primary_facility_id uuid references public.facilities(id),
  employee_number text,
  job_title text,
  registration_number text,
  is_active boolean not null default true,
  joined_at date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create unique index staff_memberships_org_employee_number_key
  on public.staff_memberships (organization_id, employee_number)
  where employee_number is not null;

create table public.staff_department_assignments (
  membership_id uuid not null references public.staff_memberships(id) on delete cascade,
  department_id uuid not null references public.departments(id) on delete cascade,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (membership_id, department_id)
);

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  primary_facility_id uuid references public.facilities(id),
  auth_user_id uuid references auth.users(id) on delete set null,
  patient_number text not null,
  first_name text not null,
  middle_name text,
  last_name text not null,
  date_of_birth date,
  sex text check (sex in ('female','male','intersex','unknown')),
  phone text,
  email text,
  national_id text,
  address_line text,
  city text,
  district text,
  country_code text not null default 'UG',
  emergency_contact_name text,
  emergency_contact_phone text,
  blood_group text check (blood_group in ('A+','A-','B+','B-','AB+','AB-','O+','O-') or blood_group is null),
  allergies_summary text,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, patient_number)
);

create unique index patients_org_auth_user_key
  on public.patients (organization_id, auth_user_id)
  where auth_user_id is not null;

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  facility_id uuid not null references public.facilities(id),
  department_id uuid not null references public.departments(id),
  patient_id uuid not null references public.patients(id),
  clinician_user_id uuid references public.profiles(id) on delete set null,
  appointment_type text not null default 'consultation',
  status text not null default 'scheduled'
    check (status in ('requested','scheduled','confirmed','checked_in','in_progress','completed','cancelled','no_show')),
  scheduled_start timestamptz not null,
  scheduled_end timestamptz,
  reason text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (scheduled_end is null or scheduled_end > scheduled_start)
);

create table public.encounters (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  facility_id uuid not null references public.facilities(id),
  department_id uuid not null references public.departments(id),
  patient_id uuid not null references public.patients(id),
  appointment_id uuid references public.appointments(id) on delete set null,
  clinician_user_id uuid references public.profiles(id) on delete set null,
  encounter_type text not null default 'outpatient',
  status text not null default 'open'
    check (status in ('planned','open','on_hold','completed','cancelled')),
  chief_complaint text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ended_at is null or ended_at >= started_at)
);

create table public.vitals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  encounter_id uuid not null references public.encounters(id) on delete cascade,
  patient_id uuid not null references public.patients(id),
  recorded_by uuid references public.profiles(id) on delete set null,
  temperature_c numeric(4,1),
  pulse_bpm integer,
  respiratory_rate integer,
  systolic_bp integer,
  diastolic_bp integer,
  oxygen_saturation numeric(5,2),
  weight_kg numeric(7,2),
  height_cm numeric(7,2),
  notes text,
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (oxygen_saturation is null or (oxygen_saturation >= 0 and oxygen_saturation <= 100))
);

create table public.clinical_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  encounter_id uuid not null references public.encounters(id) on delete cascade,
  patient_id uuid not null references public.patients(id),
  author_user_id uuid not null references public.profiles(id),
  note_type text not null default 'progress',
  content text not null,
  patient_visible boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.diagnoses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  encounter_id uuid not null references public.encounters(id) on delete cascade,
  patient_id uuid not null references public.patients(id),
  diagnosed_by uuid references public.profiles(id) on delete set null,
  code_system text,
  diagnosis_code text,
  diagnosis_name text not null,
  diagnosis_type text not null default 'working'
    check (diagnosis_type in ('working','confirmed','differential','historical')),
  notes text,
  patient_visible boolean not null default true,
  created_at timestamptz not null default now()
);

create index facilities_organization_idx on public.facilities(organization_id);
create index departments_org_facility_idx on public.departments(organization_id, facility_id);
create index staff_memberships_user_idx on public.staff_memberships(user_id, organization_id) where is_active;
create index staff_department_assignments_department_idx on public.staff_department_assignments(department_id);
create index patients_org_name_idx on public.patients(organization_id, last_name, first_name);
create index patients_org_phone_idx on public.patients(organization_id, phone) where phone is not null;
create index appointments_org_schedule_idx on public.appointments(organization_id, scheduled_start);
create index appointments_department_schedule_idx on public.appointments(department_id, scheduled_start);
create index appointments_patient_idx on public.appointments(patient_id, scheduled_start desc);
create index encounters_patient_idx on public.encounters(patient_id, started_at desc);
create index encounters_department_status_idx on public.encounters(department_id, status, started_at desc);
create index vitals_encounter_idx on public.vitals(encounter_id, recorded_at desc);
create index clinical_notes_encounter_idx on public.clinical_notes(encounter_id, created_at desc);
create index diagnoses_encounter_idx on public.diagnoses(encounter_id, created_at desc);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.set_updated_at() from public, anon, authenticated;

create trigger organizations_set_updated_at before update on public.organizations
for each row execute function private.set_updated_at();
create trigger facilities_set_updated_at before update on public.facilities
for each row execute function private.set_updated_at();
create trigger departments_set_updated_at before update on public.departments
for each row execute function private.set_updated_at();
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function private.set_updated_at();
create trigger staff_memberships_set_updated_at before update on public.staff_memberships
for each row execute function private.set_updated_at();
create trigger patients_set_updated_at before update on public.patients
for each row execute function private.set_updated_at();
create trigger appointments_set_updated_at before update on public.appointments
for each row execute function private.set_updated_at();
create trigger encounters_set_updated_at before update on public.encounters
for each row execute function private.set_updated_at();
create trigger clinical_notes_set_updated_at before update on public.clinical_notes
for each row execute function private.set_updated_at();

create or replace function private.is_org_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.staff_memberships sm
      where sm.organization_id = target_organization_id
        and sm.user_id = (select auth.uid())
        and sm.is_active
    );
$$;

create or replace function private.has_permission(target_organization_id uuid, target_permission_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.staff_memberships sm
      join public.role_permissions rp on rp.role_id = sm.role_id
      where sm.organization_id = target_organization_id
        and sm.user_id = (select auth.uid())
        and sm.is_active
        and rp.permission_key = target_permission_key
    );
$$;

create or replace function private.shares_org(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.staff_memberships mine
      join public.staff_memberships theirs
        on theirs.organization_id = mine.organization_id
       and theirs.is_active
      where mine.user_id = (select auth.uid())
        and mine.is_active
        and theirs.user_id = target_user_id
    );
$$;

revoke all on function private.is_org_member(uuid) from public, anon;
revoke all on function private.has_permission(uuid, text) from public, anon;
revoke all on function private.shares_org(uuid) from public, anon;
grant execute on function private.is_org_member(uuid) to authenticated, service_role;
grant execute on function private.has_permission(uuid, text) to authenticated, service_role;
grant execute on function private.shares_org(uuid) to authenticated, service_role;

insert into public.permissions(permission_key, description) values
('organization.manage','Manage organization settings'),
('facility.manage','Manage facilities'),
('department.manage','Manage departments'),
('staff.manage','Manage staff, roles and assignments'),
('patient.read','Read patient records'),
('patient.create','Register patients'),
('patient.update','Update patient demographics'),
('appointment.read','Read appointments'),
('appointment.create','Create appointments'),
('appointment.update','Update appointment workflow'),
('encounter.read','Read clinical encounters'),
('encounter.create','Start clinical encounters'),
('encounter.update','Update clinical encounters'),
('triage.write','Record and update triage/vitals'),
('clinical_note.write','Create and update clinical notes'),
('diagnosis.write','Create and update diagnoses'),
('lab.read','Read laboratory workflow'),
('lab.order','Create laboratory orders'),
('lab.result.write','Enter laboratory results'),
('lab.result.approve','Approve laboratory results'),
('pharmacy.read','Read pharmacy workflow'),
('pharmacy.dispense','Dispense medication'),
('inventory.read','Read inventory'),
('inventory.adjust','Create stock adjustments'),
('billing.read','Read billing data'),
('billing.invoice.create','Create invoices'),
('billing.payment.create','Record payments'),
('billing.refund','Process refunds'),
('reports.read','Read operational reports'),
('audit.read','Read audit logs'),
('settings.manage','Manage system settings')
on conflict do nothing;

insert into public.roles(role_key, name, description, is_system) values
('organization_admin','Organization Administrator','Full operational administration within an organization',true),
('receptionist','Receptionist','Patient registration, appointment and front-desk workflows',true),
('doctor','Doctor','Clinical consultation, diagnosis and ordering workflows',true),
('nurse','Nurse','Triage, nursing and encounter support workflows',true),
('lab_technician','Laboratory Technician','Laboratory order and result workflows',true),
('pharmacist','Pharmacist','Pharmacy dispensing and stock workflows',true),
('cashier','Cashier','Billing and payment workflows',true),
('inventory_manager','Inventory Manager','Inventory and stock control workflows',true)
on conflict (role_key) do nothing;

insert into public.role_permissions(role_id, permission_key)
select r.id, p.permission_key
from public.roles r
cross join public.permissions p
where r.role_key = 'organization_admin'
on conflict do nothing;

insert into public.role_permissions(role_id, permission_key)
select r.id, x.permission_key
from public.roles r
join (values
 ('patient.read'),('patient.create'),('patient.update'),
 ('appointment.read'),('appointment.create'),('appointment.update'),
 ('encounter.read')
) as x(permission_key) on true
where r.role_key = 'receptionist'
on conflict do nothing;

insert into public.role_permissions(role_id, permission_key)
select r.id, x.permission_key
from public.roles r
join (values
 ('patient.read'),('appointment.read'),
 ('encounter.read'),('encounter.create'),('encounter.update'),
 ('clinical_note.write'),('diagnosis.write'),
 ('lab.read'),('lab.order'),('pharmacy.read')
) as x(permission_key) on true
where r.role_key = 'doctor'
on conflict do nothing;

insert into public.role_permissions(role_id, permission_key)
select r.id, x.permission_key
from public.roles r
join (values
 ('patient.read'),('appointment.read'),
 ('encounter.read'),('encounter.update'),('triage.write'),
 ('clinical_note.write'),('lab.read')
) as x(permission_key) on true
where r.role_key = 'nurse'
on conflict do nothing;

insert into public.role_permissions(role_id, permission_key)
select r.id, x.permission_key
from public.roles r
join (values
 ('patient.read'),('encounter.read'),('lab.read'),
 ('lab.result.write'),('lab.result.approve')
) as x(permission_key) on true
where r.role_key = 'lab_technician'
on conflict do nothing;

insert into public.role_permissions(role_id, permission_key)
select r.id, x.permission_key
from public.roles r
join (values
 ('patient.read'),('pharmacy.read'),('pharmacy.dispense'),
 ('inventory.read')
) as x(permission_key) on true
where r.role_key = 'pharmacist'
on conflict do nothing;

insert into public.role_permissions(role_id, permission_key)
select r.id, x.permission_key
from public.roles r
join (values
 ('patient.read'),('billing.read'),
 ('billing.invoice.create'),('billing.payment.create')
) as x(permission_key) on true
where r.role_key = 'cashier'
on conflict do nothing;

insert into public.role_permissions(role_id, permission_key)
select r.id, x.permission_key
from public.roles r
join (values
 ('inventory.read'),('inventory.adjust')
) as x(permission_key) on true
where r.role_key = 'inventory_manager'
on conflict do nothing;

alter table public.organizations enable row level security;
alter table public.facilities enable row level security;
alter table public.departments enable row level security;
alter table public.profiles enable row level security;
alter table public.permissions enable row level security;
alter table public.roles enable row level security;
alter table public.role_permissions enable row level security;
alter table public.staff_memberships enable row level security;
alter table public.staff_department_assignments enable row level security;
alter table public.patients enable row level security;
alter table public.appointments enable row level security;
alter table public.encounters enable row level security;
alter table public.vitals enable row level security;
alter table public.clinical_notes enable row level security;
alter table public.diagnoses enable row level security;

revoke all on all tables in schema public from anon, authenticated;

grant select on public.organizations, public.facilities, public.departments to anon;

grant select, update on public.profiles to authenticated;
grant select, update on public.organizations to authenticated;
grant select, insert, update on public.facilities, public.departments to authenticated;
grant select on public.permissions, public.roles, public.role_permissions to authenticated;
grant select on public.staff_memberships, public.staff_department_assignments to authenticated;
grant select, insert, update on public.patients, public.appointments, public.encounters,
  public.vitals, public.clinical_notes, public.diagnoses to authenticated;

grant all privileges on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

create policy organizations_public_read
on public.organizations for select to anon
using (is_public and status = 'active');

create policy organizations_member_read
on public.organizations for select to authenticated
using (private.is_org_member(id));

create policy organizations_admin_update
on public.organizations for update to authenticated
using (private.has_permission(id, 'organization.manage'))
with check (private.has_permission(id, 'organization.manage'));

create policy facilities_public_read
on public.facilities for select to anon
using (is_public and is_active);

create policy facilities_member_read
on public.facilities for select to authenticated
using (private.is_org_member(organization_id));

create policy facilities_admin_insert
on public.facilities for insert to authenticated
with check (private.has_permission(organization_id, 'facility.manage'));

create policy facilities_admin_update
on public.facilities for update to authenticated
using (private.has_permission(organization_id, 'facility.manage'))
with check (private.has_permission(organization_id, 'facility.manage'));

create policy departments_public_read
on public.departments for select to anon
using (is_public and is_active);

create policy departments_member_read
on public.departments for select to authenticated
using (private.is_org_member(organization_id));

create policy departments_admin_insert
on public.departments for insert to authenticated
with check (
  private.has_permission(organization_id, 'department.manage')
  and exists (
    select 1 from public.facilities f
    where f.id = facility_id and f.organization_id = organization_id
  )
);

create policy departments_admin_update
on public.departments for update to authenticated
using (private.has_permission(organization_id, 'department.manage'))
with check (
  private.has_permission(organization_id, 'department.manage')
  and exists (
    select 1 from public.facilities f
    where f.id = facility_id and f.organization_id = organization_id
  )
);

create policy profiles_self_or_colleague_read
on public.profiles for select to authenticated
using (id = (select auth.uid()) or private.shares_org(id));

create policy profiles_self_update
on public.profiles for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy permissions_authenticated_read
on public.permissions for select to authenticated
using (true);

create policy roles_authenticated_read
on public.roles for select to authenticated
using (is_system or organization_id is null or private.is_org_member(organization_id));

create policy role_permissions_authenticated_read
on public.role_permissions for select to authenticated
using (true);

create policy staff_memberships_self_read
on public.staff_memberships for select to authenticated
using (user_id = (select auth.uid()));

create policy staff_department_assignments_self_read
on public.staff_department_assignments for select to authenticated
using (
  exists (
    select 1
    from public.staff_memberships sm
    where sm.id = membership_id
      and sm.user_id = (select auth.uid())
  )
);

create policy patients_staff_or_self_read
on public.patients for select to authenticated
using (
  auth_user_id = (select auth.uid())
  or private.has_permission(organization_id, 'patient.read')
);

create policy patients_staff_insert
on public.patients for insert to authenticated
with check (private.has_permission(organization_id, 'patient.create'));

create policy patients_staff_update
on public.patients for update to authenticated
using (private.has_permission(organization_id, 'patient.update'))
with check (private.has_permission(organization_id, 'patient.update'));

create policy appointments_staff_or_self_read
on public.appointments for select to authenticated
using (
  private.has_permission(organization_id, 'appointment.read')
  or exists (
    select 1 from public.patients p
    where p.id = patient_id
      and p.auth_user_id = (select auth.uid())
  )
);

create policy appointments_staff_insert
on public.appointments for insert to authenticated
with check (private.has_permission(organization_id, 'appointment.create'));

create policy appointments_patient_insert
on public.appointments for insert to authenticated
with check (
  status = 'requested'
  and exists (
    select 1 from public.patients p
    where p.id = patient_id
      and p.organization_id = organization_id
      and p.auth_user_id = (select auth.uid())
  )
);

create policy appointments_staff_update
on public.appointments for update to authenticated
using (private.has_permission(organization_id, 'appointment.update'))
with check (private.has_permission(organization_id, 'appointment.update'));

create policy encounters_staff_or_self_read
on public.encounters for select to authenticated
using (
  private.has_permission(organization_id, 'encounter.read')
  or exists (
    select 1 from public.patients p
    where p.id = patient_id
      and p.auth_user_id = (select auth.uid())
  )
);

create policy encounters_staff_insert
on public.encounters for insert to authenticated
with check (private.has_permission(organization_id, 'encounter.create'));

create policy encounters_staff_update
on public.encounters for update to authenticated
using (private.has_permission(organization_id, 'encounter.update'))
with check (private.has_permission(organization_id, 'encounter.update'));

create policy vitals_staff_or_self_read
on public.vitals for select to authenticated
using (
  private.has_permission(organization_id, 'encounter.read')
  or exists (
    select 1 from public.patients p
    where p.id = patient_id
      and p.auth_user_id = (select auth.uid())
  )
);

create policy vitals_staff_insert
on public.vitals for insert to authenticated
with check (private.has_permission(organization_id, 'triage.write'));

create policy vitals_staff_update
on public.vitals for update to authenticated
using (private.has_permission(organization_id, 'triage.write'))
with check (private.has_permission(organization_id, 'triage.write'));

create policy clinical_notes_staff_or_visible_to_patient
on public.clinical_notes for select to authenticated
using (
  private.has_permission(organization_id, 'encounter.read')
  or (
    patient_visible
    and exists (
      select 1 from public.patients p
      where p.id = patient_id
        and p.auth_user_id = (select auth.uid())
    )
  )
);

create policy clinical_notes_staff_insert
on public.clinical_notes for insert to authenticated
with check (
  private.has_permission(organization_id, 'clinical_note.write')
  and author_user_id = (select auth.uid())
);

create policy clinical_notes_author_update
on public.clinical_notes for update to authenticated
using (
  author_user_id = (select auth.uid())
  and private.has_permission(organization_id, 'clinical_note.write')
)
with check (
  author_user_id = (select auth.uid())
  and private.has_permission(organization_id, 'clinical_note.write')
);

create policy diagnoses_staff_or_visible_to_patient
on public.diagnoses for select to authenticated
using (
  private.has_permission(organization_id, 'encounter.read')
  or (
    patient_visible
    and exists (
      select 1 from public.patients p
      where p.id = patient_id
        and p.auth_user_id = (select auth.uid())
    )
  )
);

create policy diagnoses_staff_insert
on public.diagnoses for insert to authenticated
with check (private.has_permission(organization_id, 'diagnosis.write'));

create policy diagnoses_staff_update
on public.diagnoses for update to authenticated
using (private.has_permission(organization_id, 'diagnosis.write'))
with check (private.has_permission(organization_id, 'diagnosis.write'));
;
