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
insert into public.permissions(key,domain,label,description) values
 ('mortuary.read','operations','View mortuary register','View deceased register'),
 ('mortuary.manage','operations','Manage mortuary','Register deceased and release remains')
on conflict do nothing;
insert into public.role_permissions(role_id,permission_key)
select r.id,'mortuary.read' from public.roles r where r.role_key in ('organization_admin','doctor','nurse','receptionist') on conflict do nothing;
insert into public.role_permissions(role_id,permission_key)
select r.id,'mortuary.manage' from public.roles r where r.role_key in ('organization_admin') on conflict do nothing;
