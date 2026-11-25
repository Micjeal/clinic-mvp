-- Standard charge catalog: stable billable items managed in Settings

create table public.standard_charges (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  category text not null default 'other'
    check (category in ('consultation','triage','procedure','bed_day','registration','other')),
  price numeric(14,2) not null default 0 check (price >= 0),
  currency_code text not null default 'UGX',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, category, name)
);

create index standard_charges_org_idx on public.standard_charges(organization_id, is_active);

alter table public.standard_charges enable row level security;

create policy standard_charges_read on public.standard_charges for select to authenticated
  using (private.has_permission(organization_id,'billing.read') or private.has_permission(organization_id,'settings.read'));

create policy standard_charges_insert on public.standard_charges for insert to authenticated
  with check (private.has_permission(organization_id,'settings.manage') or private.has_permission(organization_id,'billing.invoice.create'));

create policy standard_charges_update on public.standard_charges for update to authenticated
  using (private.has_permission(organization_id,'settings.manage') or private.has_permission(organization_id,'billing.invoice.create'))
  with check (private.has_permission(organization_id,'settings.manage') or private.has_permission(organization_id,'billing.invoice.create'));

create policy standard_charges_delete on public.standard_charges for delete to authenticated
  using (private.has_permission(organization_id,'settings.manage'));

create trigger standard_charges_set_updated_at before update on public.standard_charges
  for each row execute function public.set_updated_at();
