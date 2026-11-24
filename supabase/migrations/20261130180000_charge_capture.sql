-- Charge capture: track billable items consumed during care

create table public.encounter_charges (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  encounter_id uuid not null references public.encounters(id) on delete cascade,
  patient_id uuid not null references public.patients(id),
  facility_id uuid references public.facilities(id) on delete set null,
  charge_type text not null check (charge_type in ('consultation','laboratory','imaging','medication','procedure','supply','other')),
  description text not null,
  quantity numeric(14,3) not null default 1 check (quantity > 0),
  unit_price numeric(14,2) not null default 0 check (unit_price >= 0),
  total numeric(14,2) not null default 0 check (total >= 0),
  currency_code text not null default 'UGX',
  source_type text not null,
  source_id uuid,
  status text not null default 'pending' check (status in ('pending','invoiced','void')),
  invoice_item_id uuid references public.invoice_items(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (organization_id, source_type, source_id)
);

create index encounter_charges_patient_idx on public.encounter_charges(patient_id, status);
create index encounter_charges_encounter_idx on public.encounter_charges(encounter_id);

alter table public.encounter_charges enable row level security;

create policy encounter_charges_read on public.encounter_charges for select to authenticated
  using (private.has_permission(organization_id,'billing.read') or private.has_permission(organization_id,'encounter.read'));

create policy encounter_charges_insert on public.encounter_charges for insert to authenticated
  with check (
    private.has_permission(organization_id,'lab.result.write')
    or private.has_permission(organization_id,'radiology.report.approve')
    or private.has_permission(organization_id,'pharmacy.dispense')
    or private.has_permission(organization_id,'billing.invoice.create')
    or private.has_permission(organization_id,'encounter.update')
  );

create policy encounter_charges_update on public.encounter_charges for update to authenticated
  using (private.has_permission(organization_id,'billing.invoice.create') or private.has_permission(organization_id,'billing.read'))
  with check (private.has_permission(organization_id,'billing.invoice.create') or private.has_permission(organization_id,'billing.read'));
