-- Insurance / medical schemes and claims

insert into public.permissions(permission_key, description) values
  ('insurance.read','View insurance schemes, policies and claims'),
  ('insurance.manage','Manage insurance schemes and patient policies'),
  ('insurance.claim.create','Create and submit insurance claims'),
  ('insurance.claim.process','Process claim approvals and payments')
on conflict (permission_key) do nothing;

create table public.insurance_schemes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  scheme_type text not null default 'private' check (scheme_type in ('nhif','private','employer','community','other')),
  contact_phone text,
  contact_email text,
  preauth_required boolean not null default false,
  coverage_percent numeric(5,2) not null default 100 check (coverage_percent >= 0 and coverage_percent <= 100),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table public.patient_insurance_policies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  insurance_scheme_id uuid not null references public.insurance_schemes(id) on delete cascade,
  policy_number text not null,
  member_number text,
  group_number text,
  coverage_percent numeric(5,2) check (coverage_percent is null or (coverage_percent >= 0 and coverage_percent <= 100)),
  valid_from date,
  valid_to date,
  status text not null default 'active' check (status in ('active','expired','suspended')),
  created_at timestamptz not null default now()
);

create table public.insurance_claims (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  facility_id uuid not null references public.facilities(id),
  patient_id uuid not null references public.patients(id),
  invoice_id uuid references public.invoices(id) on delete set null,
  insurance_scheme_id uuid not null references public.insurance_schemes(id),
  policy_id uuid references public.patient_insurance_policies(id) on delete set null,
  claim_number text not null,
  status text not null default 'draft' check (status in ('draft','submitted','under_review','approved','partially_paid','paid','denied','appealed')),
  claimed_amount numeric(14,2) not null check (claimed_amount > 0),
  approved_amount numeric(14,2),
  paid_amount numeric(14,2) not null default 0,
  currency_code text not null default 'UGX',
  diagnosis_summary text,
  notes text,
  submitted_at timestamptz,
  processed_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, claim_number)
);

create index insurance_claims_org_idx on public.insurance_claims(organization_id, status, created_at desc);
create index patient_insurance_policies_patient_idx on public.patient_insurance_policies(patient_id, status);

alter table public.insurance_schemes enable row level security;
alter table public.patient_insurance_policies enable row level security;
alter table public.insurance_claims enable row level security;

create policy insurance_schemes_read on public.insurance_schemes for select to authenticated
  using (private.has_permission(organization_id,'insurance.read') or private.has_permission(organization_id,'billing.read'));
create policy insurance_schemes_insert on public.insurance_schemes for insert to authenticated
  with check (private.has_permission(organization_id,'insurance.manage'));
create policy insurance_schemes_update on public.insurance_schemes for update to authenticated
  using (private.has_permission(organization_id,'insurance.manage'))
  with check (private.has_permission(organization_id,'insurance.manage'));

create policy patient_insurance_read on public.patient_insurance_policies for select to authenticated
  using (private.has_permission(organization_id,'insurance.read') or private.has_permission(organization_id,'patient.read'));
create policy patient_insurance_insert on public.patient_insurance_policies for insert to authenticated
  with check (private.has_permission(organization_id,'insurance.manage') or private.has_permission(organization_id,'patient.update'));
create policy patient_insurance_update on public.patient_insurance_policies for update to authenticated
  using (private.has_permission(organization_id,'insurance.manage') or private.has_permission(organization_id,'patient.update'))
  with check (private.has_permission(organization_id,'insurance.manage') or private.has_permission(organization_id,'patient.update'));

create policy insurance_claims_read on public.insurance_claims for select to authenticated
  using (private.has_permission(organization_id,'insurance.read') or private.has_permission(organization_id,'billing.read'));
create policy insurance_claims_insert on public.insurance_claims for insert to authenticated
  with check (private.has_permission(organization_id,'insurance.claim.create'));
create policy insurance_claims_update on public.insurance_claims for update to authenticated
  using (private.has_permission(organization_id,'insurance.claim.create') or private.has_permission(organization_id,'insurance.claim.process'))
  with check (private.has_permission(organization_id,'insurance.claim.create') or private.has_permission(organization_id,'insurance.claim.process'));

insert into public.role_permissions(role_id, permission_key)
select r.id, x.permission_key from public.roles r
join (values ('insurance.read'),('insurance.manage'),('insurance.claim.create'),('insurance.claim.process')) as x(permission_key) on true
where r.role_key = 'organization_admin' on conflict do nothing;

insert into public.role_permissions(role_id, permission_key)
select r.id, x.permission_key from public.roles r
join (values ('insurance.read'),('insurance.claim.create')) as x(permission_key) on true
where r.role_key = 'cashier' on conflict do nothing;

insert into public.role_permissions(role_id, permission_key)
select r.id, x.permission_key from public.roles r
join (values ('insurance.read'),('insurance.claim.process')) as x(permission_key) on true
where r.role_key in ('receptionist','lab_technician') on conflict do nothing;
