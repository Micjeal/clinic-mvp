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
