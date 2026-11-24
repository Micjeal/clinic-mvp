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
insert into public.permissions(key,domain,label,description) values
 ('bloodbank.read','clinical','View blood bank','View blood units and transfusion records'),
 ('bloodbank.manage','clinical','Manage blood bank','Register units, reserve, issue and record transfusions')
on conflict do nothing;
insert into public.role_permissions(role_id,permission_key)
select r.id,'bloodbank.read' from public.roles r where r.role_key in ('organization_admin','doctor','nurse','lab_technician') on conflict do nothing;
insert into public.role_permissions(role_id,permission_key)
select r.id,'bloodbank.manage' from public.roles r where r.role_key in ('organization_admin','lab_technician') on conflict do nothing;
