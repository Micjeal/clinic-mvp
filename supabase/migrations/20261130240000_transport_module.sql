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
insert into public.permissions(key,domain,label,description) values
 ('transport.read','operations','View transport requests','View ambulance/transport dispatch'),
 ('transport.manage','operations','Manage transport','Create and dispatch transport requests')
on conflict do nothing;
insert into public.role_permissions(role_id,permission_key)
select r.id,'transport.read' from public.roles r where r.role_key in ('organization_admin','receptionist','nurse') on conflict do nothing;
insert into public.role_permissions(role_id,permission_key)
select r.id,'transport.manage' from public.roles r where r.role_key in ('organization_admin','receptionist') on conflict do nothing;
