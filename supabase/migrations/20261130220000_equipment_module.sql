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
