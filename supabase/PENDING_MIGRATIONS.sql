-- ============================================================
-- HOSPICA — PENDING MIGRATIONS (run all in Supabase SQL editor)
-- ============================================================


-- ===== 20261130190000_patient_allergies.sql =====

create table public.patient_allergies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  allergen text not null,
  reaction text,
  severity text not null default 'moderate' check (severity in ('mild','moderate','severe')),
  notes text,
  recorded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (patient_id, allergen)
);
alter table public.patient_allergies enable row level security;
create policy patient_allergies_read on public.patient_allergies for select to authenticated
  using (private.has_permission(organization_id,'patient.read'));
create policy patient_allergies_write on public.patient_allergies for all to authenticated
  using (private.has_permission(organization_id,'patient.update') or private.has_permission(organization_id,'clinical_note.write'))
  with check (private.has_permission(organization_id,'patient.update') or private.has_permission(organization_id,'clinical_note.write'));


-- ===== 20261130200000_theatre_module.sql =====

create table public.theatre_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  facility_id uuid not null references public.facilities(id),
  theatre_name text not null,
  session_date date not null,
  start_time time,
  end_time time,
  status text not null default 'scheduled' check (status in ('scheduled','in_progress','completed','cancelled')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create table public.surgeries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  theatre_session_id uuid references public.theatre_sessions(id) on delete set null,
  facility_id uuid not null references public.facilities(id),
  patient_id uuid not null references public.patients(id),
  encounter_id uuid references public.encounters(id) on delete set null,
  procedure_name text not null,
  procedure_code text,
  surgeon_user_id uuid references public.profiles(id) on delete set null,
  anaesthetist_user_id uuid references public.profiles(id) on delete set null,
  scheduled_at timestamptz,
  status text not null default 'scheduled' check (status in ('scheduled','in_progress','completed','cancelled','postponed')),
  operative_note text,
  findings text,
  procedure_performed text,
  blood_loss_ml numeric,
  complications text,
  outcome text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.theatre_sessions enable row level security;
alter table public.surgeries enable row level security;
create policy theatre_sessions_read on public.theatre_sessions for select to authenticated using (private.has_permission(organization_id,'theatre.read'));
create policy theatre_sessions_write on public.theatre_sessions for all to authenticated using (private.has_permission(organization_id,'theatre.manage')) with check (private.has_permission(organization_id,'theatre.manage'));
create policy surgeries_read on public.surgeries for select to authenticated using (private.has_permission(organization_id,'theatre.read'));
create policy surgeries_write on public.surgeries for all to authenticated using (private.has_permission(organization_id,'theatre.manage')) with check (private.has_permission(organization_id,'theatre.manage'));
insert into public.permissions(permission_key,description) values ('theatre.read','View theatre sessions and surgeries') on conflict do nothing;
insert into public.permissions(permission_key,description) values ('theatre.manage','Schedule sessions and surgeries, record operative notes') on conflict do nothing;
insert into public.role_permissions(role_id,permission_key)
select r.id,'theatre.read' from public.roles r where r.role_key in ('organization_admin','doctor','nurse') on conflict do nothing;
insert into public.role_permissions(role_id,permission_key)
select r.id,'theatre.manage' from public.roles r where r.role_key in ('organization_admin') on conflict do nothing;


-- ===== 20261130210000_mortuary_module.sql =====

create table public.mortuary_register (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  facility_id uuid not null references public.facilities(id),
  patient_id uuid references public.patients(id) on delete set null,
  admission_id uuid references public.admissions(id) on delete set null,
  deceased_name text not null,
  age text,
  sex text,
  date_of_death timestamptz not null,
  time_of_death time,
  cause_of_death text,
  received_by uuid references public.profiles(id) on delete set null,
  released_to text,
  released_at timestamptz,
  status text not null default 'in_mortuary' check (status in ('in_mortuary','released','transferred')),
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.mortuary_register enable row level security;
create policy mortuary_read on public.mortuary_register for select to authenticated using (private.has_permission(organization_id,'mortuary.read'));
create policy mortuary_write on public.mortuary_register for all to authenticated using (private.has_permission(organization_id,'mortuary.manage')) with check (private.has_permission(organization_id,'mortuary.manage'));
insert into public.permissions(permission_key,description) values ('mortuary.read','View deceased register') on conflict do nothing;
insert into public.permissions(permission_key,description) values ('mortuary.manage','Register deceased and release remains') on conflict do nothing;
insert into public.role_permissions(role_id,permission_key)
select r.id,'mortuary.read' from public.roles r where r.role_key in ('organization_admin','doctor','nurse','receptionist') on conflict do nothing;
insert into public.role_permissions(role_id,permission_key)
select r.id,'mortuary.manage' from public.roles r where r.role_key in ('organization_admin') on conflict do nothing;


-- ===== 20261130220000_equipment_module.sql =====

create table public.equipment (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  facility_id uuid references public.facilities(id) on delete set null,
  department_id uuid references public.departments(id) on delete set null,
  name text not null,
  category text,
  asset_tag text,
  serial_number text,
  purchase_date date,
  warranty_expiry date,
  status text not null default 'in_service' check (status in ('in_service','under_maintenance','out_of_service','retired')),
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create table public.equipment_maintenance (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  equipment_id uuid not null references public.equipment(id) on delete cascade,
  maintenance_type text not null check (maintenance_type in ('scheduled','repair','calibration','inspection')),
  performed_at timestamptz not null default now(),
  performed_by text,
  description text not null,
  cost numeric(14,2),
  next_due_date date,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.equipment enable row level security;
alter table public.equipment_maintenance enable row level security;
create policy equipment_read on public.equipment for select to authenticated using (private.has_permission(organization_id,'equipment.read'));
create policy equipment_write on public.equipment for all to authenticated using (private.has_permission(organization_id,'equipment.manage')) with check (private.has_permission(organization_id,'equipment.manage'));
create policy equipment_maintenance_read on public.equipment_maintenance for select to authenticated using (private.has_permission(organization_id,'equipment.read'));
create policy equipment_maintenance_write on public.equipment_maintenance for all to authenticated using (private.has_permission(organization_id,'equipment.manage')) with check (private.has_permission(organization_id,'equipment.manage'));
insert into public.permissions(permission_key,description) values ('equipment.read','View equipment register and maintenance') on conflict do nothing;
insert into public.permissions(permission_key,description) values ('equipment.manage','Register equipment and log maintenance') on conflict do nothing;
insert into public.role_permissions(role_id,permission_key)
select r.id,'equipment.read' from public.roles r where r.role_key in ('organization_admin','inventory_manager','receptionist') on conflict do nothing;
insert into public.role_permissions(role_id,permission_key)
select r.id,'equipment.manage' from public.roles r where r.role_key in ('organization_admin','inventory_manager') on conflict do nothing;


-- ===== 20261130230000_expenses_module.sql =====

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  facility_id uuid references public.facilities(id) on delete set null,
  category text not null,
  description text not null,
  amount numeric(14,2) not null check (amount >= 0),
  currency_code text not null default 'UGX',
  expense_date date not null default current_date,
  payment_method text,
  reference text,
  status text not null default 'recorded' check (status in ('recorded','approved','paid','void')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.expenses enable row level security;
create policy expenses_read on public.expenses for select to authenticated using (private.has_permission(organization_id,'expenses.read'));
create policy expenses_write on public.expenses for all to authenticated using (private.has_permission(organization_id,'expenses.manage')) with check (private.has_permission(organization_id,'expenses.manage'));
insert into public.permissions(permission_key,description) values ('expenses.read','View facility expenses') on conflict do nothing;
insert into public.permissions(permission_key,description) values ('expenses.manage','Record and approve expenses') on conflict do nothing;
insert into public.role_permissions(role_id,permission_key)
select r.id,'expenses.read' from public.roles r where r.role_key in ('organization_admin','cashier','inventory_manager') on conflict do nothing;
insert into public.role_permissions(role_id,permission_key)
select r.id,'expenses.manage' from public.roles r where r.role_key in ('organization_admin') on conflict do nothing;


-- ===== 20261130240000_transport_module.sql =====

create table public.transport_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  facility_id uuid references public.facilities(id) on delete set null,
  patient_id uuid references public.patients(id) on delete set null,
  request_type text not null check (request_type in ('pickup','dropoff','transfer','emergency')),
  pickup_location text not null,
  destination text,
  scheduled_at timestamptz,
  priority text not null default 'routine' check (priority in ('routine','urgent','emergency')),
  vehicle text,
  driver_name text,
  status text not null default 'requested' check (status in ('requested','assigned','en_route','completed','cancelled')),
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.transport_requests enable row level security;
create policy transport_read on public.transport_requests for select to authenticated using (private.has_permission(organization_id,'transport.read'));
create policy transport_write on public.transport_requests for all to authenticated using (private.has_permission(organization_id,'transport.manage')) with check (private.has_permission(organization_id,'transport.manage'));
insert into public.permissions(permission_key,description) values ('transport.read','View ambulance/transport dispatch') on conflict do nothing;
insert into public.permissions(permission_key,description) values ('transport.manage','Create and dispatch transport requests') on conflict do nothing;
insert into public.role_permissions(role_id,permission_key)
select r.id,'transport.read' from public.roles r where r.role_key in ('organization_admin','receptionist','nurse') on conflict do nothing;
insert into public.role_permissions(role_id,permission_key)
select r.id,'transport.manage' from public.roles r where r.role_key in ('organization_admin','receptionist') on conflict do nothing;


-- ===== 20261130250000_bloodbank_module.sql =====

create table public.blood_units (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  facility_id uuid references public.facilities(id) on delete set null,
  unit_number text not null,
  blood_group text not null check (blood_group in ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  component text not null default 'whole_blood' check (component in ('whole_blood','red_cells','platelets','plasma','cryoprecipitate')),
  volume_ml numeric(8,1),
  donor_name text,
  collection_date date,
  expiry_date date,
  status text not null default 'available' check (status in ('available','reserved','issued','discarded','expired')),
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (organization_id, unit_number)
);
create table public.blood_transfusions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  blood_unit_id uuid not null references public.blood_units(id),
  patient_id uuid not null references public.patients(id),
  encounter_id uuid references public.encounters(id) on delete set null,
  transfused_at timestamptz not null default now(),
  transfused_by uuid references public.profiles(id) on delete set null,
  vital_before jsonb,
  vital_after jsonb,
  reaction_notes text,
  created_at timestamptz not null default now()
);
alter table public.blood_units enable row level security;
alter table public.blood_transfusions enable row level security;
create policy blood_units_read on public.blood_units for select to authenticated using (private.has_permission(organization_id,'bloodbank.read'));
create policy blood_units_write on public.blood_units for all to authenticated using (private.has_permission(organization_id,'bloodbank.manage')) with check (private.has_permission(organization_id,'bloodbank.manage'));
create policy transfusions_read on public.blood_transfusions for select to authenticated using (private.has_permission(organization_id,'bloodbank.read'));
create policy transfusions_write on public.blood_transfusions for all to authenticated using (private.has_permission(organization_id,'bloodbank.manage')) with check (private.has_permission(organization_id,'bloodbank.manage'));
insert into public.permissions(permission_key,description) values ('bloodbank.read','View blood units and transfusion records') on conflict do nothing;
insert into public.permissions(permission_key,description) values ('bloodbank.manage','Register units, reserve, issue and record transfusions') on conflict do nothing;
insert into public.role_permissions(role_id,permission_key)
select r.id,'bloodbank.read' from public.roles r where r.role_key in ('organization_admin','doctor','nurse','lab_technician') on conflict do nothing;
insert into public.role_permissions(role_id,permission_key)
select r.id,'bloodbank.manage' from public.roles r where r.role_key in ('organization_admin','lab_technician') on conflict do nothing;
