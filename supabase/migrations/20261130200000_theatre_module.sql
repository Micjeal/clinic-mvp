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
insert into public.permissions(key,domain,label,description) values
 ('theatre.read','clinical','View theatre schedule','View theatre sessions and surgeries'),
 ('theatre.manage','clinical','Manage theatre','Schedule sessions and surgeries, record operative notes')
on conflict do nothing;
insert into public.role_permissions(role_id,permission_key)
select r.id,'theatre.read' from public.roles r where r.role_key in ('organization_admin','doctor','nurse') on conflict do nothing;
insert into public.role_permissions(role_id,permission_key)
select r.id,'theatre.manage' from public.roles r where r.role_key in ('organization_admin') on conflict do nothing;
