
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

create index if not exists appointments_clinician_user_idx on public.appointments(clinician_user_id);
create index if not exists appointments_created_by_idx on public.appointments(created_by);
create index if not exists appointments_facility_idx on public.appointments(facility_id);

create index if not exists clinical_notes_author_idx on public.clinical_notes(author_user_id);
create index if not exists clinical_notes_organization_idx on public.clinical_notes(organization_id);
create index if not exists clinical_notes_patient_idx on public.clinical_notes(patient_id);

create index if not exists diagnoses_diagnosed_by_idx on public.diagnoses(diagnosed_by);
create index if not exists diagnoses_organization_idx on public.diagnoses(organization_id);
create index if not exists diagnoses_patient_idx on public.diagnoses(patient_id);

create index if not exists encounters_appointment_idx on public.encounters(appointment_id);
create index if not exists encounters_clinician_user_idx on public.encounters(clinician_user_id);
create index if not exists encounters_created_by_idx on public.encounters(created_by);
create index if not exists encounters_facility_idx on public.encounters(facility_id);
create index if not exists encounters_organization_idx on public.encounters(organization_id);

create index if not exists patients_auth_user_idx on public.patients(auth_user_id);
create index if not exists patients_created_by_idx on public.patients(created_by);
create index if not exists patients_primary_facility_idx on public.patients(primary_facility_id);

create index if not exists role_permissions_permission_idx on public.role_permissions(permission_key);
create index if not exists roles_organization_idx on public.roles(organization_id);

create index if not exists staff_memberships_primary_facility_idx on public.staff_memberships(primary_facility_id);
create index if not exists staff_memberships_role_idx on public.staff_memberships(role_id);

create index if not exists vitals_organization_idx on public.vitals(organization_id);
create index if not exists vitals_patient_idx on public.vitals(patient_id);
create index if not exists vitals_recorded_by_idx on public.vitals(recorded_by);

drop policy if exists appointments_staff_insert on public.appointments;
drop policy if exists appointments_patient_insert on public.appointments;

create policy appointments_authorized_insert
on public.appointments for insert to authenticated
with check (
  private.has_permission(organization_id, 'appointment.create')
  or (
    status = 'requested'
    and exists (
      select 1
      from public.patients p
      where p.id = patient_id
        and p.organization_id = organization_id
        and p.auth_user_id = (select auth.uid())
    )
  )
);
;
